# Test Suite Design

**Date**: 2026-03-23
**Status**: Approved

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

**`getClient` cases:**
- Explicit `apiKey` parameter takes highest priority
- `project` parameter resolves via `resolveProjectKey`
- Falls back to `LOCO_API_KEY` env var when no apiKey or project
- Throws descriptive error when no key found by any method
- Returns a `LocoClient` instance with the resolved key

### `src/loco-client.test.ts`

Tests for `LocoClient` HTTP methods with mocked `global.fetch`.

**Auth:**
- All requests include `Authorization: Loco <key>` header

**GET methods:**
- `listLocales()` → `GET /locales`
- `listAssets()` → `GET /assets`
- `listAssets(filter)` → `GET /assets?filter=<encoded>`
- `getAsset(id)` → `GET /assets/<encoded>.json`
- `getTranslation(asset, locale)` → correct URL encoding
- `exportLocale(locale, ext, params)` → correct query string construction

**POST methods:**
- `createAsset(params)` → `application/x-www-form-urlencoded` body
- `updateTranslation(asset, locale, text)` → `text/plain` body
- `tagAsset(asset, tag)` → `application/x-www-form-urlencoded` body
- `importFile(ext, content, params)` → `text/plain` body with query string params
- `flagTranslation(asset, locale, flag)` → `application/x-www-form-urlencoded`

**PATCH methods:**
- `updateAsset(id, params)` → `application/json` body
- `updateLocale(locale, params)` → `application/json` body
- `renameTag(tag, newName)` → `application/json` body

**DELETE methods:**
- `deleteAsset(id)` → correct URL
- `eraseTranslation(asset, locale)` → correct URL
- `unflagTranslation(asset, locale)` → correct URL

**Error handling:**
- Non-200 response throws `Error` with status code and response body
- JSON parse failure returns raw text (not an error)

**`buildQueryString` (via export or indirectly):**
- Omits `undefined` and `null` values
- Encodes values correctly
- Returns empty string when no params

## Out of Scope

- `index.test.ts` for MCP tool registration wiring — each tool is a thin pass-through to `getClient()` + one client method. The two test files above cover the meaningful logic.
- Contract tests against the real Loco API — would require a test API key.

## Configuration

- `vitest.config.ts` at project root
- `vitest` added as devDependency
- `"test": "vitest run"` script in `package.json`
