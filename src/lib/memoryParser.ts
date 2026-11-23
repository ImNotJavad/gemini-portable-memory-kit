import type {
  GraphRelation,
  MemoryEntry,
  MemoryFileRecord,
  ObsoleteFinding,
  SearchFinding,
  SecretFinding,
  ValidationIssue,
} from '../types/memory';

const HEADING_RE = /^\s*###\s+\[(\d{4}-\d{2}-\d{2})\]\s+(.+?)\s*$/;
const FIELD_RE = /^\s*-\s*([A-Za-z ]+?)\s*:\s*(.*?)\s*$/;
const GRAPH_NODE_RE = /^\s*\[([^\]]+)\]\s+(.+?)\s*$/;
const GRAPH_ARROW_RE = /^\s*->\s*([A-Za-z ]+?)\s*:\s*(.*?)\s*$/;
const OBSOLETE_RE = /^\s*-\s*Status\s*:\s*obsolete\b/i;

const ENTRY_FILE_NAMES = new Set([
  'architecture.md',
  'decisions.md',
  'user-preferences.md',
  'bugs-and-lessons.md',
  'open-tasks.md',
]);

const REQUIRED_FIELDS = [
  'type',
  'status',
  'priority',
  'tags',
  'details',
  'reason',
  'related files',
  'next action',
  'source',
  'confidence',
];

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const PLACEHOLDER_VALUES = new Set([
  'none',
  'null',
  'true',
  'false',
  'redacted',
  'changeme',
  'example',
  'placeholder',
  'your_api_key',
  'my_gemini_api_key',
  'test',
  'dummy',
]);

const SECRET_RULES: Array<{ name: string; regex: RegExp; hasCapture?: boolean }> = [
  { name: 'Private Key Block', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'Google API Key', regex: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { name: 'AWS Access Key ID', regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: 'GitHub Token', regex: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'Slack Token', regex: /\bxox[baprs]-[A-Za-z0-9\-]{10,}\b/ },
  { name: 'GitLab Token', regex: /\bglpat-[A-Za-z0-9\-_]{20,}\b/ },
  { name: 'Provider Secret Key', regex: /\bsk-[A-Za-z0-9\-_]{20,}\b/ },
  { name: 'JWT Token', regex: /\beyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b/ },
  { name: 'Bearer Token', regex: /\bBearer\s+[A-Za-z0-9\-._~+/]{16,}=*\b/ },
  { name: 'URL Embedded Credentials', regex: /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@[^\s]+/ },
  {
    name: 'API Key Assignment',
    regex: /\b(?:api[_-]?key|secret[_-]?key|client[_-]?secret)\s*[:=]\s*['"]?([A-Za-z0-9_\-/+=]{8,})['"]?/i,
    hasCapture: true,
  },
  {
    name: 'Token Assignment',
    regex: /\b(?:access[_-]?token|auth[_-]?token|refresh[_-]?token|token)\s*[:=]\s*['"]?([A-Za-z0-9_\-./+=]{8,})['"]?/i,
    hasCapture: true,
  },
  {
    name: 'Password Assignment',
    regex: /\b(?:password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"`]{4,})['"]?/i,
    hasCapture: true,
  },
];

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export function extractQueryTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .slice(0, 8);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitHighlightSegments(text: string, query: string): HighlightSegment[] {
  const terms = extractQueryTerms(query);
  if (!terms.length || !text) {
    return [{ text, highlighted: false }];
  }

  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(pattern);
  const lowerTerms = new Set(terms.map((t) => t.toLowerCase()));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlighted: lowerTerms.has(part.toLowerCase()),
    }));
}

