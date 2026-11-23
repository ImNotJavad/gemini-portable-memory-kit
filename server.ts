import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  buildRollingSummaryMarkdown,
  findObsoleteInFiles,
  parseGraphRelations,
  parseMemoryEntries,
  scanSecretsInFiles,
  searchMemoryFiles,
  validateMemoryFiles,
} from './src/lib/memoryParser';
import type { AuditReport, MemoryFileRecord, MemoryWorkspacePayload } from './src/types/memory';

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.resolve(process.cwd());
const KIT_DIR = path.resolve(ROOT_DIR, 'gemini-memory-kit');

interface AllowedFileSpec {
  id: string;
  name: string;
  relativePath: string;
  category: 'index' | 'memory' | 'rules';
  description: string;
  lineBudget: number;
}

const ALLOWED_FILES: AllowedFileSpec[] = [
  {
    id: 'agent-memory',
    name: 'AGENT_MEMORY.md',
    relativePath: 'AGENT_MEMORY.md',
    category: 'index',
    description: 'Primary memory index loaded at the start of every task.',
    lineBudget: 100,
  },
  {
    id: 'decisions',
    name: 'decisions.md',
    relativePath: 'memory/decisions.md',
    category: 'memory',
    description: 'Confirmed technical, architectural, and process decisions.',
    lineBudget: 150,
  },
  {
    id: 'architecture',
    name: 'architecture.md',
    relativePath: 'memory/architecture.md',
    category: 'memory',
    description: 'System structure, module boundaries, and portability invariants.',
    lineBudget: 150,
  },
  {
    id: 'bugs-and-lessons',
    name: 'bugs-and-lessons.md',
    relativePath: 'memory/bugs-and-lessons.md',
    category: 'memory',
    description: 'Resolved pitfalls, root causes, and operational lessons.',
    lineBudget: 150,
  },
  {
    id: 'open-tasks',
    name: 'open-tasks.md',
    relativePath: 'memory/open-tasks.md',
    category: 'memory',
    description: 'Active follow-up engineering work and deferred items.',
    lineBudget: 150,
  },
  {
    id: 'user-preferences',
    name: 'user-preferences.md',
    relativePath: 'memory/user-preferences.md',
    category: 'memory',
    description: 'Stable workflow, tooling, safety, and formatting preferences.',
    lineBudget: 150,
  },
  {
    id: 'summaries',
    name: 'summaries.md',
    relativePath: 'memory/summaries.md',
    category: 'memory',
    description: 'Rolling condensed summary of high-priority active knowledge.',
    lineBudget: 150,
  },
  {
    id: 'graph',
    name: 'graph.md',
    relativePath: 'memory/graph.md',
    category: 'memory',
    description: 'Directed relationship map linking decisions, modules, and files.',
    lineBudget: 150,
  },
  {
    id: 'policies',
    name: 'policies.md',
    relativePath: 'memory/policies.md',
    category: 'memory',
    description: 'Retention, safety, access, and deletion governance rules.',
    lineBudget: 150,
  },
  {
    id: 'memory-rules',
    name: 'GEMINI.md',
    relativePath: 'gemini/GEMINI.md',
    category: 'rules',
    description: 'Full memory governance rules and required Markdown entry schema.',
    lineBudget: 150,
  },
];

