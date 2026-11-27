import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Download,
  MessageSquare,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { AiSuggestion, DocumentVersion, ReviewAnnotation, ReviewStatus } from '../types';

const REVIEW_STEPS: ReviewStatus[] = [
  'Submitted',
  'Awaiting Assignment',
  'Assigned',
  'Under Review',
  'Changes Suggested',
  'Awaiting Applicant Approval',
  'Approved',
  'Completed',
];

const ANNOTATION_STYLES: Record<
  ReviewAnnotation['color'],
  { bg: string; border: string; text: string; defaultLabel: string }
> = {
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    defaultLabel: 'Error Requiring Correction',
  },
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    defaultLabel: 'Suggested Improvement',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    defaultLabel: 'Accepted Correction',
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    defaultLabel: 'Editor Comment',
  },
};

export function DocumentReviewWorkspacePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [doc, setDoc] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [permissions, setPermissions] = useState<{
    isOwner: boolean;
    isAssignedEditor: boolean;
    aiConfigured: boolean;
  }>({ isOwner: false, isAssignedEditor: false, aiConfigured: false });

  const [revisedText, setRevisedText] = useState('');
  const [annotations, setAnnotations] = useState<ReviewAnnotation[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [editorSummary, setEditorSummary] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'diff'>('split');
  const [mobilePanel, setMobilePanel] = useState<'draft' | 'original' | 'notes'>('draft');

  // New annotation composer (for editor)
  const [annColor, setAnnColor] = useState<ReviewAnnotation['color']>('yellow');
  const [annSection, setAnnSection] = useState('Experience / Summary');
  const [annExcerpt, setAnnExcerpt] = useState('');
  const [annComment, setAnnComment] = useState('');

  // AI suggestion state
  const [aiConsentChecked, setAiConsentChecked] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDisclaimer, setAiDisclaimer] = useState('');
  const [saving, setSaving] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any>(`/api/reviews/${id}`);
      setDoc(data.document);
      setCurrentVersion(data.currentVersion);
      setAssignment(data.assignment);
      setPermissions(data.permissions);
      setRevisedText(data.review?.revised_text || data.currentVersion?.extracted_text || '');
      setAnnotations(data.review?.annotations || []);
      setAiSuggestions(data.review?.aiSuggestions || []);
      setEditorSummary(data.review?.editor_summary || '');
      setAiConsentChecked(Boolean(data.document?.ai_consent_granted));
    } catch (err: any) {
      setError(err.message || 'Unable to load review workspace.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    void loadWorkspace();
  }, [user, navigate, loadWorkspace]);

  const handleDownloadOriginal = async () => {
    const data = await apiFetch<{ downloadUrl: string }>(`/api/documents/${id}/download-token`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const link = document.createElement('a');
    link.href = data.downloadUrl;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const addAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annComment.trim()) return;
    const item: ReviewAnnotation = {
      id: `ann-${Date.now()}`,
      color: annColor,
      label: ANNOTATION_STYLES[annColor].defaultLabel,
      section: annSection.trim() || 'General',
      excerpt: annExcerpt.trim(),
      comment: annComment.trim(),
      status: annColor === 'green' ? 'accepted' : 'open',
    };
    setAnnotations((prev) => [...prev, item]);
    setAnnExcerpt('');
    setAnnComment('');
  };

  const updateAnnotationStatus = (annId: string, status: 'accepted' | 'rejected') => {
    setAnnotations((prev) =>
      prev.map((a) =>
        a.id === annId
          ? {
              ...a,
              status,
              color: status === 'accepted' ? 'green' : a.color,
              label: status === 'accepted' ? 'Accepted Correction' : a.label,
            }
          : a
      )
    );
  };

  const saveEditorReview = async (
    nextStatus: 'Under Review' | 'Changes Suggested' | 'Awaiting Applicant Approval' | 'Completed'
  ) => {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      await apiFetch(`/api/reviews/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          revisedText,
          annotations,
          editorSummary,
          nextStatus,
        }),
      });
      setNotice(`Review saved with status "${nextStatus}".`);
      await loadWorkspace();
    } catch (err: any) {
      setError(err.message || 'Could not save review.');
    } finally {
      setSaving(false);
    }
  };

  const submitApplicantDecision = async (decision: 'approve' | 'complete' | 'clarify') => {
    setSaving(true);
    setNotice('');
    setError('');
    try {
      const data = await apiFetch<{ status: string }>(`/api/reviews/${id}/applicant-decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setNotice(`Updated review status to "${data.status}".`);
      await loadWorkspace();
    } catch (err: any) {
      setError(err.message || 'Could not update decision.');
    } finally {
      setSaving(false);
    }
  };

  const runAiSuggestions = async () => {
    setAiLoading(true);
    setError('');
    try {
      const data = await apiFetch<{
        available: boolean;
        suggestions: AiSuggestion[];
        disclaimer: string;
        error?: string;
      }>(`/api/reviews/${id}/ai-suggest`, {
        method: 'POST',
        body: JSON.stringify({ grantConsentNow: aiConsentChecked }),
      });
      setAiDisclaimer(data.disclaimer);
      if (data.error) {
        setError(data.error);
      } else {
        setAiSuggestions(data.suggestions);
        setNotice('Advisory AI suggestions generated. Review carefully before accepting.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to generate AI suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="h-80 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0f294a]">Access Restricted</h1>
        <p className="text-sm text-red-700">{error}</p>
        <Link
          to="/"
          className="inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-[#0f294a] rounded-lg"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const originalLines = (currentVersion?.extracted_text || '').split('\n');
  const revisedLines = revisedText.split('\n');
  const maxLines = Math.max(originalLines.length, revisedLines.length);
  const currentStepIdx = REVIEW_STEPS.indexOf(doc.review_status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header & Back link */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <Link
            to={permissions.isAssignedEditor ? '/editor' : '/documents'}
            className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium text-slate-600 hover:text-[#0f294a] mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {permissions.isAssignedEditor ? 'Back to Editor Queue' : 'Back to My Documents'}
          </Link>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0f294a] break-words">
            {doc.title}
          </h1>
          <p className="text-xs text-slate-600 mt-1 break-words">
            Applicant: <strong>{doc.owner_name}</strong> · Type:{' '}
            <span className="uppercase">{doc.doc_type.replace('_', ' ')}</span>
            {assignment?.editor_name ? ` · Assigned Reviewer: ${assignment.editor_name}` : ''}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'split' ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600'
              }`}
            >
              Workspace Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('diff')}
              className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md ${
                viewMode === 'diff' ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600'
              }`}
            >
              Before & After
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadOriginal}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-[#0f294a] bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            Private Download
          </button>
        </div>
      </div>

      {/* 8-Step Status Tracker (Responsive Grid — Zero Horizontal Overflow) */}
      <div className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-3 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs lg:hidden">
          <span className="font-semibold text-[#0f294a]">
            Review Progress: {doc.review_status}
          </span>
          <span className="font-mono tabular-nums text-slate-600">
            Step {Math.max(1, currentStepIdx + 1)} of {REVIEW_STEPS.length}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2">
          {REVIEW_STEPS.map((step, idx) => {
            const reached = idx <= currentStepIdx;
            const current = step === doc.review_status;
            return (
              <div
                key={step}
                className={`px-2 py-2 rounded-lg text-[11px] font-medium text-center border flex items-center justify-center ${
                  current
                    ? 'bg-[#0f294a] text-white border-[#0f294a]'
                    : reached
                    ? 'bg-white text-[#0f766e] border-teal-200'
                    : 'bg-transparent text-slate-500 border-slate-200'
                }`}
              >
                {idx + 1}. {step}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-lg bg-[#f0fdfa] border border-teal-200 text-xs text-[#0f766e] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Split or Diff Area */}
      {viewMode === 'split' ? (
        <div className="space-y-4 lg:space-y-0">
          {/* Mobile Workspace Panel Switcher (< lg) */}
          <div
            role="tablist"
            aria-label="Workspace panels"
            className="lg:hidden grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'draft'}
              onClick={() => setMobilePanel('draft')}
              className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                mobilePanel === 'draft' ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600'
              }`}
            >
              Revised Draft
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'original'}
              onClick={() => setMobilePanel('original')}
              className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                mobilePanel === 'original' ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600'
              }`}
            >
              Original (v{currentVersion?.version_number || 1})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobilePanel === 'notes'}
              onClick={() => setMobilePanel('notes')}
              className={`min-h-[44px] px-2 py-2 text-xs font-semibold rounded-lg transition-colors ${
                mobilePanel === 'notes' ? 'bg-white text-[#0f294a] shadow-sm' : 'text-slate-600'
              }`}
            >
              Notes ({annotations.length}) & AI
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Original Document Preview */}
            <div
              className={`${
                mobilePanel === 'original' ? 'flex' : 'hidden'
              } lg:flex lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex-col min-w-0`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h2 className="font-display text-sm font-bold text-[#0f294a]">
                  Original Upload (v{currentVersion?.version_number || 1})
                </h2>
                <span className="font-mono text-[11px] text-slate-500">Read-only</span>
              </div>
              <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words font-sans leading-relaxed flex-1 max-h-[520px] overflow-y-auto bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                {currentVersion?.extracted_text || 'No preview text extracted.'}
              </pre>
            </div>

            {/* Editable / Revised Draft */}
            <div
              className={`${
                mobilePanel === 'draft' ? 'flex' : 'hidden'
              } lg:flex lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex-col space-y-3 min-w-0`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="font-display text-sm font-bold text-[#0f294a]">
                  Revised Draft Content
                </h2>
                <span className="text-[11px] text-[#0d9488] font-medium">
                  {permissions.isAssignedEditor ? 'Editable by Assigned Reviewer' : 'Proposed Revision'}
                </span>
              </div>

              {permissions.isAssignedEditor ? (
                <textarea
                  value={revisedText}
                  onChange={(e) => setRevisedText(e.target.value)}
                  rows={14}
                  className="w-full p-3.5 text-base sm:text-xs text-slate-800 border border-slate-300 rounded-lg font-sans leading-relaxed flex-1"
                />
              ) : (
                <pre className="text-xs text-slate-800 whitespace-pre-wrap break-words font-sans leading-relaxed flex-1 max-h-[420px] overflow-y-auto bg-[#f0fdfa]/40 p-3.5 rounded-lg border border-teal-100">
                  {revisedText}
                </pre>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reviewer Summary Notes
                </label>
                {permissions.isAssignedEditor ? (
                  <textarea
                    value={editorSummary}
                    onChange={(e) => setEditorSummary(e.target.value)}
                    rows={3}
                    placeholder="Summarize overall strengths, formatting fixes, and clarity notes..."
                    className="w-full p-2.5 text-base sm:text-xs border border-slate-300 rounded-lg"
                  />
                ) : (
                  <p className="p-3 rounded-lg bg-[#f4f6f9] text-xs text-slate-700">
                    {editorSummary || 'No summary notes submitted yet.'}
                  </p>
                )}
              </div>

              {permissions.isAssignedEditor && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEditorReview('Under Review')}
                    className="min-h-[44px] px-3 py-2 text-xs font-medium text-[#0f294a] bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Save Draft
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEditorReview('Changes Suggested')}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg"
                  >
                    Submit Revision
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEditorReview('Awaiting Applicant Approval')}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
                  >
                    Return for Approval
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEditorReview('Completed')}
                    className="min-h-[44px] px-3 py-2 text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg"
                  >
                    Mark Complete
                  </button>
                </div>
              )}

              {permissions.isOwner && !permissions.isAssignedEditor && (
                <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitApplicantDecision('approve')}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg"
                  >
                    Approve Revisions
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitApplicantDecision('clarify')}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-[#0f294a] bg-slate-100 hover:bg-slate-200 rounded-lg"
                  >
                    Request Clarification
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => submitApplicantDecision('complete')}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-white bg-[#0f294a] rounded-lg"
                  >
                    Mark Completed
                  </button>
                </div>
              )}
            </div>

            {/* Color-Coded Annotations & AI Advisory Panel */}
            <div
              className={`${
                mobilePanel === 'notes' ? 'block' : 'hidden'
              } lg:block lg:col-span-4 space-y-5 min-w-0`}
            >
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="font-display text-sm font-bold text-[#0f294a] inline-flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                    Human Editor Annotations ({annotations.length})
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <span className="px-2 py-1 rounded bg-red-50 text-red-800 border border-red-200">
                    Red: Errors
                  </span>
                  <span className="px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Yellow: Improvements
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Green: Accepted
                  </span>
                  <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    Blue: Comments
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {annotations.length === 0 ? (
                    <p className="text-xs text-slate-500">No annotations added yet.</p>
                  ) : (
                    annotations.map((ann) => {
                      const style = ANNOTATION_STYLES[ann.color] || ANNOTATION_STYLES.blue;
                      return (
                        <div key={ann.id} className={`p-3 rounded-lg border text-xs space-y-1.5 ${style.bg} ${style.border}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`font-semibold ${style.text}`}>
                              {ann.label} · {ann.section}
                            </span>
                            {ann.status !== 'open' && (
                              <span className="font-mono uppercase text-[10px] text-slate-600">
                                {ann.status}
                              </span>
                            )}
                          </div>
                          {ann.excerpt && (
                            <p className="font-mono text-[11px] bg-white/70 p-1.5 rounded text-slate-700 break-words">
                              "{ann.excerpt}"
                            </p>
                          )}
                          <p className="text-slate-800 break-words">{ann.comment}</p>
                          {(permissions.isAssignedEditor || permissions.isOwner) && ann.status === 'open' && (
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => updateAnnotationStatus(ann.id, 'accepted')}
                                className="min-h-[40px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-medium"
                              >
                                <Check className="w-3.5 h-3.5" /> Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => updateAnnotationStatus(ann.id, 'rejected')}
                                className="min-h-[40px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium"
                              >
                                <X className="w-3.5 h-3.5" /> Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {permissions.isAssignedEditor && (
                  <form onSubmit={addAnnotation} className="pt-3 border-t border-slate-100 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-700">Add Color-Coded Note</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={annColor}
                        onChange={(e) => setAnnColor(e.target.value as any)}
                        className="min-h-[44px] px-2.5 py-1.5 text-base sm:text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="red">Red — Error</option>
                        <option value="yellow">Yellow — Improvement</option>
                        <option value="green">Green — Accepted</option>
                        <option value="blue">Blue — Comment</option>
                      </select>
                      <input
                        type="text"
                        value={annSection}
                        onChange={(e) => setAnnSection(e.target.value)}
                        placeholder="Section"
                        className="min-h-[44px] px-2.5 py-1.5 text-base sm:text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <input
                      type="text"
                      value={annExcerpt}
                      onChange={(e) => setAnnExcerpt(e.target.value)}
                      placeholder="Short excerpt from draft (optional)"
                      className="w-full min-h-[44px] px-2.5 py-1.5 text-base sm:text-xs border border-slate-300 rounded-lg"
                    />
                    <textarea
                      value={annComment}
                      onChange={(e) => setAnnComment(e.target.value)}
                      rows={2}
                      placeholder="Explain spelling, grammar, clarity, or formatting fix..."
                      className="w-full px-2.5 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="submit"
                      className="w-full min-h-[44px] py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
                    >
                      Add Annotation
                    </button>
                  </form>
                )}
              </div>

              {/* Advisory AI Proofreading Panel (Strictly Separate & Consent-Gated) */}
              <div className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold text-[#0f294a] inline-flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                    Advisory AI Proofreading
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">
                    {permissions.aiConfigured ? 'Gemini Ready' : 'Offline Fallback'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  AI suggestions only check grammar, spelling, clarity, and section structure—they never invent qualifications or replace human editor decisions.
                </p>

                {permissions.isOwner && !doc.ai_consent_granted && (
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer bg-white p-3 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={aiConsentChecked}
                      onChange={(e) => setAiConsentChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 shrink-0"
                    />
                    <span>
                      I consent to send this document draft to the server-side AI proofreading service for advisory suggestions.
                    </span>
                  </label>
                )}

                <button
                  type="button"
                  disabled={aiLoading || (!doc.ai_consent_granted && !aiConsentChecked)}
                  onClick={runAiSuggestions}
                  className="w-full min-h-[44px] py-2 px-3 text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg disabled:opacity-50"
                >
                  {aiLoading ? 'Analyzing grammar & clarity...' : 'Generate Advisory AI Suggestions'}
                </button>

                {aiDisclaimer && <p className="text-[11px] text-slate-500 italic">{aiDisclaimer}</p>}

                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
                    {aiSuggestions.map((s) => (
                      <div key={s.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                        <div className="font-semibold text-[#0f294a]">
                          [AI Suggestion · {s.category}] {s.section}
                        </div>
                        {s.originalExcerpt && (
                          <p className="text-slate-500 line-through break-words">{s.originalExcerpt}</p>
                        )}
                        <p className="text-[#0f766e] font-medium break-words">{s.suggestion}</p>
                        <p className="text-slate-600 break-words">{s.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Before & After Line-by-Line Comparison */
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#0f294a]">
              Original vs. Revised Side-by-Side Comparison
            </h2>
            <span className="text-xs text-slate-500">Original file is never overwritten</span>
          </div>
          <div className="hidden md:grid md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500 px-2">
            <div>Original Uploaded Version</div>
            <div>Proposed Revised Version</div>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {Array.from({ length: maxLines }).map((_, i) => {
              const orig = originalLines[i] ?? '';
              const rev = revisedLines[i] ?? '';
              const changed = orig !== rev;
              return (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 text-xs">
                  <div
                    className={`p-2.5 font-sans whitespace-pre-wrap break-words border-b md:border-b-0 md:border-r border-slate-100 ${
                      changed && orig ? 'bg-red-50/70 text-red-900' : 'bg-white text-slate-700'
                    }`}
                  >
                    <span className="md:hidden font-semibold text-[10px] uppercase text-slate-400 mr-1.5">
                      Orig
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 mr-2">{i + 1}</span>
                    {orig || ' '}
                  </div>
                  <div
                    className={`p-2.5 font-sans whitespace-pre-wrap break-words ${
                      changed && rev ? 'bg-emerald-50/70 text-emerald-900' : 'bg-white text-slate-800'
                    }`}
                  >
                    <span className="md:hidden font-semibold text-[10px] uppercase text-[#0d9488] mr-1.5">
                      Rev
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 mr-2">{i + 1}</span>
                    {rev || ' '}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
