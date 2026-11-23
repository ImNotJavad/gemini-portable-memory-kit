import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { GraphRelation } from '../types/memory';
import { HighlightText } from './HighlightText';

interface RelationshipGraphViewProps {
  relations: GraphRelation[];
  searchQuery: string;
  canOpenRelatedFile: (relatedFilePath: string) => boolean;
  onOpenRelatedFile: (relatedFilePath: string) => void;
}

export function RelationshipGraphView({
  relations,
  searchQuery,
  canOpenRelatedFile,
  onOpenRelatedFile,
}: RelationshipGraphViewProps) {
  const [kindFilter, setKindFilter] = useState<string>('all');

  const kinds = useMemo(() => {
    const unique = Array.from(new Set(relations.map((r) => r.kind)));
    return ['all', ...unique];
  }, [relations]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return relations.filter((rel) => {
      if (kindFilter !== 'all' && rel.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        rel.title.toLowerCase().includes(q) ||
        rel.affects.toLowerCase().includes(q) ||
        rel.replaces.toLowerCase().includes(q) ||
        rel.relatedFile.toLowerCase().includes(q)
      );
    });
  }, [relations, kindFilter, searchQuery]);

  return (
    <section aria-label="Memory relationship graph" className="bg-white border border-slate-200 rounded-lg">
      <header className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500">
            gemini-memory-kit/memory/graph.md · {filtered.length} directed link{filtered.length === 1 ? '' : 's'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900 tracking-tight">
            Relationship Graph
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Directed map connecting durable decisions and lessons to affected areas, replaced approaches, and source files.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start shrink-0" role="group" aria-label="Filter graph nodes by kind">
          {kinds.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setKindFilter(kind)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                kindFilter === kind
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {kind}
            </button>
          ))}
        </div>
      </header>

      <div className="px-6 py-5">
        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No relationship entries match the active filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((rel) => (
              <div key={rel.id} className="py-5 first:pt-1 last:pb-1">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  {/* Source node */}
                  <div className="lg:col-span-4">
                    <div className="text-xs text-slate-500">
                      <span className="font-medium text-blue-700">{rel.kind}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">Line {rel.lineNumber}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 leading-snug">
                      <HighlightText text={rel.title} query={searchQuery} />
                    </h3>
                  </div>

                  {/* Directed edges */}
                  <div className="lg:col-span-8 space-y-2 text-sm">
                    <div className="flex items-start gap-2.5">
                      <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-slate-500 mr-2">Affects:</span>
                        <span className="text-slate-800">
                          <HighlightText text={rel.affects || 'Unspecified'} query={searchQuery} />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-slate-500 mr-2">Replaces:</span>
                        <span className="text-slate-700">
                          <HighlightText text={rel.replaces || 'None'} query={searchQuery} />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                      <div className="min-w-0 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">Related file:</span>
                        {canOpenRelatedFile(rel.relatedFile) ? (
                          <button
                            type="button"
                            onClick={() => onOpenRelatedFile(rel.relatedFile)}
                            className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline text-left break-all"
                          >
                            <HighlightText text={rel.relatedFile} query={searchQuery} />
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-slate-600 break-all">
                            <HighlightText text={rel.relatedFile} query={searchQuery} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
