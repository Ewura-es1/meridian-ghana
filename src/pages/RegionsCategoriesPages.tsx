import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function RegionsPage() {
  const { regions } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-2xl mb-6 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
          All 16 Administrative Regions of Ghana
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
          Browse verified internships physically located across Ghana's 16 regions, plus multi-region placements open to applicants residing anywhere in Ghana.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {regions.map((region) => (
          <Link
            key={region.id}
            to={`/internships?region=${encodeURIComponent(region.slug)}`}
            className="bg-white border border-slate-200 hover:border-[#0d9488] rounded-xl p-4 sm:p-5 min-h-[68px] flex items-center justify-between gap-4 transition-colors"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-[#0f294a] font-display font-semibold text-base">
                <MapPin className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                <span className="truncate">{region.name}</span>
              </div>
              <p className="text-xs text-slate-500">
                {region.is_multi_region ? 'Nationwide remote / multi-city' : `Regional Capital: ${region.capital}`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono tabular-nums text-sm font-semibold text-[#0f294a]">
                {region.active_count}
              </div>
              <div className="text-xs text-slate-500">active</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CategoriesPage() {
  const { categories } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-2xl mb-6 sm:mb-10">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
          Ghana Internship Industry Categories
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
          Explore active verified opportunities across 20+ sectors in Ghana—from Software Development and Engineering to Banking, Healthcare, and Agriculture.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/internships?category=${encodeURIComponent(cat.slug)}`}
            className="bg-white border border-slate-200 hover:border-[#0d9488] rounded-xl p-4 sm:p-5 min-h-[60px] flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Briefcase className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
              <span className="font-medium text-slate-900 truncate">{cat.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono tabular-nums text-xs text-slate-600">
                {cat.active_count} active
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
