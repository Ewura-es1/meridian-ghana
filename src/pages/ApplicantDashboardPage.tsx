import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, CheckCircle2, FileText, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { DocumentItem, NotificationItem, Opportunity } from '../types';

export function ApplicantDashboardPage() {
  const { user, profile, regions, categories, refreshMe, logout } = useAuth();
  const navigate = useNavigate();

  const [saved, setSaved] = useState<Opportunity[]>([]);
  const [recent, setRecent] = useState<Opportunity[]>([]);
  const [recommended, setRecommended] = useState<Opportunity[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingProfile, setEditingProfile] = useState(false);
  const [educationLevel, setEducationLevel] = useState('');
  const [institution, setInstitution] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [prefRegions, setPrefRegions] = useState<string[]>([]);
  const [prefCategories, setPrefCategories] = useState<string[]>([]);
  const [skillsText, setSkillsText] = useState('');
  const [bio, setBio] = useState('');
  const [notifyDeadlines, setNotifyDeadlines] = useState(true);
  const [notifyReviews, setNotifyReviews] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (profile) {
      setEducationLevel(profile.education_level || '');
      setInstitution(profile.institution || '');
      setGraduationYear(profile.graduation_year || '');
      setPrefRegions(profile.preferred_regions || []);
      setPrefCategories(profile.preferred_categories || []);
      setSkillsText((profile.skills || []).join(', '));
      setBio(profile.bio || '');
      setNotifyDeadlines(profile.notify_deadlines);
      setNotifyReviews(profile.notify_reviews);
    }
  }, [user, profile, navigate]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    Promise.all([
      apiFetch<{ saved: Opportunity[]; recentlyViewed: Opportunity[] }>('/api/opportunities/saved/list'),
      apiFetch<{ opportunities: Opportunity[] }>('/api/opportunities?sort=recently_verified'),
      apiFetch<{ documents: DocumentItem[] }>('/api/documents'),
      apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
    ])
      .then(([savedData, allOpps, docsData, notifData]) => {
        if (!active) return;
        setSaved(savedData.saved);
        setRecent(savedData.recentlyViewed);
        setDocuments(docsData.documents);
        setNotifications(notifData.notifications);

        // Recommend active Ghana opportunities matching preferred regions or categories
        const prefRegSet = new Set(profile?.preferred_regions || []);
        const prefCatSet = new Set(profile?.preferred_categories || []);
        const matched = allOpps.opportunities.filter(
          (o) => prefRegSet.has(o.region_name) || prefCatSet.has(o.category_name)
        );
        setRecommended((matched.length > 0 ? matched : allOpps.opportunities).slice(0, 4));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, profile]);

  const toggleRegion = (name: string) => {
    setPrefRegions((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  };

  const toggleCategory = (name: string) => {
    setPrefCategories((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage('');
    await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        educationLevel,
        institution,
        graduationYear,
        preferredRegions: prefRegions,
        preferredCategories: prefCategories,
        skills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        bio,
        notifyDeadlines,
        notifyReviews,
      }),
    });
    await refreshMe();
    setEditingProfile(false);
    setSaveMessage('Profile preferences saved.');
  };

  const markRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    await refreshMe();
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    await refreshMe();
  };

  const handleDeleteAccount = async () => {
    await apiFetch('/api/auth/account', { method: 'DELETE' });
    await logout();
    navigate('/');
  };

  if (!user) return null;

  const profileSteps = [
    Boolean(profile?.education_level),
    Boolean(profile?.institution),
    (profile?.preferred_regions?.length || 0) > 0,
    (profile?.preferred_categories?.length || 0) > 0,
  ];
  const profilePct = Math.round((profileSteps.filter(Boolean).length / profileSteps.length) * 100);

  const checklist = [
    { label: 'Complete your Ghana region & industry preferences', done: profilePct === 100 },
    { label: 'Upload your CV to the private vault', done: documents.some((d) => d.doc_type === 'cv') },
    { label: 'Save an active Ghana internship and check eligibility', done: saved.length > 0 },
    {
      label: 'Request a human document review for feedback',
      done: documents.some((d) => d.review_status !== 'Submitted'),
    },
    {
      label: 'Review approved revisions before applying on official portal',
      done: documents.some((d) => d.review_status === 'Approved' || d.review_status === 'Completed'),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a] break-words">
            Welcome, {user.full_name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your saved Ghana internships, review progress, and application preparation checklist.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setEditingProfile((v) => !v)}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-[#0f294a] bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center justify-center"
          >
            {editingProfile ? 'Close Preferences' : `Profile (${profilePct}%)`}
          </button>
          <Link
            to="/documents"
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg inline-flex items-center justify-center"
          >
            Upload Document
          </Link>
        </div>
      </div>

      {saveMessage && (
        <div className="p-3 rounded-lg bg-[#f0fdfa] border border-teal-200 text-xs text-[#0f766e] font-medium">
          {saveMessage}
        </div>
      )}

      {editingProfile && (
        <form
          onSubmit={handleSaveProfile}
          className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-4 sm:p-6 space-y-5"
        >
          <h2 className="font-display text-lg font-bold text-[#0f294a]">
            Applicant Profile & Ghana Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Education Level</label>
              <input
                type="text"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                placeholder="e.g. BSc Computer Science (Level 300)"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Institution</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. University of Ghana / KNUST"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Graduation</label>
              <input
                type="text"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2027"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Preferred Ghana Regions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {regions.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 min-h-[40px] px-2 rounded-lg bg-white/70 border border-slate-200/70 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={prefRegions.includes(r.name)}
                    onChange={() => toggleRegion(r.name)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">Preferred Industries</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 min-h-[40px] px-2.5 rounded-lg bg-white/70 border border-slate-200/70 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={prefCategories.includes(c.name)}
                    onChange={() => toggleCategory(c.name)}
                    className="w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{c.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                placeholder="Excel, Research, TypeScript"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div className="flex flex-col justify-end gap-2 text-xs text-slate-700">
              <label className="flex items-start gap-2.5 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDeadlines}
                  onChange={(e) => setNotifyDeadlines(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0"
                />
                <span>In-app alerts when saved internships approach deadline or expire</span>
              </label>
              <label className="flex items-start gap-2.5 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyReviews}
                  onChange={(e) => setNotifyReviews(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0"
                />
                <span>In-app alerts when document review status changes</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
          >
            Save Preferences
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-8 space-y-6 sm:space-y-8 min-w-0">
          {/* Recommended Ghana Internships */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0f294a]">
                Recommended Ghana Internships
              </h2>
              <Link
                to="/internships"
                className="text-xs font-semibold text-[#0d9488] hover:underline inline-flex items-center min-h-[36px] sm:min-h-0 self-start sm:self-auto"
              >
                Explore all
              </Link>
            </div>
            {loading ? (
              <div className="h-32 bg-slate-50 rounded-xl border border-slate-200 animate-pulse" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {recommended.map((opp) => (
                  <Link
                    key={opp.id}
                    to={`/internships/${opp.id}`}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#0d9488] transition-colors space-y-1.5 min-w-0"
                  >
                    <p className="text-xs text-[#0d9488] font-medium truncate">
                      {opp.category_name} · {opp.region_name}
                    </p>
                    <p className="font-display font-semibold text-sm text-[#0f294a] break-words">{opp.title}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      Deadline: {opp.deadline} · {opp.verification_status}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Saved Opportunities (includes notice if saved item expired) */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0f294a] inline-flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
              Saved Internships ({saved.length})
            </h2>
            {saved.length === 0 ? (
              <p className="text-sm text-slate-600">
                You haven't saved any Ghana internships yet. Browse active listings and click Save to track deadlines here.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {saved.map((item) => (
                  <li key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/internships/${item.id}`}
                        className="text-sm font-semibold text-[#0f294a] hover:underline break-words"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {item.organization_name} · {item.region_name}
                      </p>
                    </div>
                    <div className="sm:text-right font-mono tabular-nums text-xs shrink-0">
                      <span
                        className={
                          item.verification_status === 'Expired'
                            ? 'text-red-700 font-semibold'
                            : item.verification_status === 'Closing Soon'
                            ? 'text-amber-700 font-semibold'
                            : 'text-emerald-700 font-medium'
                        }
                      >
                        {item.verification_status}
                      </span>
                      <div className="text-slate-500">Deadline: {item.deadline}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Uploaded Documents & Review Progress */}
          <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#0f294a] inline-flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                My Documents & Review Progress ({documents.length})
              </h2>
              <Link
                to="/documents"
                className="text-xs font-semibold text-[#0d9488] hover:underline inline-flex items-center min-h-[36px] sm:min-h-0 self-start sm:self-auto"
              >
                Manage vault
              </Link>
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-600">
                No documents uploaded yet. Upload your CV or cover letter privately to request an editor review.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <li key={doc.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f294a] break-words">{doc.title}</p>
                      <p className="text-xs text-slate-500">
                        Status: <strong className="text-slate-800">{doc.review_status}</strong>
                        {doc.assigned_editor_name ? ` · Reviewer: ${doc.assigned_editor_name}` : ''}
                      </p>
                    </div>
                    <Link
                      to={`/reviews/${doc.id}`}
                      className="min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg inline-flex items-center justify-center shrink-0"
                    >
                      Open Review Workspace
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Checklist, Notifications, Recently Viewed & Account Deletion */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-5 space-y-3">
            <h2 className="font-display text-sm font-bold text-[#0f294a]">
              Application Preparation Checklist
            </h2>
            <ul className="space-y-2.5 text-xs">
              {checklist.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      step.done ? 'text-[#0d9488]' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                  <span className={step.done ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[#0f294a] inline-flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                In-App Notifications
              </h2>
              {notifications.some((n) => !n.is_read) && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="min-h-[36px] px-2 text-xs font-medium text-[#0d9488] hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-500">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className={`py-2.5 text-xs ${n.is_read ? 'opacity-70' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <Link to={n.link_path} className="font-semibold text-[#0f294a] hover:underline">
                        {n.title}
                      </Link>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="min-h-[32px] px-2 text-[11px] font-semibold text-[#0d9488] shrink-0"
                        >
                          Read
                        </button>
                      )}
                    </div>
                    <p className="text-slate-600 mt-0.5">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {recent.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
              <h2 className="font-display text-sm font-bold text-[#0f294a]">Recently Viewed</h2>
              <ul className="space-y-2 text-xs">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/internships/${r.id}`} className="text-[#0f294a] font-medium hover:underline">
                      {r.title}
                    </Link>
                    <span className="block text-slate-500">{r.region_name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {user.role === 'applicant' && (
            <div className="border border-red-200 rounded-xl p-5 space-y-3 bg-red-50/40">
              <h2 className="font-display text-sm font-bold text-red-900">Data & Account Control</h2>
              <p className="text-xs text-slate-600">
                Permanently remove your account and delete all privately stored documents from server storage.
              </p>
              {!confirmDeleteAccount ? (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteAccount(true)}
                  className="min-h-[40px] text-xs font-semibold text-red-700 hover:underline inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  Request Account Deletion
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-800">
                    Confirm permanent deletion of your account and files?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg"
                    >
                      Yes, Delete Everything
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(false)}
                      className="min-h-[44px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
