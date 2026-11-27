import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Clock, FileEdit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface AssignedItem {
  document_id: number;
  title: string;
  doc_type: string;
  review_status: string;
  ai_consent_granted: number;
  updated_at: string;
  applicant_name: string;
  assignment_id: number;
  due_at: string | null;
  assigned_at: string;
  editor_summary: string | null;
}

export function EditorDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'editor') {
      setError('This workspace is restricted to authorized Document Editors.');
      setLoading(false);
      return;
    }
    apiFetch<{ assignments: AssignedItem[] }>('/api/reviews/assigned')
      .then((data) => setAssignments(data.assignments))
      .catch((err) => setError(err.message || 'Failed to load assigned documents.'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  const pendingCount = assignments.filter((a) =>
    ['Assigned', 'Under Review'].includes(a.review_status)
  ).length;
  const revisionCount = assignments.filter((a) =>
    ['Changes Suggested', 'Awaiting Applicant Approval'].includes(a.review_status)
  ).length;
  const completedCount = assignments.filter((a) =>
    ['Approved', 'Completed'].includes(a.review_status)
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#0d9488]">
          Authorized Reviewer Workspace
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a] mt-1">
          Document Editor Dashboard
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Privacy safeguard: You can access only the applicant documents explicitly assigned to you.
        </p>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                <span>Total Assigned</span>
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0f294a] mt-1">
                {assignments.length}
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>Pending Reviews</span>
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0f294a] mt-1">
                {pendingCount}
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <FileEdit className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                <span>Awaiting Applicant</span>
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0f294a] mt-1">
                {revisionCount}
              </div>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white">
              <div className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
                <span>Completed / Approved</span>
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0f294a] mt-1">
                {completedCount}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-lg font-bold text-[#0f294a]">Assigned Document Queue</h2>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading assigned documents...</div>
            ) : assignments.length === 0 ? (
              <div className="p-8 sm:p-10 text-center text-sm text-slate-600">
                No documents are currently assigned to your review queue.
              </div>
            ) : (
              <>
                {/* Mobile Card Queue (< md) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {assignments.map((item) => (
                    <div key={item.assignment_id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-[#0f294a] break-words">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Applicant: {item.applicant_name} ·{' '}
                            <span className="uppercase">{item.doc_type.replace('_', ' ')}</span>
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#0d9488] shrink-0">
                          {item.review_status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
                        <span>Due: {item.due_at || 'Not set'}</span>
                      </div>
                      <Link
                        to={`/reviews/${item.document_id}`}
                        className="w-full min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg inline-flex items-center justify-center"
                      >
                        Review Document
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f4f6f9] text-xs font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Document Title</th>
                        <th className="px-6 py-3">Applicant</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Due Date</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignments.map((item) => (
                        <tr key={item.assignment_id} className="hover:bg-slate-50">
                          <td className="px-6 py-3.5 font-medium text-[#0f294a]">{item.title}</td>
                          <td className="px-6 py-3.5 text-slate-700">{item.applicant_name}</td>
                          <td className="px-6 py-3.5 text-xs uppercase text-slate-500">
                            {item.doc_type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-semibold text-[#0d9488]">
                            {item.review_status}
                          </td>
                          <td className="px-6 py-3.5 font-mono tabular-nums text-xs text-slate-500">
                            {item.due_at || 'Not set'}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <Link
                              to={`/reviews/${item.document_id}`}
                              className="inline-flex items-center min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
                            >
                              Review Document
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
