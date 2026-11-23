export type MemoryEntryStatus = 'active' | 'obsolete' | string;
export type MemoryPriority = 'critical' | 'high' | 'normal' | 'low' | string;

export interface MemoryEntry {
  id: string;
  date: string;
  title: string;
  type: string;
  status: MemoryEntryStatus;
  priority: MemoryPriority;
  tags: string[];
  details: string;
  reason: string;
  relatedFiles: string[];
  nextAction: string;
  source: string;
  confidence: string;
  lineNumber: number;
}

export interface GraphRelation {
  id: string;
  kind: string;
  title: string;
  affects: string;
  replaces: string;
  relatedFile: string;
  lineNumber: number;
}

export interface MemoryFileRecord {
  id: string;
  name: string;
  relativePath: string;
  category: 'index' | 'memory' | 'rules';
  description: string;
  content: string;
  lineCount: number;
  lineBudget: number;
  entries: MemoryEntry[];
}

export interface SearchSnippetLine {
  lineNumber: number;
  text: string;
  isMatch: boolean;
}

export interface SearchFinding {
  id: string;
  fileId: string;
  fileName: string;
  relativePath: string;
  lineNumber: number;
  entryTitle: string | null;
  matchedTerms: string[];
  snippet: SearchSnippetLine[];
}

export interface SecretFinding {
  relativePath: string;
  lineNumber: number;
  ruleName: string;
}

export interface ObsoleteFinding {
  relativePath: string;
  fileName: string;
  lineNumber: number;
  title: string;
}

export interface ValidationIssue {
  relativePath: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AuditReport {
  checkedAt: string;
  scannedFiles: number;
  secretFindings: SecretFinding[];
  obsoleteFindings: ObsoleteFinding[];
  validationIssues: ValidationIssue[];
}

export interface MemoryWorkspacePayload {
  files: MemoryFileRecord[];
  relations: GraphRelation[];
  stats: {
    totalFiles: number;
    totalEntries: number;
    activeEntries: number;
    obsoleteEntries: number;
    activeDecisions: number;
    openTasks: number;
  };
}
