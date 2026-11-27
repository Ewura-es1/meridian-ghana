import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { OpportunityCard } from '../components/OpportunityCard';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { Opportunity } from '../types';

export function InternshipsPage() {
  const { regions, categories, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [q, setQ] = useState(searchParams.get('q') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [organization, setOrganization] = useState(searchParams.get('organization') || '');
  const [workArrangement, setWorkArrangement] = useState(searchParams.get('workArrangement') || '');
  const [qualification, setQualification] = useState(searchParams.get('qualification') || '');
  const [deadlineBefore, setDeadlineBefore] = useState(searchParams.get('deadlineBefore') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'recently_verified');
  const [includeArchived, setIncludeArchived] = useState(searchParams.get('includeArchived') === 'true');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [archivedCount, setArchivedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const activeFilterCount = [
    region,
    city.trim(),
    category,
    organization.trim(),
    workArrangement,
    qualification.trim(),
    deadlineBefore,
    includeArchived ? '1' : '',
  ].filter(Boolean).length;

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (region) params.set('region', region);
      if (city.trim()) params.set('city', city.trim());
      if (category) params.set('category', category);
      if (organization.trim()) params.set('organization', organization.trim());
      if (workArrangement) params.set('workArrangement', workArrangement);
      if (qualification.trim()) params.set('qualification', qualification.trim());
      if (deadlineBefore) params.set('deadlineBefore', deadlineBefore);
      if (sort) params.set('sort', sort);
      if (includeArchived) params.set('includeArchived', 'true');

      const data = await apiFetch<{ opportunities: Opportunity[]; archivedCount: number }>(
        `/api/opportunities?${params.toString()}`
      );
      setOpportunities(data.opportunities);
      setArchivedCount(data.archivedCount);
    } catch (err) {
      console.error('Failed to search opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [
    q,
    region,
    city,
    category,
    organization,
    workArrangement,
    qualification,
    deadlineBefore,
    sort,
    includeArchived,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList, user]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (region) next.set('region', region);
    if (city.trim()) next.set('city', city.trim());
    if (category) next.set('category', category);
    if (organization.trim()) next.set('organization', organization.trim());
    if (workArrangement) next.set('workArrangement', workArrangement);
    if (qualification.trim()) next.set('qualification', qualification.trim());
    if (deadlineBefore) next.set('deadlineBefore', deadlineBefore);
    if (sort && sort !== 'recently_verified') next.set('sort', sort);
    if (includeArchived) next.set('includeArchived', 'true');
    setSearchParams(next, { replace: true });
  }, [
    q,
    region,
    city,
    category,
    organization,
    workArrangement,
    qualification,
    deadlineBefore,
    sort,
    includeArchived,
    setSearchParams,
  ]);

  const handleReset = () => {
    setQ('');
    setRegion('');
    setCity('');
    setCategory('');
    setOrganization('');
    setWorkArrangement('');
    setQualification('');
    setDeadlineBefore('');
    setSort('recently_verified');
    setIncludeArchived(false);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
          Find Verified Internships in Ghana
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
          Every listing shown in the active registry is verified to take place in Ghana or accept Ghana-based applicants. Expired and closed listings are automatically excluded from active search results.
        </p>
      </div>

      {/* Mobile Search & Filter Bar (< lg) */}
      <div className="lg:hidden mb-5 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" aria-hidden="true" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, skill, organization..."
            aria-label="Search Ghana internships"
            className="w-full min-h-[44px] pl-10 pr-3 py-2 text-base bg-white border border-slate-300 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            aria-expanded={mobileFiltersOpen}
            className="flex-1 min-h-[44px] px-4 py-2 text-sm font-semibold text-[#0f294a] bg-[#f4f6f9] border border-slate-300 rounded-xl inline-flex items-center justify-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#0d9488]" aria-hidden="true" />
            {mobileFiltersOpen ? 'Hide Filters' : 'Filter Opportunities'}
            {activeFilterCount > 0 && (
              <span className="font-mono text-xs text-[#0d9488] font-bold">({activeFilterCount})</span>
            )}
          </button>
          {(activeFilterCount > 0 || q.trim()) && (
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] px-3.5 py-2 text-sm font-medium text-[#0d9488] bg-white border border-slate-300 rounded-xl inline-flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Filter Sidebar */}
        <aside
          className={`${
            mobileFiltersOpen ? 'block' : 'hidden'
          } lg:block lg:col-span-4 xl:col-span-3 space-y-5 bg-[#f4f6f9] border border-slate-200 rounded-xl p-4 sm:p-5 h-fit`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-display text-sm font-bold text-[#0f294a] inline-flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0d9488]" aria-hidden="true" />
              Filter Opportunities
            </h2>
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[36px] px-2 text-xs font-medium text-[#0d9488] hover:underline inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            <div className="hidden lg:block">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Keyword</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" aria-hidden="true" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Title, skill, topic..."
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghana Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="">All 16 Regions + Multi-Region</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City or District</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Accra, Kumasi, Tamale"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Industry Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Work Arrangement</label>
              <select
                value={workArrangement}
                onChange={(e) => setWorkArrangement(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="">Any Arrangement</option>
                <option value="On-site">On-site (Ghana)</option>
                <option value="Hybrid">Hybrid (Ghana)</option>
                <option value="Remote (Ghana Residents)">Remote (Ghana Residents)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Organization name..."
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qualification / Level</label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. BSc, HND, Diploma"
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline On or Before</label>
              <input
                type="date"
                value={deadlineBefore}
                onChange={(e) => setDeadlineBefore(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-base sm:text-sm bg-white border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="flex items-start gap-3 py-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0d9488] shrink-0"
                />
                <span>
                  Include expired & closed archive ({archivedCount})
                  <span className="block text-slate-500 mt-0.5">
                    By default, expired listings leave the active discovery view.
                  </span>
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="lg:hidden w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-[#0f294a] rounded-lg"
            >
              Show {opportunities.length} Result{opportunities.length === 1 ? '' : 's'}
            </button>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <p className="text-sm text-slate-700 font-mono tabular-nums">
              {loading
                ? 'Searching verified Ghana listings...'
                : `${opportunities.length} ${includeArchived ? 'total' : 'active'} Ghana internship${
                    opportunities.length === 1 ? '' : 's'
                  }`}
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label htmlFor="sort-select" className="text-xs font-medium text-slate-600 shrink-0">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="flex-1 sm:flex-initial min-h-[44px] px-3 py-1.5 text-base sm:text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="recently_verified">Recently Verified</option>
                <option value="closing_soon">Closing Soon</option>
                <option value="newest">Newest Added</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-52 rounded-xl border border-slate-200 bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 sm:p-10 rounded-xl border border-slate-200 bg-[#f4f6f9] text-center space-y-3">
              <p className="text-base font-semibold text-[#0f294a]">No matching Ghana internships found</p>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try clearing one or more filters or broadening your region selection to Multi-Region (Across Ghana).
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="min-h-[44px] px-5 py-2 text-sm font-medium text-white bg-[#0f294a] rounded-lg hover:bg-[#173a66]"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onToggleSave={handleToggleSave}
                  savingId={savingId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
