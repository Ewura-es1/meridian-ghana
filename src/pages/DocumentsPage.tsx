import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Eye, FileUp, Lock, Send, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { DocumentItem, DocumentVersion } from '../types';

export function DocumentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload form
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'cv' | 'cover_letter' | 'motivation_letter' | 'personal_statement' | 'other'>('cv');
  const [file, setFile] = useState<File | null>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Version & preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ documents: DocumentItem[] }>('/api/documents');
      setDocuments(data.documents);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    void loadDocs();
  }, [user, navigate, loadDocs]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a PDF or DOCX file.');
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('docType', docType);
      fd.append('aiConsent', String(aiConsent));
      fd.append('file', file);

      await apiFetch('/api/documents', { method: 'POST', body: fd });
      setTitle('');
      setFile(null);
      setAiConsent(false);
      setSuccess('Document uploaded privately to server storage.');
      await loadDocs();
    } catch (err: any) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (docId: number, versionId?: number) => {
    setError('');
    try {
      const data = await apiFetch<{ downloadUrl: string }>(`/api/documents/${docId}/download-token`, {
        method: 'POST',
        body: JSON.stringify({ versionId }),
      });
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = '';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.message || 'Download failed.');
    }
  };

  const handleRequestReview = async (doc: DocumentItem) => {
    setError('');
    await apiFetch(`/api/documents/${doc.id}/request-review`, {
      method: 'POST',
      body: JSON.stringify({ aiConsent: Boolean(doc.ai_consent_granted) }),
    });
    setSuccess(`Review requested for "${doc.title}". An administrator will assign a reviewer.`);
    await loadDocs();
  };

  const handleDelete = async (doc: DocumentItem) => {
    setError('');
    await apiFetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
    setSuccess(`Deleted "${doc.title}" from private storage.`);
    if (previewDoc?.id === doc.id) setPreviewDoc(null);
    await loadDocs();
  };

  const openVersions = async (doc: DocumentItem) => {
    const data = await apiFetch<{ versions: DocumentVersion[] }>(`/api/documents/${doc.id}/versions`);
    setPreviewDoc(doc);
    setVersions(data.versions);
    setReplaceFile(null);
  };

  const handleReplaceVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDoc || !replaceFile) return;
    const fd = new FormData();
    fd.append('file', replaceFile);
    await apiFetch(`/api/documents/${previewDoc.id}/replace`, { method: 'POST', body: fd });
    setSuccess('New document version uploaded while preserving previous versions.');
    await openVersions(previewDoc);
    await loadDocs();
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#0d9488] mb-1">
          <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Private Document Vault
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">My Application Documents</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Documents are stored privately outside public web directories and accessed only via short-lived signed links by you or an editor explicitly assigned to your review. Please upload only career documents (no Ghana Card or financial records).
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-[#f0fdfa] border border-teal-200 text-xs text-[#0f766e] font-medium">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Upload Form */}
        <form
          onSubmit={handleUpload}
          className="lg:col-span-4 bg-[#f4f6f9] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 h-fit"
        >
          <h2 className="font-display text-lg font-bold text-[#0f294a] inline-flex items-center gap-2">
            <FileUp className="w-5 h-5 text-[#0d9488] shrink-0" aria-hidden="true" />
            Upload PDF or DOCX
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Internship CV 2026"
              className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
            >
              <option value="cv">CV / Resume</option>
              <option value="cover_letter">Cover Letter</option>
              <option value="motivation_letter">Motivation Letter</option>
              <option value="personal_statement">Personal Statement</option>
              <option value="other">Other Application Document</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              File (.pdf or .docx, max 5 MB)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-700 file:mr-3 file:min-h-[40px] file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:bg-[#0f294a] file:text-white file:text-xs file:font-semibold"
            />
          </div>

          <label className="flex items-start gap-2.5 py-1 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAiConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 shrink-0"
            />
            <span>
              Optional: Allow AI-assisted grammar and clarity suggestions (advisory only; never fabricates qualifications).
            </span>
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg inline-flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
            {uploading ? 'Validating & Encrypting Upload...' : 'Upload Privately'}
          </button>
        </form>

        {/* Document List */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {loading ? (
            <div className="h-44 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
          ) : documents.length === 0 ? (
            <div className="p-8 sm:p-10 rounded-xl border border-slate-200 bg-white text-center space-y-2">
              <p className="text-base font-semibold text-[#0f294a]">Your private vault is empty</p>
              <p className="text-sm text-slate-600">
                Upload a PDF or DOCX CV or cover letter above to preview, store versions, and request human feedback.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4 min-w-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span className="uppercase font-semibold text-[#0d9488]">{doc.doc_type.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">v{doc.version_number || 1}</span>
                      <span aria-hidden="true">·</span>
                      <span className="break-all">{doc.original_filename}</span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#0f294a] mt-1 break-words">{doc.title}</h3>
                  </div>

                  <div className="sm:text-right text-xs shrink-0">
                    <span className="font-semibold text-[#0f294a]">{doc.review_status}</span>
                    <div className="font-mono tabular-nums text-slate-500 mt-0.5">
                      Retention until {doc.retention_expires_at}
                    </div>
                  </div>
                </div>

                {doc.assigned_editor_name && (
                  <p className="text-xs text-slate-600">
                    Assigned Human Reviewer: <strong className="text-slate-900">{doc.assigned_editor_name}</strong>
                  </p>
                )}

                <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 pt-3 border-t border-slate-100">
                  <Link
                    to={`/reviews/${doc.id}`}
                    className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg inline-flex items-center justify-center"
                  >
                    Open Review Workspace
                  </Link>

                  {doc.review_status === 'Submitted' && (
                    <button
                      type="button"
                      onClick={() => handleRequestReview(doc)}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg inline-flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Request Editor Review
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openVersions(doc)}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Preview & Versions
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownload(doc.id)}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Private Download
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg inline-flex items-center justify-center gap-1 sm:ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preview & Version History Drawer/Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl max-w-3xl w-full max-h-[92vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="sticky top-0 bg-white z-10 flex items-start justify-between gap-4 border-b border-slate-200 pb-3 pt-1">
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-[#0f294a] break-words">
                  {previewDoc.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Version History & Extracted Text Preview
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shrink-0"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleReplaceVersion}
              className="p-4 rounded-xl bg-[#f4f6f9] border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-700 flex-1 min-w-0 file:mr-3 file:min-h-[40px] file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#0f294a] file:text-white file:text-xs file:font-semibold"
              />
              <button
                type="submit"
                disabled={!replaceFile}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] rounded-lg disabled:opacity-50 shrink-0"
              >
                Upload New Version
              </button>
            </form>

            <div className="space-y-4">
              {versions.map((v) => (
                <div key={v.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0f294a] break-all">
                      Version {v.version_number} — {v.original_filename}
                    </span>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-slate-500 shrink-0">
                      <span>{Math.max(1, Math.round(v.file_size / 1024))} KB</span>
                      <button
                        type="button"
                        onClick={() => handleDownload(previewDoc.id, v.id)}
                        className="min-h-[36px] text-[#0d9488] font-sans font-semibold hover:underline"
                      >
                        Download v{v.version_number}
                      </button>
                    </div>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                    {v.extracted_text}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
