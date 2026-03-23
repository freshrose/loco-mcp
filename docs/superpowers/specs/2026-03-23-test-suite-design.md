# Test Suite Design

**Date**: 2026-03-23
**Status**: In Review

## Goal

Add a test suite to the loco-mcp project covering key resolution logic and the HTTP client.

## Framework

- **Vitest** — already anticipated by tsconfig (excludes `src/**/*.test.ts` and `vitest.config.ts`)
- Global `fetch` mocking via `vi.fn()`
- `process.env` manipulation for key resolution tests
- No additional test dependencies beyond `vitest`

## Prerequisite: Export utilities

`resolveProjectKey()` and `getClient()` in `src/index.ts` are currently unexported module-level functions. To test them directly, extract them into a separate file (`src/project-keys.ts`) and import from both `index.ts` and the test file.

## Test Files

### `src/project-keys.test.ts`

Tests for `resolveProjectKey()` and `getClient()`.

**`resolveProjectKey` cases:**
- Named env var lookup: `LOCO_API_KEY_MOBILE` resolves for project `"mobile"`
- JSON `LOCO_PROJECTS` lookup: `{"mobile":"key123"}` resolves for project `"mobile"`
- Non-alphanumeric chars become `_`: project `"my-app"` checks `LOCO_API_KEY_MY_APP`
- Invalid JSON in `LOCO_PROJECTS` returns `undefined` (no throw)
- Unknown project name returns `undefined`
- Named env var takes priority over `LOCO_PROJECTS` when both set
- Case sensitivity in `LOCO_PROJECTS` JSON: `{"Mobile":"key"}` does NOT resolve for `"mobile"` (lowercase), confirming asymmetric case handling vs env var lookup

**`getClient` cases:**
- Explicit `apiKey` parameter takes highest priority
- `project` parameter resolves via `resolveProjectKey`
- Falls back to `LOCO_API_KEY` env var when no apiKey or project
- Unresolvable `project` name falls back to `LOCO_API_KEY` (silent fallback behavior)
- Throws descriptive error when no key found by any method
- Returns a `LocoClient` instance with the resolved key

### `src/loco-client.test.ts`

Tests for `LocoClient` HTTP methods with mocked `global.fetch`.

The client has two internal dispatch methods: `request<T>` (JSON parsing) and `requestRaw` (Buffer/arrayBuffer for exports). Tests cover representative methods from each HTTP verb and content type, plus both dispatch paths.

**Strategy**: Not every method needs its own test — methods that follow the same pattern (e.g., simple GET with URL encoding) are grouped under representative tests. Methods with unique behavior get explicit coverage.

**Auth:**
- All requests include `Authorization: Loco <key>` header

**GET methods (via `request`):**
- `listLocales()` → `GET /locales`
- `listAssets()` → `GET /assets`
- `listAssets(filter)` → `GET /assets?filter=<encoded>`
- `getAsset(id)` → `GET /assets/<encoded>.json`
- `getTranslation(asset, locale)` → correct URL encoding of both params
- `getTranslations(assetId)` → `GET /translations/<encoded>.json`
- `listTags()` → `GET /tags`
- `getLocale(locale)` → `GET /locales/<encoded>`
- `importProgress(jobId)` → `GET /import/progress/<encoded>`

**GET methods (via `requestRaw` — export path):**
- `exportLocale(locale, ext, params)` → correct query string, returns UTF-8 string
- `exportAll(ext, params)` → correct URL pattern
- `exportArchive(ext, params)` → returns base64-encoded string
- `exportTemplate(ext, params)` → correct URL pattern

**POST methods:**
- `createAsset(params)` → `application/x-www-form-urlencoded` body
- `updateTranslation(asset, locale, text)` → `text/plain` body
- `tagAsset(asset, tag)` → `application/x-www-form-urlencoded` body
- `importFile(ext, content, params)` → `text/plain` body with query string params
- `flagTranslation(asset, locale, flag)` → `application/x-www-form-urlencoded`
- `createLocale(code)` → `application/x-www-form-urlencoded` with `{ code }`
- `createTag(name)` → `application/x-www-form-urlencoded` with `{ name }`
- `batchTagAssets(tag, assetIds)` → `text/plain` body with comma-joined IDs (unique pattern)

**PATCH methods:**
- `updateAsset(id, params)` → `application/json` body
- `updateLocale(locale, params)` → `application/json` body
- `renameTag(tag, newName)` → `application/json` body

**DELETE methods:**
- `deleteAsset(id)` → correct URL
- `eraseTranslation(asset, locale)` → correct URL
- `unflagTranslation(asset, locale)` → correct URL
- `untagAsset(assetId, tag)` → correct URL
- `deleteLocale(locale)` → correct URL
- `deleteTag(tag)` → correct URL

**Error handling:**
- Non-200 response throws `Error` with status code and response body (via `request`)
- Non-200 response throws `Error` with status code and response body (via `requestRaw`)
- JSON parse failure returns raw text (not an error)

**`buildQueryString` (tested indirectly via `exportLocale`):**
- `buildQueryString` is a module-private function. It is tested indirectly through export methods that pass params. The `exportLocale` tests verify: omits undefined/null values, encodes values correctly, returns empty string when no params.

## Out of Scope

- `index.test.ts` for MCP tool registration wiring — each tool is a thin pass-through to `getClient()` + one client method. The two test files above cover the meaningful logic.
- Contract tests against the real Loco API — would require a test API key.

## Configuration

- `vitest.config.ts` at project root
- `vitest` added as devDependency
- `"test": "vitest run"` script in `package.json`
