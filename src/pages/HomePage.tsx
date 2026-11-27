import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, FileCheck2, MapPin, Search, ShieldCheck } from 'lucide-react';
import { OpportunityCard } from '../components/OpportunityCard';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Opportunity } from '../types';

export function HomePage() {
  const { regions, categories, announcements, user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const loadOpportunities = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ opportunities: Opportunity[]; archivedCount: number }>(
        '/api/opportunities?sort=recently_verified'
      );
      setOpportunities(data.opportunities);
      setArchivedCount(data.archivedCount);
    } catch (err) {
      console.error('Failed loading opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOpportunities();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (selectedRegion) params.set('region', selectedRegion);
    navigate(`/internships?${params.toString()}`);
  };

  const handleToggleSave = async (id: number, currentlySaved: boolean) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSavingId(id);
    try {
      await apiFetch(`/api/opportunities/${id}/save`, {
        method: currentlySaved ? 'DELETE' : 'POST',
      });
      setOpportunities((prev) =>
        prev.map((o) => (o.id === id ? { ...o, isSaved: !currentlySaved } : o))
      );
    } finally {
      setSavingId(null);
    }
  };

  const closingSoon = opportunities.filter((o) => o.verification_status === 'Closing Soon');
  const recentlyVerified = opportunities.slice(0, 4);

  return (
    <div>
      {announcements.length > 0 && (
        <div className="bg-[#f4f6f9] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0 leading-relaxed">
              <span className="font-semibold text-[#0f294a]">{announcements[0].title}:</span>{' '}
              <span>{announcements[0].body}</span>
            </div>
            <Link
              to="/internships?includeArchived=true"
              className="text-[#0d9488] font-semibold hover:underline whitespace-nowrap inline-flex items-center min-h-[36px] sm:min-h-0 self-start sm:self-auto"
            >
              View expired archive ({archivedCount})
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-[#0f294a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-5 sm:space-y-6 min-w-0">
              <p className="text-xs font-medium tracking-wide uppercase text-teal-300">
                Ghana-Only Internship Registry · All 16 Administrative Regions
              </p>
              <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-balance">
                Find Internship Opportunities Across Ghana
              </h1>
              <p className="text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
                Explore internships physically hosted in Ghana, open to Ghana-based applicants, or verified remote-from-Ghana. Prepare stronger CVs and cover letters with private human document reviews.
              </p>

              {/* Search Bar */}
              <form
                onSubmit={handleSearch}
                className="bg-white rounded-xl p-2 grid grid-cols-1 sm:grid-cols-12 gap-2 text-slate-900 shadow-sm"
              >
                <div className="sm:col-span-6 flex items-center px-3 gap-2 min-h-[44px]">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Title, industry, skill, or org..."
                    aria-label="Search Ghana internships"
                    className="w-full py-2 text-base sm:text-sm bg-transparent focus:outline-none min-w-0"
                  />
                </div>
                <div className="sm:col-span-4 flex items-center px-3 border-t sm:border-t-0 sm:border-l border-slate-200 gap-2 min-h-[44px]">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    aria-label="Filter by Ghana region"
                    className="w-full py-2 text-base sm:text-sm bg-transparent focus:outline-none min-w-0"
                  >
                    <option value="">All 16 Regions + Multi-Region</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.slug}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg transition-colors whitespace-nowrap"
                  >
                    Search
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" aria-hidden="true" />
                  Verified Ghana-only eligibility
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" aria-hidden="true" />
                  Expired listings leave active views automatically
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[280px] rounded-xl overflow-hidden bg-[#173a66] border border-white/10 relative">
                <img
                  src="/src/assets/images/hero_ghana_interns_1795783952696.jpg"
                  alt="Young Ghanaian university students and software interns collaborating in an Accra workspace"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Verified Ghana Opportunities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0f294a]">
              Recently Verified Opportunities in Ghana
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Only active listings with confirmed Ghana eligibility appear here. Expired listings are automatically removed.
            </p>
          </div>
          <Link
            to="/internships"
            className="text-sm font-semibold text-[#0d9488] hover:text-[#0f766e] inline-flex items-center gap-1.5 whitespace-nowrap min-h-[44px] sm:min-h-0 self-start sm:self-auto"
          >
            Browse all active internships
            <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-52 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
            ))}
          </div>
        ) : recentlyVerified.length === 0 ? (
          <div className="p-8 rounded-xl border border-slate-200 bg-[#f4f6f9] text-center">
            <p className="text-sm text-slate-700">No active verified Ghana internships match right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {recentlyVerified.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onToggleSave={handleToggleSave}
                savingId={savingId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closing Soon Section */}
      {closingSoon.length > 0 && (
        <section className="bg-[#f4f6f9] border-y border-slate-200 py-10 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-[#0f294a]">Closing Soon (Within 7 Days)</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Submit your application on the official organization portal before the deadline passes.
                </p>
              </div>
              <Link
                to="/internships?sort=closing_soon"
                className="text-sm font-semibold text-[#0d9488] hover:underline whitespace-nowrap inline-flex items-center min-h-[44px] sm:min-h-0 self-start sm:self-auto"
              >
                Sort by deadline
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {closingSoon.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onToggleSave={handleToggleSave}
                  savingId={savingId}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 16 Regions & Industry Categories Quick Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10 sm:space-y-12">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0f294a]">
                Browse Across All 16 Regions of Ghana
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Filter directly by region or explore multi-region remote placements open across Ghana.
              </p>
            </div>
            <Link
              to="/regions"
              className="text-sm font-semibold text-[#0d9488] hover:underline whitespace-nowrap inline-flex items-center min-h-[44px] sm:min-h-0 self-start sm:self-auto"
            >
              All 16 regions
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {regions.slice(0, 12).map((r) => (
              <Link
                key={r.id}
                to={`/internships?region=${encodeURIComponent(r.slug)}`}
                className="p-3.5 min-h-[60px] rounded-xl border border-slate-200 bg-white hover:border-[#0d9488] transition-colors flex flex-col justify-between gap-1 min-w-0"
              >
                <span className="text-sm font-semibold text-[#0f294a] truncate">{r.name}</span>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {r.active_count} active
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6">
            <div className="min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0f294a]">Industry Categories</h2>
              <p className="text-sm text-slate-600 mt-1">
                From Software Development and Banking to Agriculture and Public Health.
              </p>
            </div>
            <Link
              to="/categories"
              className="text-sm font-semibold text-[#0d9488] hover:underline whitespace-nowrap inline-flex items-center min-h-[44px] sm:min-h-0 self-start sm:self-auto"
            >
              All {categories.length} categories
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                to={`/internships?category=${encodeURIComponent(c.slug)}`}
                className="p-4 min-h-[52px] rounded-xl border border-slate-200 bg-[#f4f6f9] hover:bg-white hover:border-[#0d9488] transition-colors flex items-center justify-between gap-2 min-w-0"
              >
                <span className="text-sm font-medium text-slate-900 truncate">{c.name}</span>
                <span className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
                  {c.active_count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Document Review Service Spotlight */}
      <section className="bg-[#f4f6f9] border-t border-slate-200 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-10 items-stretch bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto lg:min-h-[280px] bg-slate-100">
              <img
                src="/src/assets/images/feature_document_review_1795783953536.jpg"
                alt="Career reviewer annotating a CV and cover letter beside a laptop"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-7 p-5 sm:p-8 lg:p-10 flex flex-col justify-center space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#0d9488]">
                <FileCheck2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                Confidential Document Support
              </div>
              <h2 className="font-display text-xl sm:text-3xl font-bold text-[#0f294a] text-balance">
                Improve your CV and cover letter before you apply
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Upload PDF or DOCX documents into your private vault—never exposed in public URLs or browser storage. Request feedback from an authorized human reviewer with version history, side-by-side comparisons, and optional consented writing suggestions.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <Link
                  to="/documents"
                  className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg transition-colors"
                >
                  Open My Documents
                </Link>
                <Link
                  to="/register"
                  className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-[#0f294a] border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Create Free Applicant Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
