export type SkillSurface = 'claude' | 'codex';
export type SkillCategory = 'router' | 'binary' | 'workflow' | 'safety';

export interface SkillCatalogEntry {
  name: string;
  surfaces: SkillSurface[];
  claudeTemplate?: string;
  claudeOutput?: string;
  codexGenerated?: boolean;
  category: SkillCategory;
  references?: string[];
}

export type ClaudeSkillCatalogEntry = SkillCatalogEntry & {
  claudeTemplate: string;
  claudeOutput: string;
};

export type CodexSkillCatalogEntry = SkillCatalogEntry & {
  codexGenerated: true;
};

/**
 * Product skill inventory. Generators, health checks, watch mode, and tests
 * consume this list so local template experiments cannot become products by
 * directory discovery alone.
 */
export const SKILL_CATALOG: SkillCatalogEntry[] = [
  {
    name: 'skystack',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'SKILL.md.tmpl',
    claudeOutput: 'SKILL.md',
    codexGenerated: true,
    category: 'router',
  },
  {
    name: 'benchmark',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'benchmark/SKILL.md.tmpl',
    claudeOutput: 'benchmark/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'browse',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'browse/SKILL.md.tmpl',
    claudeOutput: 'browse/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'canary',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'canary/SKILL.md.tmpl',
    claudeOutput: 'canary/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'careful',
    surfaces: ['claude'],
    claudeTemplate: 'careful/SKILL.md.tmpl',
    claudeOutput: 'careful/SKILL.md',
    category: 'safety',
  },
  {
    name: 'checkpoint',
    surfaces: ['claude'],
    claudeTemplate: 'checkpoint/SKILL.md.tmpl',
    claudeOutput: 'checkpoint/SKILL.md',
    category: 'safety',
  },
  {
    name: 'claude-review',
    surfaces: ['codex'],
    codexGenerated: true,
    category: 'workflow',
  },
  {
    name: 'codex',
    surfaces: ['claude'],
    claudeTemplate: 'codex/SKILL.md.tmpl',
    claudeOutput: 'codex/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'design',
    surfaces: ['claude'],
    claudeTemplate: 'design/SKILL.md.tmpl',
    claudeOutput: 'design/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'devops',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'devops/SKILL.md.tmpl',
    claudeOutput: 'devops/SKILL.md',
    codexGenerated: true,
    category: 'workflow',
  },
  {
    name: 'diagnose',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'diagnose/SKILL.md.tmpl',
    claudeOutput: 'diagnose/SKILL.md',
    codexGenerated: true,
    category: 'workflow',
  },
  {
    name: 'document-release',
    surfaces: ['claude'],
    claudeTemplate: 'document-release/SKILL.md.tmpl',
    claudeOutput: 'document-release/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'freeze',
    surfaces: ['claude'],
    claudeTemplate: 'freeze/SKILL.md.tmpl',
    claudeOutput: 'freeze/SKILL.md',
    category: 'safety',
  },
  {
    name: 'guard',
    surfaces: ['claude'],
    claudeTemplate: 'guard/SKILL.md.tmpl',
    claudeOutput: 'guard/SKILL.md',
    category: 'safety',
  },
  {
    name: 'health',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'health/SKILL.md.tmpl',
    claudeOutput: 'health/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'pm',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'pm/SKILL.md.tmpl',
    claudeOutput: 'pm/SKILL.md',
    codexGenerated: true,
    category: 'workflow',
  },
  {
    name: 'publish',
    surfaces: ['claude'],
    claudeTemplate: 'publish/SKILL.md.tmpl',
    claudeOutput: 'publish/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'qa',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'qa/SKILL.md.tmpl',
    claudeOutput: 'qa/SKILL.md',
    codexGenerated: true,
    category: 'workflow',
  },
  {
    name: 'research',
    surfaces: ['claude'],
    claudeTemplate: 'research/SKILL.md.tmpl',
    claudeOutput: 'research/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'retro',
    surfaces: ['claude'],
    claudeTemplate: 'retro/SKILL.md.tmpl',
    claudeOutput: 'retro/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'review',
    surfaces: ['claude'],
    claudeTemplate: 'review/SKILL.md.tmpl',
    claudeOutput: 'review/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'security',
    surfaces: ['claude'],
    claudeTemplate: 'security/SKILL.md.tmpl',
    claudeOutput: 'security/SKILL.md',
    category: 'workflow',
  },
  {
    name: 'setup-browser-cookies',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'setup-browser-cookies/SKILL.md.tmpl',
    claudeOutput: 'setup-browser-cookies/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'skystack-upgrade',
    surfaces: ['claude', 'codex'],
    claudeTemplate: 'skystack-upgrade/SKILL.md.tmpl',
    claudeOutput: 'skystack-upgrade/SKILL.md',
    codexGenerated: true,
    category: 'binary',
  },
  {
    name: 'unfreeze',
    surfaces: ['claude'],
    claudeTemplate: 'unfreeze/SKILL.md.tmpl',
    claudeOutput: 'unfreeze/SKILL.md',
    category: 'safety',
  },
];

export const CLAUDE_SKILLS = SKILL_CATALOG.filter(
  (entry): entry is ClaudeSkillCatalogEntry =>
    entry.surfaces.includes('claude') &&
    entry.claudeTemplate !== undefined &&
    entry.claudeOutput !== undefined,
);

export const CODEX_SKILLS = SKILL_CATALOG.filter(
  (entry): entry is CodexSkillCatalogEntry =>
    entry.surfaces.includes('codex') && entry.codexGenerated === true,
);
