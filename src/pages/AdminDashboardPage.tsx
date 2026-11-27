import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Opportunity } from '../types';

type AdminTab = 'opportunities' | 'verification' | 'reviews' | 'users' | 'governance';

export function AdminDashboardPage() {
  const { user, regions, categories, refreshMeta } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AdminTab>('opportunities');
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // New Ghana Opportunity Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cityDistrict, setCityDistrict] = useState('');
  const [workArrangement, setWorkArrangement] = useState<'On-site' | 'Hybrid' | 'Remote (Ghana Residents)'>('On-site');
  const [ghanaConfirmed, setGhanaConfirmed] = useState(false);
  const [ghanaEvidence, setGhanaEvidence] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [eligibilityReqs, setEligibilityReqs] = useState('');
  const [deadline, setDeadline] = useState('');
  const [duration, setDuration] = useState('');
  const [compensation, setCompensation] = useState('');
  const [officialApplyUrl, setOfficialApplyUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  // New Editor Account Form
  const [edName, setEdName] = useState('');
  const [edEmail, setEdEmail] = useState('');
  const [edPassword, setEdPassword] = useState('');

  // New Category & Announcement
  const [newCategoryName, setNewCategoryName] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');

  const loadAll = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const [ov, opps, revs, usrs, reps, logs, anns] = await Promise.all([
        apiFetch<{ stats: Record<string, number> }>('/api/admin/overview'),
        apiFetch<{ opportunities: Opportunity[] }>('/api/admin/opportunities'),
        apiFetch<{ reviews: any[]; editors: any[] }>('/api/admin/reviews'),
        apiFetch<{ users: any[] }>('/api/admin/users'),
        apiFetch<{ reports: any[] }>('/api/admin/reports'),
        apiFetch<{ logs: any[] }>('/api/admin/audit-logs'),
        apiFetch<{ announcements: any[] }>('/api/admin/announcements'),
      ]);
      setStats(ov.stats);
      setOpportunities(opps.opportunities);
      setReviews(revs.reviews);
      setEditors(revs.editors);
      setUsers(usrs.users);
      setReports(reps.reports);
      setAuditLogs(logs.logs);
      setAnnouncements(anns.announcements);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator data.');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'admin') {
      setError('Administrator privileges are required to view this console.');
      return;
    }
    void loadAll();
  }, [user, navigate, loadAll]);

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await apiFetch('/api/admin/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          title,
          organizationName,
          categoryId: Number(categoryId),
          regionId: Number(regionId),
          cityDistrict,
          workArrangement,
          ghanaEligibilityConfirmed: ghanaConfirmed,
          ghanaEligibilityEvidence: ghanaEvidence,
          description,
          responsibilities,
          qualifications,
          eligibilityRequirements: eligibilityReqs,
          deadline,
          duration: duration || 'Not specified',
          compensation: compensation || 'Not specified',
          officialApplyUrl,
          sourceUrl,
          isDemo: false,
        }),
      });
      setShowCreateForm(false);
      setTitle('');
      setOrganizationName('');
      setGhanaConfirmed(false);
      setGhanaEvidence('');
      setMessage('Ghana opportunity added as "Pending Verification". Verify source URL in Verification Queue to publish.');
      await loadAll();
      await refreshMeta();
    } catch (err: any) {
      setError(err.message || 'Could not add opportunity.');
    }
  };

  const handleVerifyAction = async (
    opp: Opportunity,
    status: 'Verified' | 'Closed' | 'Expired' | 'Source Unavailable'
  ) => {
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/admin/opportunities/${opp.id}/verify`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          sourceCheckedUrl: opp.source_url,
          ghanaConfirmed: true,
          notes: `Administrator updated status to ${status} after checking source.`,
        }),
      });
      setMessage(`Updated "${opp.title}" to ${status}.`);
      await loadAll();
      await refreshMeta();
    } catch (err: any) {
      setError(err.message || 'Verification update failed.');
    }
  };

  const handleDeleteOpp = async (id: number) => {
    await apiFetch(`/api/admin/opportunities/${id}`, { method: 'DELETE' });
    setMessage('Opportunity removed.');
    await loadAll();
    await refreshMeta();
  };

  const handleAssignEditor = async (documentId: number, editorId: string) => {
    if (!editorId) return;
    await apiFetch(`/api/admin/reviews/${documentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ editorId: Number(editorId) }),
    });
    setMessage('Document review assigned to editor.');
    await loadAll();
  };

  const handleCreateEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/editors', {
        method: 'POST',
        body: JSON.stringify({ fullName: edName, email: edEmail, password: edPassword }),
      });
      setEdName('');
      setEdEmail('');
      setEdPassword('');
      setMessage('Document Editor account created.');
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to create editor.');
    }
  };

  const handleToggleUserStatus = async (u: any) => {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    await apiFetch(`/api/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadAll();
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await apiFetch('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    setNewCategoryName('');
    setMessage('New industry category added.');
    await refreshMeta();
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify({ title: annTitle, body: annBody }),
    });
    setAnnTitle('');
    setAnnBody('');
    setMessage('Platform announcement published.');
    await loadAll();
    await refreshMeta();
  };

  if (!user) return null;

  if (user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold text-[#0f294a]">Administrator Access Only</h1>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const filteredOpps = opportunities.filter((o) => {
    if (!searchFilter.trim()) return true;
    const s = searchFilter.toLowerCase();
    return (
      o.title.toLowerCase().includes(s) ||
      o.organization_name.toLowerCase().includes(s) ||
      o.region_name.toLowerCase().includes(s)
    );
  });

  const pendingOpps = opportunities.filter((o) => o.verification_status === 'Pending Verification');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#0d9488]">
            Registry Governance
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
            Administrator Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live database figures ({stats?.demoListingsCount || 0} labelled demonstration listings included). Personal document payloads remain hidden from general analytics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          Add Ghana Opportunity
        </button>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>}
      {message && (
        <div className="p-3 rounded-lg bg-[#f0fdfa] border border-teal-200 text-xs text-[#0f766e] font-medium">
          {message}
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            ['Total Users', stats.totalUsers],
            ['Verified Opps', stats.verifiedOpportunities],
            ['Pending Verify', stats.pendingVerification],
            ['Closing Soon', stats.closingSoon],
            ['Expired Opps', stats.expiredOpportunities],
            ['Pending Reviews', stats.pendingReviews],
          ].map(([label, val]) => (
            <div key={String(label)} className="p-4 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0f294a] mt-1">{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Opportunity Drawer */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateOpportunity}
          className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4"
        >
          <h2 className="font-display text-lg font-bold text-[#0f294a]">
            Add Verified-Source Ghana Internship
          </h2>
          <p className="text-xs text-slate-600">
            Strict Ghana-only gate: Listings start as <strong>Pending Verification</strong> and cannot be published until Ghana eligibility and a working source URL are confirmed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Internship Title"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Organization Name"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="">Select Industry Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              required
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="">Select Ghana Region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={cityDistrict}
              onChange={(e) => setCityDistrict(e.target.value)}
              placeholder="City / District (or leave blank)"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value as any)}
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="On-site">On-site (Ghana)</option>
              <option value="Hybrid">Hybrid (Ghana)</option>
              <option value="Remote (Ghana Residents)">Remote (Ghana Residents)</option>
            </select>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg font-mono"
            />
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (or Not specified)"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              placeholder="Compensation (or Not specified)"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="url"
              required
              value={officialApplyUrl}
              onChange={(e) => setOfficialApplyUrl(e.target.value)}
              placeholder="Official Application URL (https://...)"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg sm:col-span-2"
            />
            <input
              type="url"
              required
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Original Source URL (https://...)"
              className="min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <textarea
            required
            rows={2}
            value={ghanaEvidence}
            onChange={(e) => setGhanaEvidence(e.target.value)}
            placeholder="Documented evidence of Ghana location or Ghana resident eligibility..."
            className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internship description..."
              className="px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={3}
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              placeholder="Key responsibilities..."
              className="px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={2}
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="Required qualifications..."
              className="px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={2}
              value={eligibilityReqs}
              onChange={(e) => setEligibilityReqs(e.target.value)}
              placeholder="Eligibility requirements..."
              className="px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <label className="flex items-start gap-2.5 py-1 text-xs font-medium text-[#0f294a] cursor-pointer">
            <input
              type="checkbox"
              checked={ghanaConfirmed}
              onChange={(e) => setGhanaConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 shrink-0"
            />
            <span>I confirm this internship meets the strict Ghana-only eligibility policy.</span>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-[#0f294a] rounded-lg"
            >
              Save as Pending Verification
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tab Navigation (Responsive wrapping grid on mobile, inline pill-group on sm+) */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-xl w-full sm:w-fit">
        {(
          [
            ['opportunities', `Opportunities (${opportunities.length})`],
            ['verification', `Verification (${pendingOpps.length})`],
            ['reviews', `Reviews (${reviews.length})`],
            ['users', `Users & Editors (${users.length})`],
            ['governance', 'Categories & Logs'],
          ] as Array<[AdminTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] px-3 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-colors text-center ${
              key === 'governance' ? 'col-span-2 sm:col-span-1' : ''
            } ${
              tab === key ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Opportunities */}
      {tab === 'opportunities' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden space-y-4 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[#0f294a]">All Ghana Opportunities</h2>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by title, organization, or region..."
              className="w-full sm:w-72 min-h-[44px] px-3 py-2 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          {/* Mobile Card List (< md) */}
          <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
            {filteredOpps.map((opp) => (
              <div key={opp.id} className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#0f294a] break-words">{opp.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {opp.organization_name} · {opp.region_name}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 shrink-0">
                    {opp.verification_status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono tabular-nums text-slate-500">
                  <span>Deadline: {opp.deadline}</span>
                  <span>Checked: {opp.last_verified_at || 'Never'}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {opp.verification_status !== 'Verified' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyAction(opp, 'Verified')}
                      className="min-h-[44px] flex-1 px-3 py-2 bg-[#0d9488] text-white rounded-lg text-xs font-semibold"
                    >
                      Verify
                    </button>
                  )}
                  {opp.verification_status !== 'Closed' && (
                    <button
                      type="button"
                      onClick={() => handleVerifyAction(opp, 'Closed')}
                      className="min-h-[44px] flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Close
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteOpp(opp.id)}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg inline-flex items-center justify-center gap-1 text-xs font-medium"
                    aria-label="Delete listing"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f6f9] text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Title & Organization</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Deadline</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Checked</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOpps.map((opp) => (
                  <tr key={opp.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#0f294a]">{opp.title}</div>
                      <div className="text-slate-500">{opp.organization_name}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{opp.region_name}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{opp.deadline}</td>
                    <td className="px-4 py-3 font-semibold">{opp.verification_status}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-500">
                      {opp.last_verified_at || 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {opp.verification_status !== 'Verified' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyAction(opp, 'Verified')}
                          className="px-2.5 py-1.5 bg-[#0d9488] text-white rounded font-medium"
                        >
                          Verify
                        </button>
                      )}
                      {opp.verification_status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyAction(opp, 'Closed')}
                          className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded font-medium"
                        >
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteOpp(opp.id)}
                        className="p-1.5 text-red-700 hover:bg-red-50 rounded align-middle"
                        aria-label="Delete listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Verification Queue */}
      {tab === 'verification' && (
        <div className="space-y-4">
          {pendingOpps.length === 0 ? (
            <div className="p-8 rounded-xl border border-slate-200 bg-white text-center text-sm text-slate-600">
              All submitted opportunities have been checked.
            </div>
          ) : (
            pendingOpps.map((opp) => (
              <div key={opp.id} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-[#0f294a] break-words">{opp.title}</h3>
                    <p className="text-xs text-slate-600">
                      {opp.organization_name} · {opp.region_name} · Deadline: {opp.deadline}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-amber-800 shrink-0">Pending Verification</span>
                </div>
                <p className="text-xs text-slate-700">
                  <strong>Ghana Eligibility Proof:</strong> {opp.ghana_eligibility_evidence}
                </p>
                <p className="text-xs font-mono text-slate-600 break-all">Source URL: {opp.source_url}</p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyAction(opp, 'Verified')}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0d9488] rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Confirm Ghana Eligibility & Mark Verified
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyAction(opp, 'Source Unavailable')}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    Source Unavailable
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyAction(opp, 'Closed')}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-lg"
                  >
                    Reject / Close
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Document Review Assignments (Metadata Only) */}
      {tab === 'reviews' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200">
            <h2 className="font-display text-lg font-bold text-[#0f294a]">Document Review Assignments</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Only document titles and workflow status are shown here to protect applicant privacy.
            </p>
          </div>

          {/* Mobile Cards (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.document_id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#0f294a] break-words">{r.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Applicant: {r.applicant_name}</p>
                  </div>
                  <span className="text-xs font-semibold text-[#0d9488] shrink-0">{r.review_status}</span>
                </div>
                <p className="text-xs text-slate-600">
                  Assigned Editor: <strong>{r.editor_name || 'Unassigned'}</strong>
                </p>
                <select
                  defaultValue=""
                  onChange={(e) => handleAssignEditor(r.document_id, e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 border border-slate-300 rounded-lg bg-white text-base sm:text-xs"
                >
                  <option value="" disabled>
                    Assign or reassign editor...
                  </option>
                  {editors.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.full_name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4f6f9] text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Assigned Editor</th>
                  <th className="px-4 py-3">Assign / Reassign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((r) => (
                  <tr key={r.document_id}>
                    <td className="px-4 py-3 font-semibold text-[#0f294a]">{r.title}</td>
                    <td className="px-4 py-3 text-slate-700">{r.applicant_name}</td>
                    <td className="px-4 py-3 font-medium text-[#0d9488]">{r.review_status}</td>
                    <td className="px-4 py-3 text-slate-600">{r.editor_name || 'Unassigned'}</td>
                    <td className="px-4 py-3">
                      <select
                        defaultValue=""
                        onChange={(e) => handleAssignEditor(r.document_id, e.target.value)}
                        className="min-h-[38px] px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                      >
                        <option value="" disabled>
                          Choose editor...
                        </option>
                        {editors.map((ed) => (
                          <option key={ed.id} value={ed.id}>
                            {ed.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Users & Editors */}
      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateEditor}
            className="lg:col-span-4 bg-[#f4f6f9] border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 h-fit"
          >
            <h2 className="font-display text-base font-bold text-[#0f294a]">Create Editor Account</h2>
            <input
              type="text"
              required
              value={edName}
              onChange={(e) => setEdName(e.target.value)}
              placeholder="Editor full name"
              className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              required
              value={edEmail}
              onChange={(e) => setEdEmail(e.target.value)}
              placeholder="editor@organisation.gh"
              className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-lg"
            />
            <input
              type="password"
              required
              minLength={8}
              value={edPassword}
              onChange={(e) => setEdPassword(e.target.value)}
              placeholder="Temporary password (min 8 chars)"
              className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs bg-white border border-slate-300 rounded-lg"
            />
            <button
              type="submit"
              className="w-full min-h-[44px] py-2 text-xs font-semibold text-white bg-[#0f294a] rounded-lg"
            >
              Add Document Editor
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[#0f294a] break-words">{u.full_name}</div>
                    <div className="text-xs text-slate-500 break-all">{u.email}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      <span className="uppercase font-mono">{u.role}</span> · Status: {u.status}
                    </div>
                  </div>
                  {u.id !== user.id && (
                    <button
                      type="button"
                      onClick={() => handleToggleUserStatus(u)}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f6f9] text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Name & Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0f294a]">{u.full_name}</div>
                        <div className="text-slate-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 uppercase font-mono">{u.role}</td>
                      <td className="px-4 py-3">{u.status}</td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Categories, Reports, Announcements & Audit Logs */}
      {tab === 'governance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleAddCategory} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
              <h2 className="font-display text-base font-bold text-[#0f294a]">Add Industry Category</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Logistics and Supply Chain"
                  className="flex-1 min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] rounded-lg shrink-0"
                >
                  Add
                </button>
              </div>
            </form>

            <form
              onSubmit={handleCreateAnnouncement}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3"
            >
              <h2 className="font-display text-base font-bold text-[#0f294a]">Publish Platform Announcement</h2>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement title"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder="Announcement message"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0d9488] rounded-lg"
              >
                Publish Notice ({announcements.length})
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#0f294a]">
              Reported Listings ({reports.length})
            </h2>
            {reports.length === 0 ? (
              <p className="text-xs text-slate-500">No opportunity reports submitted.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {reports.map((rep) => (
                  <li key={rep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <strong className="text-[#0f294a]">{rep.opportunity_title}</strong> — {rep.reason}
                      {rep.details && <p className="text-slate-600 mt-0.5">{rep.details}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono">{rep.status}</span>
                      {rep.status === 'open' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/reports/${rep.id}`, {
                              method: 'PATCH',
                              body: JSON.stringify({ status: 'resolved' }),
                            });
                            await loadAll();
                          }}
                          className="min-h-[40px] px-3 py-1.5 bg-[#0d9488] text-white rounded-lg inline-flex items-center gap-1 font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#0f294a]">Administrative Audit Logs</h2>
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span>
                    <strong className="text-[#0f294a]">{log.action}</strong> ({log.target_type} #{log.target_id})
                    {log.actor_name ? ` by ${log.actor_name}` : ''}
                  </span>
                  <span className="font-mono tabular-nums text-slate-400 shrink-0">{log.created_at}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