export function parseMemoryEntries(content: string, fileId: string): MemoryEntry[] {
  const lines = content.split(/\r?\n/);
  const entries: MemoryEntry[] = [];

  let currentDate = '';
  let currentTitle = '';
  let currentLine = 0;
  let fields: Record<string, string> = {};

  const flush = () => {
    if (!currentTitle) return;
    const rawTags = fields['tags'] || '';
    const rawRelated = fields['related files'] || '';
    entries.push({
      id: `${fileId}:${currentLine}`,
      date: currentDate,
      title: currentTitle,
      type: (fields['type'] || 'note').toLowerCase(),
      status: (fields['status'] || 'active').toLowerCase(),
      priority: (fields['priority'] || 'normal').toLowerCase(),
      tags: rawTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      details: fields['details'] || '',
      reason: fields['reason'] || '',
      relatedFiles: rawRelated
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
      nextAction: fields['next action'] || 'None.',
      source: (fields['source'] || 'agent').toLowerCase(),
      confidence: (fields['confidence'] || 'confirmed').toLowerCase(),
      lineNumber: currentLine,
    });
  };

  lines.forEach((line, index) => {
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      flush();
      currentDate = headingMatch[1];
      currentTitle = headingMatch[2].trim();
      currentLine = index + 1;
      fields = {};
      return;
    }

    if (currentTitle) {
      const fieldMatch = line.match(FIELD_RE);
      if (fieldMatch) {
        const key = fieldMatch[1].trim().toLowerCase();
        fields[key] = fieldMatch[2].trim();
      }
    }
  });

  flush();
  return entries;
}

export function parseGraphRelations(content: string): GraphRelation[] {
  const lines = content.split(/\r?\n/);
  const relations: GraphRelation[] = [];

  let current: Partial<GraphRelation> | null = null;

  const flush = () => {
    if (!current || !current.title) return;
    relations.push({
      id: `graph:${current.lineNumber}`,
      kind: current.kind || 'Decision',
      title: current.title,
      affects: current.affects || '',
      replaces: current.replaces || '',
      relatedFile: current.relatedFile || '',
      lineNumber: current.lineNumber || 1,
    });
  };

  lines.forEach((line, index) => {
    const nodeMatch = line.match(GRAPH_NODE_RE);
    if (nodeMatch) {
      flush();
      current = {
        kind: nodeMatch[1].trim(),
        title: nodeMatch[2].trim(),
        affects: '',
        replaces: '',
        relatedFile: '',
        lineNumber: index + 1,
      };
      return;
    }

    if (current) {
      const arrowMatch = line.match(GRAPH_ARROW_RE);
      if (arrowMatch) {
        const key = arrowMatch[1].trim().toLowerCase();
        const value = arrowMatch[2].trim();
        if (key === 'affects') current.affects = value;
        else if (key === 'replaces') current.replaces = value;
        else if (key === 'related file') current.relatedFile = value;
      }
    }
  });

  flush();
  return relations;
}

export function searchMemoryFiles(
  files: MemoryFileRecord[],
  query: string,
  contextLines = 1
): SearchFinding[] {
  const terms = extractQueryTerms(query);
  if (!terms.length) return [];

  const lowerTerms = terms.map((t) => t.toLowerCase());
  const findings: SearchFinding[] = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    let currentHeading: string | null = null;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const headingMatch = line.match(HEADING_RE);
      if (headingMatch) {
        currentHeading = headingMatch[2].trim();
      }

      const lowerLine = line.toLowerCase();
      const matchedTerms = lowerTerms.filter((term) => lowerLine.includes(term));
      if (!matchedTerms.length) continue;

      const start = Math.max(0, idx - contextLines);
      const end = Math.min(lines.length, idx + contextLines + 1);
      const snippet = [];
      for (let pos = start; pos < end; pos++) {
        snippet.push({
          lineNumber: pos + 1,
          text: lines[pos],
          isMatch: pos === idx,
        });
      }

      findings.push({
        id: `${file.id}:${idx + 1}`,
        fileId: file.id,
        fileName: file.name,
        relativePath: file.relativePath,
        lineNumber: idx + 1,
        entryTitle: currentHeading,
        matchedTerms,
        snippet,
      });
    }
  }

  return findings;
}

function isPlaceholder(value: string): boolean {
  const cleaned = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  if (PLACEHOLDER_VALUES.has(cleaned)) return true;
  if (/^(<|\$\{|\{\{|your_|my_|example_)/.test(cleaned)) return true;
  if (/^[*x.]+$/.test(cleaned)) return true;
  return false;
}

export function scanSecretsInFiles(files: MemoryFileRecord[]): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of SECRET_RULES) {
        const match = line.match(rule.regex);
        if (!match) continue;
        if (rule.hasCapture && match[1] && isPlaceholder(match[1])) {
          continue;
        }
        findings.push({
          relativePath: file.relativePath,
          lineNumber: index + 1,
          ruleName: rule.name,
        });
        break;
      }
    });
  }
  return findings;
}

