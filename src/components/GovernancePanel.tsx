import { RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { TaskCompletionStats } from '../lib/projectStatus';
import type { AuditReport } from '../types/memory';

interface GovernancePanelProps {
  audit: AuditReport | null;
  taskCompletion: TaskCompletionStats;
  isAuditing: boolean;
  lastSummaryDate: string | null;
  onRunAudit: () => void;
  onOpenFileByPath: (relativePath: string) => void;
}

export function GovernancePanel({
  audit,
  taskCompletion,
  isAuditing,
  lastSummaryDate,
  onRunAudit,
  onOpenFileByPath,
}: GovernancePanelProps) {
  const secretCount = audit?.secretFindings.length ?? 0;
  const obsoleteCount = audit?.obsoleteFindings.length ?? 0;
  const issueCount = audit?.validationIssues.length ?? 0;
  const barFillColor =
    taskCompletion.totalTasks > 0 && taskCompletion.completionPercent === 100
      ? 'bg-emerald-600'
      : 'bg-blue-600';

  return (
    <section aria-label="Governance and maintenance tools" className="space-y-6">
      {/* Summary & Action Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">
              Governance &amp; Maintenance · Read-only audits plus explicit summary refresh
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">
              Memory Health &amp; Governance
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Run real-time checks equivalent to the Python CLI tools for secret detection, obsolete entry discovery, line-budget validation, and rolling summary updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onRunAudit}
              disabled={isAuditing}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isAuditing ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isAuditing ? 'Running audit...' : 'Run Full Audit'}
            </button>
          </div>
        </div>

        {/* Clean horizontal metric strip with hairline dividers (no nested cards) */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-500">Secret Scan (govern_memory)</p>
            <p className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${secretCount === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {audit ? `${secretCount} warnings` : '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {secretCount === 0 ? 'No credentials or keys detected' : 'Immediate redaction required'}
            </p>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <p className="text-xs text-slate-500">Obsolete Entries (cleanup_memory)</p>
            <p className="mt-1 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {audit ? `${obsoleteCount} found` : '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Read-only report; active decisions require approval
            </p>
          </div>

          <div className="sm:border-l sm:border-slate-200 sm:pl-6">
            <p className="text-xs text-slate-500">Schema &amp; Line Budgets (validate_memory)</p>
            <p className={`mt-1 text-2xl font-semibold font-mono tabular-nums ${issueCount === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {audit ? `${issueCount} issues` : '—'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {lastSummaryDate
                ? `Summary refreshed on ${lastSummaryDate}`
                : 'Checks 100/150 line caps and required fields'}
            </p>
          </div>
        </div>

        {/* Workspace Task Completion Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Task Completion Progress</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {taskCompletion.totalTasks === 0
                  ? 'No workspace tasks recorded in open-tasks.md yet.'
                  : `${taskCompletion.openTasks} active ${
                      taskCompletion.openTasks === 1 ? 'task' : 'tasks'
                    } remaining across ${taskCompletion.totalTasks} total.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                {taskCompletion.completedTasks}/{taskCompletion.totalTasks} completed ·{' '}
                {taskCompletion.completionPercent}%
              </span>
              <button
                type="button"
                onClick={() => onOpenFileByPath('memory/open-tasks.md')}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap shrink-0"
              >
                View open-tasks.md
              </button>
            </div>
          </div>

          <div
            role="progressbar"
            aria-label="Workspace task completion"
            aria-valuenow={taskCompletion.completionPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            data-testid="task-completion-progress"
            className="mt-3 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-200 ${barFillColor}`}
              style={{ width: `${taskCompletion.completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detailed Audit Results Table */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {/* Secret Findings */}
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-slate-900">Secret Governance Audit</h3>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {audit ? `${audit.scannedFiles} files scanned` : 'Pending'}
            </span>
          </div>
          {!audit || audit.secretFindings.length === 0 ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Passed — no API keys, passwords, tokens, or private keys found.</span>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {audit.secretFindings.map((finding, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      {finding.ruleName} in{' '}
                      <button
                        type="button"
                        onClick={() => onOpenFileByPath(finding.relativePath)}
                        className="font-mono underline hover:text-red-900"
                      >
                        {finding.relativePath}:{finding.lineNumber}
                      </button>
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">Content redacted</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Obsolete Entries */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-900">Obsolete Entries Report</h3>
          {!audit || audit.obsoleteFindings.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              No entries marked <span className="font-mono text-xs">- Status: obsolete</span> across memory files.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {audit.obsoleteFindings.map((item, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <span className="text-slate-800">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => onOpenFileByPath(item.relativePath)}
                    className="font-mono text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    {item.relativePath}:{item.lineNumber}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Validation Issues */}
        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-900">Schema &amp; Budget Compliance</h3>
          {!audit || audit.validationIssues.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">
              All memory files satisfy the 100/150 line budget, unique titles, and required entry schema.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {audit.validationIssues.map((issue, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <span className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                    {issue.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenFileByPath(issue.relativePath)}
                    className="font-mono text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    {issue.relativePath}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
