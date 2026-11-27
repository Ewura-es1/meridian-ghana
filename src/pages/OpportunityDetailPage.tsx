import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  ExternalLink,
  FileText,
  Flag,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { VerificationInlineStatus } from '../components/OpportunityCard';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Opportunity, VerificationLog } from '../types';

export function OpportunityDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [history, setHistory] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Deadline passed or closed');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiFetch<{ opportunity: Opportunity; verificationHistory: VerificationLog[] }>(
      `/api/opportunities/${id}`
    )
      .then((data) => {
        if (!active) return;
        setOpportunity(data.opportunity);
        setHistory(data.verificationHistory);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Unable to load opportunity details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  const handleToggleSave = async () => {
    if (!opportunity) return;
    if (!user) {
      navigate('/login');
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/api/opportunities/${opportunity.id}/save`, {
        method: opportunity.isSaved ? 'DELETE' : 'POST',
      });
      setOpportunity((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : prev));
    } finally {
      setSaving(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opportunity) return;
    await apiFetch(`/api/opportunities/${opportunity.id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason: reportReason, details: reportDetails }),
    });
    setReportSent(true);
    setReportDetails('');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">
        <div className="h-10 w-2/3 bg-slate-100 rounded animate-pulse" />
        <div className="h-64 bg-slate-50 border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0f294a]">Opportunity Unavailable</h1>
        <p className="text-sm text-slate-600">{error || 'This listing could not be found.'}</p>
        <Link to="/internships" className="inline-block px-4 py-2 text-sm font-medium text-white bg-[#0f294a] rounded-lg">
          Back to Find Internships
        </Link>
      </div>
    );
  }

  const isExpiredOrClosed =
    opportunity.verification_status === 'Expired' || opportunity.verification_status === 'Closed';
  let applyHost = '';
  try {
    applyHost = opportunity.official_apply_url ? new URL(opportunity.official_apply_url).hostname : '';
  } catch {
    applyHost = '';
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <Link
          to="/internships"
          className="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-medium text-slate-600 hover:text-[#0f294a]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
          Back to Ghana Internships
        </Link>
      </div>

      {isExpiredOrClosed && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm min-w-0">
            <p className="font-semibold">
              This listing is {opportunity.verification_status} and has left the active discovery view.
            </p>
            <p className="text-red-800 mt-0.5">
              Its application deadline (<span className="font-mono tabular-nums">{opportunity.deadline}</span>) has passed or been closed by an administrator.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Specification Column */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-[#0d9488]">{opportunity.category_name}</span>
                <span aria-hidden="true">·</span>
                <span>{opportunity.region_name}</span>
                <span aria-hidden="true">·</span>
                <span>{opportunity.work_arrangement}</span>
                {opportunity.is_demo === 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-[#0f294a]">DEMO LISTING</span>
                  </>
                )}
              </div>
              <VerificationInlineStatus status={opportunity.verification_status} />
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a] text-balance break-words">
              {opportunity.title}
            </h1>
            <p className="text-base font-medium text-slate-800">{opportunity.organization_name}</p>

            <div className="p-4 rounded-lg bg-[#f0fdfa] border border-teal-200 text-sm text-slate-800 space-y-1">
              <div className="font-semibold text-[#0f766e] inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                Confirmed Ghana Eligibility
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {opportunity.ghana_eligibility_evidence}
              </p>
            </div>
          </div>

          {/* Mobile Key Facts & Official Apply CTA (visible < lg so mobile users don't scroll past full description) */}
          <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Application Deadline</p>
                <p className="font-mono tabular-nums text-base font-bold text-[#0f294a]">
                  {opportunity.deadline}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Location</p>
                <p className="text-sm font-medium text-slate-900">
                  {opportunity.city_district ? `${opportunity.city_district}, ` : ''}
                  {opportunity.region_name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {isExpiredOrClosed ? (
                <div className="p-3 rounded-lg bg-slate-100 text-xs text-slate-600 text-center">
                  Applications closed ({opportunity.deadline})
                </div>
              ) : opportunity.official_apply_url ? (
                <a
                  href={opportunity.official_apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] py-3 px-4 bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Apply on Official Portal
                  <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <p className="text-xs text-slate-500">Official application URL unavailable.</p>
              )}
              {applyHost && (
                <p className="text-xs text-slate-500 text-center break-all">
                  External portal: <span className="font-mono">{applyHost}</span>
                  {opportunity.is_demo === 1 ? ' (Demo link)' : ''}
                </p>
              )}
            </div>
          </div>

          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0f294a] mb-2">Internship Overview</h2>
              <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {opportunity.description}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="font-display text-lg font-bold text-[#0f294a] mb-2">Responsibilities</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {opportunity.responsibilities}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="font-display text-lg font-bold text-[#0f294a] mb-2">
                Required Qualifications & Eligibility
              </h2>
              <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
                <p>
                  <span className="font-semibold text-slate-900">Qualifications:</span>{' '}
                  {opportunity.qualifications}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Ghana Eligibility & Availability:</span>{' '}
                  {opportunity.eligibility_requirements}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Required Skills:</span>{' '}
                  {opportunity.required_skills || 'Not specified'}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Required Application Documents:</span>{' '}
                  {opportunity.required_documents || 'Not specified'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h2 className="font-display text-lg font-bold text-[#0f294a] mb-2">About the Organization</h2>
              <p className="text-sm text-slate-700 leading-relaxed">
                {opportunity.organization_description || 'Not specified'}
              </p>
            </div>
          </section>

          {/* Verification Audit Trail */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0f294a] inline-flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0d9488] shrink-0" aria-hidden="true" />
              Source Verification Record
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div className="p-3 rounded-lg bg-[#f4f6f9]">
                <dt className="text-xs text-slate-500">Verification Status</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{opportunity.verification_status}</dd>
              </div>
              <div className="p-3 rounded-lg bg-[#f4f6f9]">
                <dt className="text-xs text-slate-500">Last Verified Date</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {opportunity.last_verified_at || 'Not yet verified'}
                </dd>
              </div>
              <div className="sm:col-span-2 p-3 rounded-lg bg-[#f4f6f9]">
                <dt className="text-xs text-slate-500">Original Source Reference</dt>
                <dd className="mt-0.5 break-all">
                  {opportunity.source_url ? (
                    <a
                      href={opportunity.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0d9488] hover:underline inline-flex items-center gap-1 text-xs font-mono py-1"
                    >
                      {opportunity.source_url}
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-slate-600 text-xs">Unavailable</span>
                  )}
                </dd>
              </div>
            </dl>

            {history.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Verification Log
                </h3>
                <ul className="divide-y divide-slate-100 text-xs text-slate-600">
                  {history.map((log) => (
                    <li key={log.id} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span>
                        {log.previous_status} → <strong className="text-slate-900">{log.new_status}</strong>
                        {log.notes ? ` — ${log.notes}` : ''}
                      </span>
                      <span className="font-mono tabular-nums text-slate-400 shrink-0">{log.checked_at}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Right Action & Facts Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Official Application Portal Box — clearly separated from platform controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0f294a]">Application & Dates</h2>

            <dl className="space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Region</dt>
                <dd className="font-medium text-slate-900 text-right">{opportunity.region_name}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">City / District</dt>
                <dd className="font-medium text-slate-900 text-right">{opportunity.city_district || 'Not specified'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Arrangement</dt>
                <dd className="font-medium text-slate-900 text-right">{opportunity.work_arrangement}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Opening Date</dt>
                <dd className="font-mono tabular-nums text-slate-900">{opportunity.opening_date || 'Not specified'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Deadline</dt>
                <dd className="font-mono tabular-nums font-semibold text-[#0f294a]">{opportunity.deadline}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-slate-100 pb-2">
                <dt className="text-slate-500">Duration</dt>
                <dd className="font-medium text-slate-900 text-right">{opportunity.duration || 'Not specified'}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-slate-500">Compensation</dt>
                <dd className="font-medium text-slate-900 text-right">{opportunity.compensation || 'Not specified'}</dd>
              </div>
            </dl>

            <div className="hidden lg:block pt-3 border-t border-slate-200 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                External Application Link
              </p>
              {isExpiredOrClosed ? (
                <div className="p-3 rounded-lg bg-slate-100 text-xs text-slate-600 text-center">
                  Applications closed ({opportunity.deadline})
                </div>
              ) : opportunity.official_apply_url ? (
                <a
                  href={opportunity.official_apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-[48px] py-3 px-4 bg-[#0d9488] hover:bg-[#0f766e] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Apply on Official Portal
                  <ExternalLink className="w-4 h-4 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <p className="text-xs text-slate-500">Official application URL unavailable.</p>
              )}
              {applyHost && (
                <p className="text-xs text-slate-500 text-center break-all">
                  Opens external portal: <span className="font-mono">{applyHost}</span>
                  {opportunity.is_demo === 1 ? ' (Demo link)' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Meridian Platform Preparation Actions */}
          <div className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Meridian Platform Tools
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={handleToggleSave}
              className={`w-full min-h-[44px] py-2.5 px-4 text-sm font-medium rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                opportunity.isSaved
                  ? 'bg-white border-[#0d9488] text-[#0f766e]'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4 shrink-0" aria-hidden="true" />
              {opportunity.isSaved ? 'Saved to Dashboard' : 'Save Opportunity'}
            </button>

            <Link
              to="/documents"
              className="w-full min-h-[44px] py-2.5 px-4 text-sm font-medium rounded-lg bg-[#0f294a] text-white hover:bg-[#173a66] transition-colors flex items-center justify-center gap-2 text-center"
            >
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              Prepare & Review CV / Cover Letter
            </Link>

            <button
              type="button"
              onClick={() => {
                setReportOpen((v) => !v);
                setReportSent(false);
              }}
              className="w-full min-h-[44px] py-2 px-4 text-xs font-medium text-slate-600 hover:text-red-700 flex items-center justify-center gap-1.5"
            >
              <Flag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Report Issue or Outdated Listing
            </button>

            {reportOpen && (
              <form onSubmit={handleReportSubmit} className="pt-3 border-t border-slate-200 space-y-3">
                {reportSent ? (
                  <p className="text-xs text-emerald-700 font-medium">
                    Thank you. Your report has been logged for administrator review.
                  </p>
                ) : (
                  <>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option>Deadline passed or closed</option>
                      <option>Not actually open to Ghana residents</option>
                      <option>Broken official application link</option>
                      <option>Suspected inaccurate information</option>
                    </select>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="Optional details..."
                      rows={2}
                      className="w-full px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="w-full min-h-[44px] py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                    >
                      Submit Report
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