export function findObsoleteInFiles(files: MemoryFileRecord[]): ObsoleteFinding[] {
  const findings: ObsoleteFinding[] = [];
  for (const file of files) {
    if (file.category !== 'memory') continue;
    const lines = file.content.split(/\r?\n/);
    let currentTitle = '(untitled entry)';
    lines.forEach((line, index) => {
      const heading = line.match(/^\s*###\s+(.+?)\s*$/);
      if (heading) {
        currentTitle = heading[1].trim();
        return;
      }
      if (OBSOLETE_RE.test(line)) {
        findings.push({
          relativePath: file.relativePath,
          fileName: file.name,
          lineNumber: index + 1,
          title: currentTitle,
        });
      }
    });
  }
  return findings;
}

export function validateMemoryFiles(files: MemoryFileRecord[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenTitles = new Map<string, string>();

  for (const file of files) {
    if (file.lineCount >= file.lineBudget) {
      issues.push({
        relativePath: file.relativePath,
        message: `Exceeds line budget (${file.lineCount}/${file.lineBudget} lines).`,
        severity: 'error',
      });
    } else if (file.lineCount >= Math.floor(file.lineBudget * 0.85)) {
      issues.push({
        relativePath: file.relativePath,
        message: `Approaching line budget (${file.lineCount}/${file.lineBudget} lines).`,
        severity: 'warning',
      });
    }

    if (!ENTRY_FILE_NAMES.has(file.name)) continue;

    const lines = file.content.split(/\r?\n/);
    let currentTitle = '';
    let currentFields = new Set<string>();

    const flush = () => {
      if (!currentTitle) return;
      const missing = REQUIRED_FIELDS.filter((f) => !currentFields.has(f));
      if (missing.length > 0) {
        issues.push({
          relativePath: file.relativePath,
          message: `Entry "${currentTitle}" missing fields: ${missing.join(', ')}.`,
          severity: 'warning',
        });
      }
    };

    for (const line of lines) {
      const h = line.match(HEADING_RE);
      if (h) {
        flush();
        currentTitle = h[2].trim();
        const key = currentTitle.toLowerCase();
        if (seenTitles.has(key)) {
          issues.push({
            relativePath: file.relativePath,
            message: `Duplicate entry title "${currentTitle}" (also in ${seenTitles.get(key)}).`,
            severity: 'error',
          });
        } else {
          seenTitles.set(key, file.relativePath);
        }
        currentFields = new Set<string>();
        continue;
      }
      if (currentTitle) {
        const f = line.match(FIELD_RE);
        if (f) {
          currentFields.add(f[1].trim().toLowerCase());
        }
      }
    }
    flush();
  }

  return issues;
}

export function buildRollingSummaryMarkdown(
  decisionsContent: string,
  lessonsContent: string,
  todayIso: string
): string {
  const rank = (entries: MemoryEntry[]) =>
    entries
      .filter((e) => e.status === 'active')
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] ?? 2;
        const pb = PRIORITY_RANK[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.title.localeCompare(b.title);
      })
      .slice(0, 12);

  const decisions = rank(parseMemoryEntries(decisionsContent, 'decisions'));
  const lessons = rank(parseMemoryEntries(lessonsContent, 'bugs-and-lessons'));

  const topTitles = [...decisions.slice(0, 2), ...lessons.slice(0, 1)].map((e) => e.title);
  const overview = topTitles.length
    ? `Tracking ${decisions.length} active decision(s) and ${lessons.length} active bug/lesson record(s). Top priorities: ${topTitles.join('; ')}.`
    : 'No active decisions or lessons recorded yet. Add durable entries to `decisions.md` and `bugs-and-lessons.md`.';

  const formatBullet = (entry: MemoryEntry) => {
    let detail = entry.details || 'No details recorded.';
    if (detail.length > 220) {
      detail = detail.slice(0, 217).trimEnd() + '...';
    }
    return `- [${entry.date}] (${entry.priority}) ${entry.title}: ${detail}`;
  };

  const lines = [
    '# Rolling Memory Summary',
    '',
    `Last Updated: ${todayIso}`,
    '',
    '## Current Summary',
    overview,
    '',
    '## Key Active Decisions',
    ...(decisions.length ? decisions.map(formatBullet) : ['- None recorded.']),
    '',
    '## Key Active Bugs & Lessons',
    ...(lessons.length ? lessons.map(formatBullet) : ['- None recorded.']),
  ];

  return lines.slice(0, 145).join('\n') + '\n';
}
