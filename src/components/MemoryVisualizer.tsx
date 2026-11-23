import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { MemoryEntry, MemoryFileRecord, MemoryWorkspacePayload } from '../types/memory';
import { HighlightText } from './HighlightText';

interface MemoryVisualizerProps {
  /** Optional externally loaded workspace; when omitted, component fetches /api/memory/files directly. */
  workspace?: MemoryWorkspacePayload | null;
  selectedFileId: string;
  onSelectFile: (fileId: string) => void;
  searchQuery: string;
  highlightedLine: number | null;
  onRefreshRequested?: () => void;
}

type ViewMode = 'formatted' | 'raw';
type StatusFilter = 'all' | 'active' | 'obsolete';
type PriorityFilter = 'all' | 'critical' | 'high' | 'normal' | 'low';

function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'text-red-700 font-semibold';
    case 'high':
      return 'text-amber-700 font-medium';
    case 'normal':
      return 'text-slate-700';
    default:
      return 'text-slate-500';
  }
}

function statusColor(status: string): string {
  return status === 'active' ? 'text-emerald-700 font-medium' : 'text-slate-500';
}

function renderFormattedMarkdown(content: string, query: string) {
  const lines = content.split(/\r?\n/);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" aria-hidden="true" />;
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h3 key={idx} className="text-lg font-semibold text-slate-900 pt-1">
              <HighlightText text={trimmed.slice(2)} query={query} />
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-slate-900 pt-4 pb-1 border-b border-slate-100">
              <HighlightText text={trimmed.slice(3)} query={query} />
            </h4>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={idx} className="text-sm font-semibold text-slate-800 pt-2">
              <HighlightText text={trimmed.slice(4)} query={query} />
            </h5>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-2.5 pl-1">
              <span aria-hidden="true" className="text-slate-400 select-none">
                –
              </span>
              <p className="min-w-0">
                <HighlightText text={trimmed.slice(2)} query={query} />
              </p>
            </div>
          );
        }
        if (trimmed.startsWith('-> ')) {
          return (
            <div key={idx} className="flex gap-2 pl-4 text-xs font-mono text-slate-600">
              <span aria-hidden="true" className="text-blue-600 select-none">
                →
              </span>
              <span>
                <HighlightText text={trimmed.slice(3)} query={query} />
              </span>
            </div>
          );
        }
        return (
          <p key={idx}>
            <HighlightText text={trimmed} query={query} />
          </p>
        );
      })}
    </div>
  );
}

