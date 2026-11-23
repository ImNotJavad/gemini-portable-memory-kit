import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, GitBranch, Shield, RefreshCw, Menu, X } from 'lucide-react';
import { searchMemoryFiles } from './lib/memoryParser';
import { computeTaskCompletion } from './lib/projectStatus';
import { useProjectStatus } from './hooks/useProjectStatus';
import type { AuditReport, MemoryWorkspacePayload, SearchFinding } from './types/memory';
import { MemorySearchBar } from './components/MemorySearchBar';
import { MemoryVisualizer } from './components/MemoryVisualizer';
import { RelationshipGraphView } from './components/RelationshipGraphView';
import { GovernancePanel } from './components/GovernancePanel';
import { ProjectStatusBadge } from './components/ProjectStatusBadge';

type ActiveSection = 'explorer' | 'graph' | 'governance';

export default function App() {
  const [workspace, setWorkspace] = useState<MemoryWorkspacePayload | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [activeSection, setActiveSection] = useState<ActiveSection>('explorer');
  const [selectedFileId, setSelectedFileId] = useState<string>('agent-memory');
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [serverFindings, setServerFindings] = useState<SearchFinding[] | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [lastSummaryDate, setLastSummaryDate] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/memory/files');
      if (!res.ok) throw new Error('Failed to load workspace');
      const data: MemoryWorkspacePayload = await res.json();
      setWorkspace(data);
    } catch {
      setStatusNotice('Could not reach the memory API server.');
    }
  }, []);

  const runAudit = useCallback(async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/memory/audit');
      if (!res.ok) throw new Error('Audit failed');
      const data: AuditReport = await res.json();
      setAudit(data);
    } catch {
      setStatusNotice('Governance audit request failed.');
    } finally {
      setIsAuditing(false);
    }
  }, []);

  const handleRegenerateSummary = useCallback(async () => {
    setIsSummarizing(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/memory/summarize', { method: 'POST' });
      if (!res.ok) throw new Error('Summarize failed');
      const data: { updatedAt: string; workspace: MemoryWorkspacePayload } = await res.json();
      setWorkspace(data.workspace);
      setLastSummaryDate(data.updatedAt);
      setStatusNotice(`Updated summaries.md on ${data.updatedAt}.`);
      await runAudit();
    } catch {
      setStatusNotice('Failed to regenerate rolling summary.');
    } finally {
      setIsSummarizing(false);
    }
  }, [runAudit]);

  useEffect(() => {
    loadWorkspace();
    runAudit();
  }, [loadWorkspace, runAudit]);

  // Query backend /api/memory/search with clean abort handling
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setServerFindings(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/memory/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const payload: { query: string; findings: SearchFinding[] } = await res.json();
        setServerFindings(payload.findings);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setServerFindings(null);
        }
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  // Instant client-side findings while server response settles
  const instantFindings = useMemo(() => {
    if (!workspace || !searchQuery.trim()) return [];
    const searchable = workspace.files.filter((f) => f.category === 'memory' || f.category === 'index');
    return searchMemoryFiles(searchable, searchQuery, 1);
  }, [workspace, searchQuery]);

  const displayedFindings = serverFindings ?? instantFindings;
  const { status: projectStatus } = useProjectStatus(workspace, audit);
  const taskCompletion = useMemo(() => computeTaskCompletion(workspace), [workspace]);

  const handleSelectFinding = (fileId: string, lineNumber: number) => {
    setSelectedFileId(fileId);
    setHighlightedLine(lineNumber);
    setActiveSection('explorer');
  };

  const matchMemoryFileByPath = (pathStr: string) => {
    if (!workspace) return undefined;
    const normalized = pathStr.replace(/^gemini-memory-kit\//, '').trim();
    return workspace.files.find(
      (f) => f.relativePath === normalized || f.name === normalized
    );
  };

  const canOpenFileByPath = (pathStr: string) => Boolean(matchMemoryFileByPath(pathStr));

  const handleOpenFileByPath = (pathStr: string) => {
    const matched = matchMemoryFileByPath(pathStr);
    if (matched) {
      setSelectedFileId(matched.id);
      setHighlightedLine(null);
      setActiveSection('explorer');
    }
  };

  const selectedFile = workspace?.files.find((f) => f.id === selectedFileId);
  const breadcrumbTail =
    activeSection === 'explorer'
      ? selectedFile?.name ?? 'Files'
      : activeSection === 'graph'
      ? 'Relationship Graph'
      : 'Governance';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (260px) */}
      <aside
        aria-label="Memory workspace navigation"
        className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200"
      >
        <div className="h-14 px-5 flex items-center border-b border-slate-200">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Memory Kit Studio
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-2.5 text-xs font-medium text-slate-500">Views</p>
            <div className="mt-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => setActiveSection('explorer')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSection === 'explorer'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                Knowledge Explorer
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('graph')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSection === 'graph'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <GitBranch className="h-4 w-4 shrink-0" aria-hidden="true" />
                Relationship Graph
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('governance')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeSection === 'governance'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
                Governance &amp; Health
              </button>
            </div>
          </div>

          <div>
            <div className="px-2.5 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Memory Files</p>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {workspace?.files.length ?? 0}
              </span>
            </div>
            <ul className="mt-1.5 space-y-0.5">
              {(workspace?.files ?? []).map((file) => {
                const isSelected = activeSection === 'explorer' && selectedFileId === file.id;
                return (
                  <li key={file.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFileId(file.id);
                        setHighlightedLine(null);
                        setActiveSection('explorer');
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-mono truncate">{file.name}</span>
                      <span className="font-mono tabular-nums text-slate-400 shrink-0">
                        {file.lineCount}/{file.lineBudget}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/30"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-white border-r border-slate-200 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Memory Kit Studio
              </span>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {(
                [
                  ['explorer', 'Knowledge Explorer'],
                  ['graph', 'Relationship Graph'],
                  ['governance', 'Governance & Health'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveSection(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md ${
                    activeSection === id ? 'bg-slate-100 text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Persistent Top Bar: Breadcrumb on left, Refresh + Project Status badge on top right */}
        <header className="sticky top-0 z-20 h-14 px-4 sm:px-8 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-900 whitespace-nowrap">Memory Kit</span>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-600 truncate">{breadcrumbTail}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRegenerateSummary}
              disabled={isSummarizing}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSummarizing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="hidden sm:inline">
                {isSummarizing ? 'Refreshing...' : 'Refresh Summary'}
              </span>
              <span className="sm:hidden">{isSummarizing ? '...' : 'Refresh'}</span>
            </button>

            <ProjectStatusBadge
              status={projectStatus}
              onClick={() => setActiveSection('governance')}
            />
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto space-y-6">
          {/* Top Overview Strip */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
                Project Knowledge Base
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono tabular-nums">
                  {workspace?.stats.totalFiles ?? 0} Markdown files
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {workspace?.stats.activeDecisions ?? 0}{' '}
                  {(workspace?.stats.activeDecisions ?? 0) === 1 ? 'active decision' : 'active decisions'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {workspace?.stats.openTasks ?? 0}{' '}
                  {(workspace?.stats.openTasks ?? 0) === 1 ? 'open task' : 'open tasks'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {workspace?.relations.length ?? 0}{' '}
                  {(workspace?.relations.length ?? 0) === 1 ? 'graph link' : 'graph links'}
                </span>
              </div>
            </div>

            {statusNotice && (
              <p role="status" className="text-xs font-medium text-blue-700">
                {statusNotice}
              </p>
            )}
          </div>

          {/* Search Input + Highlighted Findings */}
          <MemorySearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            findings={displayedFindings}
            isSearching={isSearching}
            onSelectFinding={handleSelectFinding}
          />

          {/* Active Workspace View */}
          {activeSection === 'explorer' && (
            <MemoryVisualizer
              workspace={workspace}
              selectedFileId={selectedFileId}
              onSelectFile={(id) => {
                setSelectedFileId(id);
                setHighlightedLine(null);
              }}
              searchQuery={searchQuery}
              highlightedLine={highlightedLine}
              onRefreshRequested={loadWorkspace}
            />
          )}

          {activeSection === 'graph' && (
            <RelationshipGraphView
              relations={workspace?.relations ?? []}
              searchQuery={searchQuery}
              canOpenRelatedFile={canOpenFileByPath}
              onOpenRelatedFile={handleOpenFileByPath}
            />
          )}

          {activeSection === 'governance' && (
            <GovernancePanel
              audit={audit}
              taskCompletion={taskCompletion}
              isAuditing={isAuditing}
              lastSummaryDate={lastSummaryDate}
              onRunAudit={runAudit}
              onOpenFileByPath={handleOpenFileByPath}
            />
          )}
        </main>
      </div>
    </div>
  );
}
