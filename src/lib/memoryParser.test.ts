import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRollingSummaryMarkdown,
  findObsoleteInFiles,
  parseGraphRelations,
  parseMemoryEntries,
  scanSecretsInFiles,
  searchMemoryFiles,
  splitHighlightSegments,
  validateMemoryFiles,
} from './memoryParser';
import type { MemoryFileRecord } from '../types/memory';

const SAMPLE_DECISIONS = `# Decisions Memory

### [2026-11-22] Markdown-Only Storage
- Type: decision
- Status: active
- Priority: critical
- Tags: markdown, portability
- Details: Store durable knowledge in plain Markdown files.
- Reason: Keeps diffs readable and zero-dependency.
- Related files: gemini-memory-kit/memory/decisions.md
- Next action: None.
- Source: user
- Confidence: confirmed

### [2026-10-01] Legacy JSON Store
- Type: decision
- Status: obsolete
- Priority: low
- Tags: legacy
- Details: Old JSON prototype.
- Reason: Replaced by Markdown.
- Related files: none
- Next action: Archive.
- Source: agent
- Confidence: confirmed
`;

const SAMPLE_GRAPH = `# Graph

[Decision] Markdown-Only Storage
-> affects: memory storage and tools
-> replaces: ad-hoc notes
-> related file: gemini-memory-kit/memory/decisions.md
`;

test('parseMemoryEntries extracts structured active and obsolete entries', () => {
  const entries = parseMemoryEntries(SAMPLE_DECISIONS, 'decisions');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].title, 'Markdown-Only Storage');
  assert.equal(entries[0].priority, 'critical');
  assert.deepEqual(entries[0].tags, ['markdown', 'portability']);
  assert.equal(entries[1].status, 'obsolete');
});

test('parseGraphRelations extracts node kind, affects, replaces, and relatedFile', () => {
  const rels = parseGraphRelations(SAMPLE_GRAPH);
  assert.equal(rels.length, 1);
  assert.equal(rels[0].kind, 'Decision');
  assert.equal(rels[0].affects, 'memory storage and tools');
  assert.equal(rels[0].replaces, 'ad-hoc notes');
  assert.equal(rels[0].relatedFile, 'gemini-memory-kit/memory/decisions.md');
});

test('splitHighlightSegments splits text safely around case-insensitive search terms', () => {
  const segments = splitHighlightSegments('Portable Markdown Memory Kit', 'markdown kit');
  const highlighted = segments.filter((s) => s.highlighted).map((s) => s.text);
  assert.deepEqual(highlighted, ['Markdown', 'Kit']);
  assert.equal(segments.map((s) => s.text).join(''), 'Portable Markdown Memory Kit');
});

test('searchMemoryFiles returns matching lines with context and heading attribution', () => {
  const file: MemoryFileRecord = {
    id: 'decisions',
    name: 'decisions.md',
    relativePath: 'memory/decisions.md',
    category: 'memory',
    description: 'Decisions',
    content: SAMPLE_DECISIONS,
    lineCount: SAMPLE_DECISIONS.split('\n').length,
    lineBudget: 150,
    entries: parseMemoryEntries(SAMPLE_DECISIONS, 'decisions'),
  };
  const findings = searchMemoryFiles([file], 'portability');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].entryTitle, 'Markdown-Only Storage');
  assert.ok(findings[0].snippet.some((s) => s.isMatch && s.text.includes('portability')));
});

test('scanSecretsInFiles detects credentials without flagging clean prose', () => {
  const cleanFile: MemoryFileRecord = {
    id: 'policies',
    name: 'policies.md',
    relativePath: 'memory/policies.md',
    category: 'memory',
    description: 'Policies',
    content: 'Never store passwords, API keys, or tokens in memory files.\n',
    lineCount: 1,
    lineBudget: 150,
    entries: [],
  };
  assert.equal(scanSecretsInFiles([cleanFile]).length, 0);

  const leakyFile: MemoryFileRecord = {
    ...cleanFile,
    content: 'password = SuperSecretValue99\n-----BEGIN RSA PRIVATE KEY-----\n',
    lineCount: 2,
  };
  const leaks = scanSecretsInFiles([leakyFile]);
  assert.equal(leaks.length, 2);
});

test('findObsoleteInFiles and validateMemoryFiles report obsolete entries and line budgets', () => {
  const file: MemoryFileRecord = {
    id: 'decisions',
    name: 'decisions.md',
    relativePath: 'memory/decisions.md',
    category: 'memory',
    description: 'Decisions',
    content: SAMPLE_DECISIONS,
    lineCount: SAMPLE_DECISIONS.split('\n').length,
    lineBudget: 150,
    entries: parseMemoryEntries(SAMPLE_DECISIONS, 'decisions'),
  };
  const obsolete = findObsoleteInFiles([file]);
  assert.equal(obsolete.length, 1);
  assert.ok(obsolete[0].title.includes('Legacy JSON Store'));
  assert.equal(validateMemoryFiles([file]).length, 0);
});

test('buildRollingSummaryMarkdown keeps only active entries and uses provided date', () => {
  const summary = buildRollingSummaryMarkdown(SAMPLE_DECISIONS, '', '2026-11-22');
  assert.ok(summary.includes('Last Updated: 2026-11-22'));
  assert.ok(summary.includes('Markdown-Only Storage'));
  assert.ok(!summary.includes('Legacy JSON Store'));
});
