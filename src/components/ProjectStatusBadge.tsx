import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { ProjectStatusSummary } from '../lib/projectStatus';

interface ProjectStatusBadgeProps {
  status: ProjectStatusSummary;
  onClick: () => void;
}

export function ProjectStatusBadge({ status, onClick }: ProjectStatusBadgeProps) {
  const toneClasses =
    status.health === 'critical'
      ? 'border-red-200 bg-red-50/70 text-red-800 hover:bg-red-50'
      : status.health === 'attention'
      ? 'border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-50'
      : status.health === 'loading'
      ? 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
      : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100';

  const labelTone =
    status.health === 'critical'
      ? 'text-red-700'
      : status.health === 'attention'
      ? 'text-amber-700'
      : status.health === 'loading'
      ? 'text-slate-500'
      : 'text-emerald-700';

  const tooltip = [
    `Project Status: ${status.label} (${status.brief})`,
    status.lastUpdated ? `Summary updated: ${status.lastUpdated}` : null,
    status.summaryHeadline,
  ]
    .filter(Boolean)
    .join(' — ');

  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      data-testid="project-status-badge"
      data-status={status.health}
      aria-label={`Project Status: ${status.label}, ${status.brief}`}
      className={`inline-flex items-center gap-2 h-8 px-3 text-xs border rounded-lg transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${toneClasses}`}
    >
      {status.health === 'loading' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" aria-hidden="true" />
      ) : status.health === 'critical' ? (
        <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" aria-hidden="true" />
      ) : status.health === 'attention' ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" aria-hidden="true" />
      ) : (
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
      )}

      <span className="font-medium text-slate-500 hidden sm:inline">Project Status</span>
      <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
        ·
      </span>
      <span className={`font-semibold ${labelTone}`}>{status.label}</span>
      <span className="text-slate-300 hidden md:inline" aria-hidden="true">
        ·
      </span>
      <span className="font-mono tabular-nums text-slate-600 hidden md:inline">
        {status.brief}
      </span>
    </button>
  );
}
