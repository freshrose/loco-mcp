# Feature: Multi-Project API Key Support

## Summary

Add support for using different Loco API keys based on a project identifier, so a single MCP server instance can manage translations across multiple Loco projects. Users configure named projects via environment variables (`LOCO_API_KEY_<NAME>`) or a JSON mapping (`LOCO_PROJECTS`), then select a project per tool call.

## User Story

As a developer managing multiple Loco projects
I want to switch between projects without reconfiguring the MCP server
So that I can manage translations across all my projects from a single setup

## Problem Statement

Currently the MCP server supports only one API key at a time — either via `LOCO_API_KEY` env var or an explicit `apiKey` tool parameter. Users working with multiple Loco projects must either reconfigure the server or pass raw API keys in every tool call.

## Solution Statement

Introduce a `project` parameter on all tools. API key resolution follows this priority:
1. Explicit `apiKey` parameter (existing, highest priority)
2. `project` parameter → looks up key from configured project map
3. `LOCO_API_KEY` env var (existing, fallback default)

Projects are configured via either:
- Individual env vars: `LOCO_API_KEY_<PROJECT_NAME>=<key>` (e.g., `LOCO_API_KEY_MOBILE=xxx`)
- JSON env var: `LOCO_PROJECTS={"mobile":"key1","web":"key2"}`

## Metadata

| Field            | Value                                   |
| ---------------- | --------------------------------------- |
| Type             | ENHANCEMENT                             |
| Complexity       | LOW                                     |
| Systems Affected | index.ts (tools), loco-client.ts (none) |
| Dependencies     | None                                    |
| Estimated Tasks  | 4                                       |

---

## UX Design

### Before State
```
╔══════════════════════════════════════════════════════════════╗
║                        BEFORE STATE                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   ┌──────────────┐      ┌────────────┐      ┌──────────┐   ║
║   │  Tool Call   │─────►│ getClient  │─────►│ Loco API │   ║
║   │  (apiKey?)   │      │ apiKey ||  │      │ Project A│   ║
║   └──────────────┘      │ LOCO_API_  │      └──────────┘   ║
║                          │ KEY        │                      ║
║                          └────────────┘                      ║
║                                                              ║
║   PAIN_POINT: Only one project accessible per server         ║
║   instance. Must pass raw apiKey to switch projects.         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### After State
```
╔══════════════════════════════════════════════════════════════╗
║                         AFTER STATE                         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   ┌──────────────┐      ┌────────────┐      ┌──────────┐   ║
║   │  Tool Call   │─────►│ getClient  │─────►│ Loco API │   ║
║   │  (project?)  │      │ 1. apiKey  │      │ Project A│   ║
║   └──────────────┘      │ 2. project │      └──────────┘   ║
║                          │    lookup  │                      ║
║                          │ 3. default │      ┌──────────┐   ║
║                          │    env var │─────►│ Loco API │   ║
║                          └────────────┘      │ Project B│   ║
║                                               └──────────┘   ║
║                                                              ║
║   Config via env:                                            ║
║   LOCO_API_KEY_MOBILE=xxx                                    ║
║   LOCO_API_KEY_WEB=yyy                                       ║
║   — or —                                                     ║
║   LOCO_PROJECTS={"mobile":"xxx","web":"yyy"}                 ║
║                                                              ║
║   VALUE_ADD: Switch projects by name, no raw keys needed.    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### Interaction Changes
| Location | Before | After | User Impact |
|----------|--------|-------|-------------|
| All tools | Only `apiKey` param | `apiKey` + `project` params | Can reference project by name |
| Server config | Single `LOCO_API_KEY` | `LOCO_API_KEY` + `LOCO_API_KEY_*` + `LOCO_PROJECTS` | Configure once, use many |

---

## Mandatory Reading

| Priority | File | Lines | Why Read This |
|----------|------|-------|---------------|
| P0 | `src/index.ts` | 13-21 | `getClient()` function — the ONLY place to modify key resolution |
| P0 | `src/index.ts` | 25-40 | Tool registration pattern — shows how `apiKey` param is defined on every tool |
| P1 | `src/loco-client.ts` | 28-32 | LocoClient constructor — no changes needed, but understand the interface |
| P2 | `README.md` | 16-57 | Current configuration docs — must update |

