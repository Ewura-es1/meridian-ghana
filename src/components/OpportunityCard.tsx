import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bookmark, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { Opportunity } from '../types';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onToggleSave?: (id: number, currentlySaved: boolean) => void;
  savingId?: number | null;
}

export function VerificationInlineStatus({ status }: { status: Opportunity['verification_status'] }) {
  if (status === 'Verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Verified
      </span>
    );
  }
  if (status === 'Closing Soon') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        Closing Soon
      </span>
    );
  }
  if (status === 'Pending Verification' || status === 'Source Unavailable') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {status}
    </span>
  );
}

export function OpportunityCard({ opportunity, onToggleSave, savingId }: OpportunityCardProps) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 flex flex-col justify-between gap-4 hover:border-[#0f294a]/40 transition-colors min-w-0">
      <div className="space-y-3 min-w-0">
        {/* Clean unboxed metadata kicker — zero static pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 min-w-0">
            <span className="font-medium text-[#0d9488]">{opportunity.category_name}</span>
            <span aria-hidden="true">·</span>
            <span>{opportunity.region_name}</span>
            <span aria-hidden="true">·</span>
            <span>{opportunity.work_arrangement}</span>
            {opportunity.is_demo === 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-semibold text-[#0f294a]">DEMO</span>
              </>
            )}
          </div>
          <VerificationInlineStatus status={opportunity.verification_status} />
        </div>

        <div className="min-w-0">
          <h3 className="font-display text-base sm:text-lg font-semibold text-[#0f294a] leading-snug break-words">
            <Link to={`/internships/${opportunity.id}`} className="hover:underline">
              {opportunity.title}
            </Link>
          </h3>
          <p className="text-sm font-medium text-slate-700 mt-1 break-words">{opportunity.organization_name}</p>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 break-words">
          {opportunity.description}
        </p>

        <p className="text-xs text-slate-500 leading-relaxed break-words">
          <span className="font-medium text-slate-700">Eligibility:</span>{' '}
          {opportunity.eligibility_requirements}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-500 font-mono tabular-nums space-y-0.5">
          <div>Deadline: {opportunity.deadline}</div>
          <div>
            Checked: {opportunity.last_verified_at ? opportunity.last_verified_at : 'Not yet verified'}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {onToggleSave && (
            <button
              type="button"
              disabled={savingId === opportunity.id}
              onClick={() => onToggleSave(opportunity.id, Boolean(opportunity.isSaved))}
              aria-label={opportunity.isSaved ? 'Remove from saved internships' : 'Save internship'}
              className={`flex-1 sm:flex-initial min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 ${
                opportunity.isSaved
                  ? 'bg-[#f0fdfa] border-[#0d9488] text-[#0f766e]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {opportunity.isSaved ? 'Saved' : 'Save'}
            </button>
          )}
          <Link
            to={`/internships/${opportunity.id}`}
            className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
