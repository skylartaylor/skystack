# Code Index MCP — Token Reduction via AST-Based Code Search

## Why

Every time a skill needs to understand code, it burns tokens on grep/read loops —
8-10 tool calls to find what it needs. An AST-aware code index replaces those loops
with a single symbol lookup, cutting code retrieval tokens by ~95%.

## Recommended: jCodeMunch MCP

AST-based indexing via Tree-sitter. Indexes once, retrieves with byte-level precision.
Incremental updates only re-index changed files. 100+ languages supported.

### Setup

```bash
# Install
pip install jcodemunch-mcp

# Initialize in your project
cd /path/to/your/project
jcodemunch-mcp init
```

Or use the skystack convenience script:
```bash
~/.claude/skills/skystack/bin/skystack-setup-code-index
```

### Claude Code Configuration

Add to your project's `.claude/settings.json` (or global `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "jcodemunch": {
      "command": "jcodemunch-mcp",
      "args": ["serve"]
    }
  }
}
```

### Tools Exposed

| Tool | What it does |
|------|-------------|
| `search_symbols` | Find functions, classes, variables by name/pattern |
| `get_symbol_source` | Get exact source of a specific symbol |
| `get_file_outline` | File structure — all symbols with signatures |
| `blast_radius` | What would break if you change this symbol? |
| `class_hierarchy` | Inheritance chain for a class |
| `call_hierarchy` | What calls this function? What does it call? |
| `dead_code` | Unreferenced symbols |
| `git_diff_symbols` | Symbols changed in a diff |

### When to Use

- **Large codebases** (>100 files): major token savings on every exploration
- **Frequent exploration**: skills like /review, /diagnose, /pm that read lots of code
- **Refactoring**: blast radius + call hierarchy prevent breaking changes

### When to Skip

- **Small projects** (<20 files): overhead isn't worth it
- **One-off scripts**: not enough repeated exploration to justify indexing
- **Projects with exotic languages**: Tree-sitter coverage varies

### Alternatives Considered

| Tool | Token Savings | External Deps | Verdict |
|------|--------------|---------------|---------|
| jCodeMunch | ~95% | None (local) | **Recommended** |
| claude-context (Zilliz) | ~40% | OpenAI API + vector DB | Too many deps |
| code-index-mcp | Unknown | Optional ripgrep | Good fallback |