---

## Patterns to Mirror

**TOOL_REGISTRATION:**
```typescript
// SOURCE: src/index.ts:25-40
// EVERY tool follows this exact pattern:
server.registerTool(
    "tool_name",
    {
        description: "...",
        inputSchema: {
            apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
            // ... other params
        }
    },
    async ({ apiKey, ...rest }) => {
        const client = getClient(apiKey);
        // ...
    }
);
```

**CLIENT_CONSTRUCTION:**
```typescript
// SOURCE: src/index.ts:13-21
function getClient(apiKey?: string): LocoClient {
  const key = apiKey || process.env.LOCO_API_KEY;
  if (!key) {
    throw new Error(
      "No API key provided. Either pass apiKey as a tool parameter or set the LOCO_API_KEY environment variable."
    );
  }
  return new LocoClient(key);
}
```

---

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `src/index.ts` | UPDATE | Add `project` param to all tools, update `getClient()` to resolve project keys |
| `README.md` | UPDATE | Document multi-project configuration |

---

## NOT Building (Scope Limits)

- **No config file support** — env vars are the standard MCP server configuration mechanism; adding file-based config would be over-engineering
- **No project listing tool** — users know their project names from their own config
- **No changes to LocoClient** — the client already accepts an API key string; resolution logic stays in index.ts
- **No default project concept** — `LOCO_API_KEY` already serves as the default

---

## Step-by-Step Tasks

### Task 1: UPDATE `src/index.ts` — Add project key resolution to `getClient()`