function resolveSafeKitPath(relativePath: string): string | null {
  const resolved = path.resolve(KIT_DIR, relativePath);
  if (!resolved.startsWith(KIT_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function loadMemoryFiles(): MemoryFileRecord[] {
  const records: MemoryFileRecord[] = [];
  for (const spec of ALLOWED_FILES) {
    const absPath = resolveSafeKitPath(spec.relativePath);
    if (!absPath || !fs.existsSync(absPath)) continue;
    const content = fs.readFileSync(absPath, 'utf-8');
    const lineCount = content ? content.split(/\r?\n/).length : 0;
    const entries =
      spec.category === 'memory' ? parseMemoryEntries(content, spec.id) : [];

    records.push({
      id: spec.id,
      name: spec.name,
      relativePath: spec.relativePath,
      category: spec.category,
      description: spec.description,
      content,
      lineCount,
      lineBudget: spec.lineBudget,
      entries,
    });
  }
  return records;
}

function buildWorkspacePayload(): MemoryWorkspacePayload {
  const files = loadMemoryFiles();
  const graphFile = files.find((f) => f.id === 'graph');
  const relations = graphFile ? parseGraphRelations(graphFile.content) : [];

  const allEntries = files.flatMap((f) => f.entries);
  const activeEntries = allEntries.filter((e) => e.status === 'active');
  const obsoleteEntries = allEntries.filter((e) => e.status === 'obsolete');
  const activeDecisions =
    files.find((f) => f.id === 'decisions')?.entries.filter((e) => e.status === 'active')
      .length ?? 0;
  const openTasks =
    files.find((f) => f.id === 'open-tasks')?.entries.filter((e) => e.status === 'active')
      .length ?? 0;

  return {
    files,
    relations,
    stats: {
      totalFiles: files.length,
      totalEntries: allEntries.length,
      activeEntries: activeEntries.length,
      obsoleteEntries: obsoleteEntries.length,
      activeDecisions,
      openTasks,
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/memory/files', (_req, res) => {
    try {
      res.json(buildWorkspacePayload());
    } catch {
      res.status(500).json({ error: 'Failed to load memory files.' });
    }
  });

  app.get('/api/memory/search', (req, res) => {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const trimmed = rawQuery.trim().slice(0, 120);
      if (!trimmed) {
        res.json({ query: '', findings: [] });
        return;
      }
      const files = loadMemoryFiles().filter((f) => f.category === 'memory' || f.category === 'index');
      const findings = searchMemoryFiles(files, trimmed, 1);
      res.json({ query: trimmed, findings });
    } catch {
      res.status(500).json({ error: 'Search failed.' });
    }
  });

  app.get('/api/memory/audit', (_req, res) => {
    try {
      const files = loadMemoryFiles().filter((f) => f.category !== 'rules');
      const report: AuditReport = {
        checkedAt: new Date().toISOString(),
        scannedFiles: files.length,
        secretFindings: scanSecretsInFiles(files),
        obsoleteFindings: findObsoleteInFiles(files),
        validationIssues: validateMemoryFiles(files),
      };
      res.json(report);
    } catch {
      res.status(500).json({ error: 'Audit check failed.' });
    }
  });

  app.post('/api/memory/summarize', (_req, res) => {
    try {
      const decisionsPath = resolveSafeKitPath('memory/decisions.md');
      const lessonsPath = resolveSafeKitPath('memory/bugs-and-lessons.md');
      const summariesPath = resolveSafeKitPath('memory/summaries.md');
      if (!decisionsPath || !lessonsPath || !summariesPath) {
        res.status(400).json({ error: 'Invalid memory path configuration.' });
        return;
      }

      const decisionsText = fs.existsSync(decisionsPath)
        ? fs.readFileSync(decisionsPath, 'utf-8')
        : '';
      const lessonsText = fs.existsSync(lessonsPath)
        ? fs.readFileSync(lessonsPath, 'utf-8')
        : '';
      const todayIso = new Date().toISOString().slice(0, 10);
      const nextSummary = buildRollingSummaryMarkdown(decisionsText, lessonsText, todayIso);

      fs.writeFileSync(summariesPath, nextSummary, 'utf-8');
      res.json({
        updatedAt: todayIso,
        workspace: buildWorkspacePayload(),
      });
    } catch {
      res.status(500).json({ error: 'Failed to regenerate rolling summary.' });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const hmrDisabled = process.env.DISABLE_HMR === 'true';

    if (hmrDisabled) {
      const noHmrViteClient = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`.trim();

      app.get('/@vite/client', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.send(noHmrViteClient);
      });
    }

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: hmrDisabled ? false : { server: httpServer },
        ws: hmrDisabled ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Memory Kit Studio listening on http://localhost:${PORT}`);
  });
}

startServer();