export function MemoryVisualizer({
  workspace: externalWorkspace,
  selectedFileId,
  onSelectFile,
  searchQuery,
  highlightedLine,
  onRefreshRequested,
}: MemoryVisualizerProps) {
  const [internalWorkspace, setInternalWorkspace] = useState<MemoryWorkspacePayload | null>(null);
  const [loading, setLoading] = useState<boolean>(!externalWorkspace);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');

  const fetchDirectly = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/memory/files');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload: MemoryWorkspacePayload = await response.json();
      setInternalWorkspace(payload);
    } catch {
      setError('Unable to load memory files from the workspace server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalWorkspace === undefined) {
      fetchDirectly();
    } else {
      setLoading(false);
    }
  }, [externalWorkspace]);

  const workspace = externalWorkspace !== undefined ? externalWorkspace : internalWorkspace;

  const activeFile: MemoryFileRecord | undefined = useMemo(() => {
    if (!workspace?.files.length) return undefined;
    return workspace.files.find((f) => f.id === selectedFileId) ?? workspace.files[0];
  }, [workspace, selectedFileId]);

  const filteredEntries: MemoryEntry[] = useMemo(() => {
    if (!activeFile) return [];
    return activeFile.entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && entry.priority !== priorityFilter) return false;
      return true;
    });
  }, [activeFile, statusFilter, priorityFilter]);

  useEffect(() => {
    if (highlightedLine && activeFile) {
      setViewMode('raw');
    }
  }, [highlightedLine, activeFile?.id]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4" aria-busy="true">
        <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
        <div className="space-y-3 pt-4">
          <div className="h-20 bg-slate-50 border border-slate-100 rounded animate-pulse" />
          <div className="h-20 bg-slate-50 border border-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !workspace || !activeFile) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm font-medium text-slate-900">
          {error || 'No memory files were found in gemini-memory-kit.'}
        </p>
        <button
          type="button"
          onClick={() => (onRefreshRequested ? onRefreshRequested() : fetchDirectly())}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry loading files
        </button>
      </div>
    );
  }

  const budgetPercent = Math.min(100, Math.round((activeFile.lineCount / activeFile.lineBudget) * 100));
  const budgetHealthy = activeFile.lineCount < activeFile.lineBudget;
  const hasStructuredEntries = activeFile.entries.length > 0;

  return (
    <section aria-label="Project knowledge visualizer" className="space-y-6">
      {/* Compact file selector strip for narrow screens */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1">
        {workspace.files.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              file.id === activeFile.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {file.name}
          </button>
        ))}
      </div>

      {/* Main document surface */}
      <article className="bg-white border border-slate-200 rounded-lg">
        {/* Document header */}
        <header className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-slate-600">
                gemini-memory-kit/{activeFile.relativePath}
              </span>
              <span aria-hidden="true">·</span>
              <span className={`font-mono tabular-nums ${budgetHealthy ? 'text-slate-600' : 'text-red-700 font-medium'}`}>
                {activeFile.lineCount} / {activeFile.lineBudget} lines ({budgetPercent}%)
              </span>
              {hasStructuredEntries && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {activeFile.entries.length} {activeFile.entries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </>
              )}
            </div>
            <h2 className="mt-1.5 text-xl font-semibold text-slate-900 tracking-tight">
              {activeFile.name}
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">{activeFile.description}</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start shrink-0" role="tablist" aria-label="Document view mode">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'formatted'}
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'formatted'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Structured
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'raw'}
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Markdown
            </button>
          </div>
        </header>

        {/* Interactive filter bar for structured memory entries */}
        {viewMode === 'formatted' && hasStructuredEntries && (
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter by status">
              {(['all', 'active', 'obsolete'] as StatusFilter[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === status
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" role="group" aria-label="Filter by priority">
              {(['all', 'critical', 'high', 'normal', 'low'] as PriorityFilter[]).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setPriorityFilter(priority)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                    priorityFilter === priority
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document body */}
        <div className="px-6 py-5">
          {viewMode === 'raw' ? (
            <div className="overflow-x-auto font-mono text-xs leading-6 text-slate-800">
              {activeFile.content.split(/\r?\n/).map((line, index) => {
                const lineNum = index + 1;
                const isTarget = highlightedLine === lineNum;
                return (
                  <div
                    key={lineNum}
                    className={`flex gap-4 px-2 rounded-xs ${
                      isTarget ? 'bg-blue-50 text-slate-950' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-8 text-right tabular-nums text-slate-400 select-none shrink-0">
                      {lineNum}
                    </span>
                    <span className="whitespace-pre-wrap break-words min-w-0">
                      <HighlightText text={line || ' '} query={searchQuery} />
                    </span>
                  </div>
                );
              })}
            </div>
          ) : hasStructuredEntries ? (
            filteredEntries.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm font-medium text-slate-700">
                  No entries match the current status and priority filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}
                  className="mt-3 px-3.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-slate-200 rounded-md bg-white transition-colors"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredEntries.map((entry) => (
                  <div key={entry.id} className="py-5 first:pt-1 last:pb-1">
                    {/* Clean unboxed metadata row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums text-slate-600">{entry.date}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{entry.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`capitalize ${statusColor(entry.status)}`}>
                        Status: {entry.status}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={`capitalize ${priorityColor(entry.priority)}`}>
                        Priority: {entry.priority}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">
                        {entry.source} ({entry.confidence})
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-base font-semibold text-slate-900">
                      <HighlightText text={entry.title} query={searchQuery} />
                    </h3>

                    <dl className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Details</dt>
                        <dd className="mt-0.5 text-slate-700 leading-relaxed">
                          <HighlightText text={entry.details} query={searchQuery} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Reason</dt>
                        <dd className="mt-0.5 text-slate-700 leading-relaxed">
                          <HighlightText text={entry.reason} query={searchQuery} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Related files</dt>
                        <dd className="mt-0.5 font-mono text-xs text-slate-600 break-words">
                          <HighlightText
                            text={entry.relatedFiles.join(', ') || 'None'}
                            query={searchQuery}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-slate-500">Next action</dt>
                        <dd className="mt-0.5 text-slate-700">
                          <HighlightText text={entry.nextAction} query={searchQuery} />
                        </dd>
                      </div>
                    </dl>

                    {entry.tags.length > 0 && (
                      <div className="mt-3 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">Tags: </span>
                        <HighlightText text={entry.tags.join(' · ')} query={searchQuery} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            renderFormattedMarkdown(activeFile.content, searchQuery)
          )}
        </div>
      </article>
    </section>
  );
}
