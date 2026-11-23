import { useEffect, useRef, useState } from 'react';
import { Search, X, ArrowUpRight, History } from 'lucide-react';
import {
  addRecentSearch,
  loadRecentSearches,
  saveRecentSearches,
} from '../lib/searchHistory';
import type { SearchFinding } from '../types/memory';
import { HighlightText } from './HighlightText';

interface MemorySearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  findings: SearchFinding[];
  isSearching: boolean;
  onSelectFinding: (fileId: string, lineNumber: number) => void;
}

export function MemorySearchBar({
  query,
  onQueryChange,
  findings,
  isSearching,
  onSelectFinding,
}: MemorySearchBarProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();

  const recordSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = addRecentSearch(prev, clean);
      saveRecentSearches(next);
      return next;
    });
  };

  // Record settled queries automatically after a brief typing pause
  useEffect(() => {
    if (trimmed.length < 2) return;
    const timer = window.setTimeout(() => {
      recordSearch(trimmed);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  const handleRerunSearch = (pastQuery: string) => {
    recordSearch(pastQuery);
    onQueryChange(pastQuery);
    inputRef.current?.focus();
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  return (
    <section aria-label="Search memory files" className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          recordSearch(query);
        }}
        className="relative"
      >
        <label htmlFor="memory-search-input" className="sr-only">
          Search memory markdown files
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
        />
        <input
          ref={inputRef}
          id="memory-search-input"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search memory markdown files (e.g., hook, portability, policy, git)..."
          className="w-full h-11 pl-10 pr-36 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-colors"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {trimmed && (
            <span className="text-xs font-mono tabular-nums text-slate-500 whitespace-nowrap">
              {isSearching ? 'Searching...' : `${findings.length} match${findings.length === 1 ? '' : 'es'}`}
            </span>
          )}
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search query"
              className="p-1 text-slate-400 hover:text-slate-700 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {/* Last 5 search queries bar */}
      {recentSearches.length > 0 && (
        <div
          aria-label="Recent searches"
          className="mt-2.5 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 mr-1 whitespace-nowrap">
              <History className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              Recent
            </span>
            {recentSearches.map((item) => {
              const isActive = item.toLowerCase() === trimmed.toLowerCase();
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleRerunSearch(item)}
                  aria-label={`Re-run search: ${item}`}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    isActive
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:underline"
          >
            Clear history
          </button>
        </div>
      )}

      {trimmed && (
        <div
          aria-live="polite"
          className="mt-3 bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
            <h2 className="text-xs font-semibold text-slate-700">
              Search Findings for “{trimmed}”
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {findings.length} {findings.length === 1 ? 'result' : 'results'}
            </span>
          </div>

          {findings.length === 0 && !isSearching ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No matching passages found in memory files.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try broader terms such as “memory”, “hook”, “decisions”, or “obsolete”.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {findings.map((finding) => (
                <li key={finding.id}>
                  <button
                    type="button"
                    onClick={() => {
                      recordSearch(trimmed);
                      onSelectFinding(finding.fileId, finding.lineNumber);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:bg-blue-50/60"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                        <span className="font-mono font-medium text-slate-900">
                          {finding.relativePath}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Line {finding.lineNumber}</span>
                        {finding.entryTitle && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate text-slate-600">{finding.entryTitle}</span>
                          </>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 whitespace-nowrap shrink-0">
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    </div>

                    <div className="mt-2 font-mono text-xs leading-relaxed space-y-0.5 text-slate-600">
                      {finding.snippet.map((line) => (
                        <div
                          key={line.lineNumber}
                          className={`flex gap-3 px-2 py-0.5 rounded-xs ${
                            line.isMatch ? 'bg-amber-50/80 text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          <span className="w-8 text-right tabular-nums select-none shrink-0 text-slate-400">
                            {line.lineNumber}
                          </span>
                          <span className="break-words min-w-0">
                            <HighlightText text={line.text || ' '} query={trimmed} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