- **ACTION**: Modify `getClient()` to accept an optional `project` parameter and resolve API keys with priority: `apiKey` > project lookup > `LOCO_API_KEY`
- **IMPLEMENT**:
  ```typescript
  function resolveProjectKey(project: string): string | undefined {
    // Try LOCO_API_KEY_<PROJECT> (case-insensitive match)
    const envKey = `LOCO_API_KEY_${project.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    if (process.env[envKey]) return process.env[envKey];

    // Try LOCO_PROJECTS JSON mapping
    const projectsJson = process.env.LOCO_PROJECTS;
    if (projectsJson) {
      try {
        const projects = JSON.parse(projectsJson);
        if (projects[project]) return projects[project];
      } catch {
        // Invalid JSON, ignore
      }
    }
    return undefined;
  }

  function getClient(apiKey?: string, project?: string): LocoClient {
    const key = apiKey
      || (project ? resolveProjectKey(project) : undefined)
      || process.env.LOCO_API_KEY;
    if (!key) {
      throw new Error(
        "No API key found. Provide apiKey, use project name (with LOCO_API_KEY_<NAME> or LOCO_PROJECTS env), or set LOCO_API_KEY."
      );
    }
    return new LocoClient(key);
  }
  ```
- **MIRROR**: `src/index.ts:13-21` — same function signature style, same error pattern
- **GOTCHA**: Project names may contain hyphens/dots — sanitize to valid env var chars when building `LOCO_API_KEY_<NAME>`
- **VALIDATE**: `npx tsc --noEmit`

### Task 2: UPDATE `src/index.ts` — Add `project` parameter to all tool registrations

- **ACTION**: Add `project` zod parameter to every tool's `inputSchema` and pass it to `getClient()`
- **IMPLEMENT**: For each of the 32 tools, add:
  ```typescript
  project: z.string().optional().describe("Project name to select API key (requires LOCO_API_KEY_<NAME> or LOCO_PROJECTS env var)"),
  ```
  And update each handler from `getClient(apiKey)` to `getClient(apiKey, project)`
- **MIRROR**: Follows exact same pattern as existing `apiKey` parameter on every tool
- **TOOLS TO UPDATE** (all 32):
  - `list_locales`, `create_locale`, `get_locale`, `update_locale`, `delete_locale`, `get_locale_errors`, `get_locale_progress`
  - `list_assets`, `get_asset`, `create_asset`, `update_asset`, `delete_asset`
  - `get_translations`, `get_translation`, `update_translation`, `erase_translation`, `flag_translation`, `unflag_translation`, `get_translation_revisions`
  - `list_tags`, `create_tag`, `tag_asset`, `untag_asset`, `batch_tag_assets`, `rename_tag`, `delete_tag`
  - `export_locale`, `export_all`, `export_archive`, `export_template`
  - `import_file`, `import_progress`
- **GOTCHA**: `import_file` handler destructures many params — make sure `project` is included in the destructuring
- **VALIDATE**: `npx tsc --noEmit`

### Task 3: UPDATE `README.md` — Document multi-project configuration

- **ACTION**: Add a "Multi-Project Setup" section to the Configuration docs
- **IMPLEMENT**: Add after the existing API Key section:
  - Explain `LOCO_API_KEY_<NAME>` env var pattern
  - Explain `LOCO_PROJECTS` JSON env var alternative
  - Show Claude Desktop config example with multiple projects
  - Show usage example with `project` parameter
  - Document resolution priority
- **MIRROR**: `README.md:16-57` — same markdown style, same JSON config block format
- **VALIDATE**: Manual review

### Task 4: Verify build compiles

- **ACTION**: Run full build to ensure no type errors
- **VALIDATE**: `npm run build`

---

## Testing Strategy

### Manual Testing

Since the project has no test framework set up:

1. Set `LOCO_API_KEY_TEST=<valid-key>` and call `list_locales` with `project: "test"` — should succeed
2. Set `LOCO_PROJECTS={"myproj":"<valid-key>"}` and call `list_locales` with `project: "myproj"` — should succeed
3. Call `list_locales` with no `apiKey` or `project` and no `LOCO_API_KEY` — should get clear error message
4. Call with invalid `project` name and no fallback — should get clear error message
5. Call with both `apiKey` and `project` — `apiKey` should take precedence

### Edge Cases Checklist

- [ ] Project name with hyphens (e.g., `my-project` → `LOCO_API_KEY_MY_PROJECT`)
- [ ] Project name with dots (e.g., `my.project` → `LOCO_API_KEY_MY_PROJECT`)
- [ ] Invalid JSON in `LOCO_PROJECTS` — should gracefully fall through
- [ ] Empty string project name — should fall through to default
- [ ] `apiKey` provided alongside `project` — `apiKey` wins

---

## Validation Commands

### Level 1: STATIC_ANALYSIS

```bash
npx tsc --noEmit
```

**EXPECT**: Exit 0, no errors

### Level 3: FULL_SUITE

```bash
npm run build
```

**EXPECT**: Build succeeds, `dist/` output generated

---

## Acceptance Criteria

- [ ] All 32 tools accept an optional `project` parameter
- [ ] `getClient()` resolves keys with priority: apiKey > project > LOCO_API_KEY
- [ ] `LOCO_API_KEY_<NAME>` env vars work (with name sanitization)
- [ ] `LOCO_PROJECTS` JSON env var works
- [ ] Clear error message when no key can be resolved
- [ ] README documents the new configuration options
- [ ] `npm run build` succeeds with no errors

---

## Completion Checklist

- [ ] Task 1: `getClient()` updated with project resolution
- [ ] Task 2: All 32 tools have `project` parameter
- [ ] Task 3: README updated with multi-project docs
- [ ] Task 4: Build passes cleanly

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Env var name collisions with other tools | LOW | LOW | Use `LOCO_API_KEY_` prefix which is specific enough |
| Invalid JSON in LOCO_PROJECTS crashes server | LOW | MED | Try/catch around JSON.parse, fall through gracefully |
| Users confused by multiple config methods | LOW | LOW | Document clear priority order in README |

---

## Notes

- The `apiKey` per-tool parameter is kept for backward compatibility and for cases where users want to use a key not in their config
- No changes to `loco-client.ts` or `types.ts` — the client already accepts a string key, so all resolution logic stays in `index.ts`
- The `LOCO_PROJECTS` JSON approach is more convenient for users with many projects, while `LOCO_API_KEY_<NAME>` is simpler for 2-3 projects
