# Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest test suite covering project key resolution and the LocoClient HTTP client.

**Architecture:** Extract `resolveProjectKey`/`getClient` into `src/project-keys.ts` for testability. Test key resolution via `process.env` manipulation. Test HTTP client via `global.fetch` mocking. TDD throughout.

**Tech Stack:** Vitest, TypeScript (ES2022, NodeNext modules)

**Spec:** `docs/superpowers/specs/2026-03-23-test-suite-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `vitest.config.ts` | Create | Vitest configuration |
| `package.json` | Modify | Add vitest devDep + test script |
| `src/project-keys.ts` | Create | Exported `resolveProjectKey()` and `getClient()` |
| `src/index.ts` | Modify | Import from `project-keys.ts` instead of inline functions |
| `src/project-keys.test.ts` | Create | Tests for key resolution logic |
| `src/loco-client.test.ts` | Create | Tests for HTTP client methods |

---

### Task 1: Setup Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

```bash
npm test
```

Expected: exits with "No test files found" or similar (not a crash).

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: Add vitest test runner"
```

---

### Task 2: Extract project-keys module

**Files:**
- Create: `src/project-keys.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/project-keys.ts`**

Extract `resolveProjectKey` and `getClient` from `src/index.ts`:

```ts
import { LocoClient } from "./loco-client.js";

export function resolveProjectKey(project: string): string | undefined {
  const envKey = `LOCO_API_KEY_${project.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  if (process.env[envKey]) return process.env[envKey];

  const projectsJson = process.env.LOCO_PROJECTS;
  if (projectsJson) {
    try {
      const projects = JSON.parse(projectsJson);
      if (projects[project]) return projects[project];
    } catch {
      // Invalid JSON, fall through
    }
  }
  return undefined;
}

export function getClient(apiKey?: string, project?: string): LocoClient {
  const key =
    apiKey ||
    (project ? resolveProjectKey(project) : undefined) ||
    process.env.LOCO_API_KEY;
  if (!key) {
    throw new Error(
      "No API key found. Provide apiKey, use project name (with LOCO_API_KEY_<NAME> or LOCO_PROJECTS env), or set LOCO_API_KEY."
    );
  }
  return new LocoClient(key);
}
```

- [ ] **Step 2: Update `src/index.ts`**

Remove the `resolveProjectKey` and `getClient` functions from `index.ts`. Replace with:

```ts
import { getClient } from "./project-keys.js";
```

Remove the `import { LocoClient }` line from index.ts since it's no longer needed there.

- [ ] **Step 3: Verify build still works**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/project-keys.ts src/index.ts
git commit -m "refactor: Extract project key resolution into separate module"
```

---

### Task 3: Test `resolveProjectKey`

**Files:**
- Create: `src/project-keys.test.ts`

- [ ] **Step 1: Write failing tests for `resolveProjectKey`**

Create `src/project-keys.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveProjectKey } from "./project-keys.js";

describe("resolveProjectKey", () => {
  const savedEnv = process.env;

  beforeEach(() => {
    process.env = { ...savedEnv };
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it("resolves from named env var LOCO_API_KEY_<NAME>", () => {
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    expect(resolveProjectKey("mobile")).toBe("mobile-key");
  });

  it("uppercases project name for env var lookup", () => {
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    expect(resolveProjectKey("Mobile")).toBe("mobile-key");
  });

  it("replaces non-alphanumeric chars with underscore", () => {
    process.env.LOCO_API_KEY_MY_APP = "my-app-key";
    expect(resolveProjectKey("my-app")).toBe("my-app-key");
  });

  it("resolves from LOCO_PROJECTS JSON", () => {
    process.env.LOCO_PROJECTS = '{"mobile":"json-key"}';
    expect(resolveProjectKey("mobile")).toBe("json-key");
  });

  it("LOCO_PROJECTS lookup is case-sensitive", () => {
    process.env.LOCO_PROJECTS = '{"Mobile":"json-key"}';
    expect(resolveProjectKey("mobile")).toBeUndefined();
  });

  it("named env var takes priority over LOCO_PROJECTS", () => {
    process.env.LOCO_API_KEY_MOBILE = "env-key";
    process.env.LOCO_PROJECTS = '{"mobile":"json-key"}';
    expect(resolveProjectKey("mobile")).toBe("env-key");
  });

  it("returns undefined for invalid LOCO_PROJECTS JSON", () => {
    process.env.LOCO_PROJECTS = "not-json";
    expect(resolveProjectKey("mobile")).toBeUndefined();
  });

  it("returns undefined for unknown project", () => {
    expect(resolveProjectKey("nonexistent")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: Tests should PASS (the functions are already implemented). If any fail, there's a bug.

- [ ] **Step 3: Commit**

```bash
git add src/project-keys.test.ts
git commit -m "test: Add resolveProjectKey tests"
```

---

### Task 4: Test `getClient`

**Files:**
- Modify: `src/project-keys.test.ts`

- [ ] **Step 1: Add `getClient` tests**

Append to `src/project-keys.test.ts`:

```ts
import { getClient } from "./project-keys.js";
import { LocoClient } from "./loco-client.js";

describe("getClient", () => {
  const savedEnv = process.env;

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.LOCO_API_KEY;
    delete process.env.LOCO_PROJECTS;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  it("uses explicit apiKey when provided", () => {
    const client = getClient("explicit-key");
    expect(client).toBeInstanceOf(LocoClient);
  });

  it("resolves project name to API key", () => {
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    const client = getClient(undefined, "mobile");
    expect(client).toBeInstanceOf(LocoClient);
  });

  it("falls back to LOCO_API_KEY when no apiKey or project", () => {
    process.env.LOCO_API_KEY = "default-key";
    const client = getClient();
    expect(client).toBeInstanceOf(LocoClient);
  });

  it("falls back to LOCO_API_KEY when project is unresolvable", () => {
    process.env.LOCO_API_KEY = "default-key";
    const client = getClient(undefined, "unknown-project");
    expect(client).toBeInstanceOf(LocoClient);
  });

  it("explicit apiKey takes priority over project and env", () => {
    process.env.LOCO_API_KEY = "default-key";
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    const client = getClient("explicit-key", "mobile");
    expect(client).toBeInstanceOf(LocoClient);
  });

  it("throws when no key found by any method", () => {
    expect(() => getClient()).toThrow(
      "No API key found. Provide apiKey, use project name (with LOCO_API_KEY_<NAME> or LOCO_PROJECTS env), or set LOCO_API_KEY."
    );
  });
});
```

Note: We can only verify a `LocoClient` instance is returned since `apiKey` is a private field. The important thing is it doesn't throw.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/project-keys.test.ts
git commit -m "test: Add getClient tests"
```

---

### Task 5: Test LocoClient — GET methods and auth

**Files:**
- Create: `src/loco-client.test.ts`

- [ ] **Step 1: Write tests for auth header and GET methods**

Create `src/loco-client.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocoClient } from "./loco-client.js";

function mockFetchJson(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  });
}

function mockFetchRaw(content: string, contentType = "application/json", status = 200) {
  const buffer = Buffer.from(content, "utf-8");
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    headers: new Headers({ "content-type": contentType }),
  });
}

describe("LocoClient", () => {
  let client: LocoClient;

  beforeEach(() => {
    client = new LocoClient("test-api-key");
    vi.restoreAllMocks();
  });

  describe("auth", () => {
    it("sends Authorization header with Loco prefix", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.listLocales();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Authorization).toBe("Loco test-api-key");
    });
  });

  describe("GET methods via request", () => {
    it("listLocales calls GET /locales", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.listLocales();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales");
    });

    it("listAssets calls GET /assets", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.listAssets();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets");
    });

    it("listAssets with filter encodes filter param", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.listAssets("tag1,!tag2");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets?filter=tag1%2C%21tag2");
    });

    it("getAsset encodes asset ID in URL", async () => {
      const fetchMock = mockFetchJson({ id: "foo/bar" });
      global.fetch = fetchMock;

      await client.getAsset("foo/bar");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/foo%2Fbar.json");
    });

    it("getTranslation encodes both asset and locale", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.getTranslation("asset/1", "en_US");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset%2F1/en_US");
    });

    it("getTranslations encodes asset ID", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.getTranslations("asset/1");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset%2F1.json");
    });

    it("listTags calls GET /tags", async () => {
      const fetchMock = mockFetchJson([]);
      global.fetch = fetchMock;

      await client.listTags();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags");
    });

    it("getLocale encodes locale in URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.getLocale("en_US");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/en_US");
    });

    it("importProgress encodes job ID", async () => {
      const fetchMock = mockFetchJson({ progress: 100 });
      global.fetch = fetchMock;

      await client.importProgress("job/123");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/import/progress/job%2F123");
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/loco-client.test.ts
git commit -m "test: Add LocoClient GET method and auth tests"
```

---

### Task 6: Test LocoClient — export methods (requestRaw path)

**Files:**
- Modify: `src/loco-client.test.ts`

- [ ] **Step 1: Add export method tests**

Append inside the `describe("LocoClient")` block:

```ts
  describe("GET methods via requestRaw (exports)", () => {
    it("exportLocale builds correct URL with query params", async () => {
      const fetchMock = mockFetchRaw('{"key":"value"}');
      global.fetch = fetchMock;

      const result = await client.exportLocale("fr", "json", { filter: "tag1", fallback: "en" });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("https://localise.biz/api/export/locale/fr.json?");
      expect(url).toContain("filter=tag1");
      expect(url).toContain("fallback=en");
      expect(result).toBe('{"key":"value"}');
    });

    it("exportLocale omits undefined params from query string", async () => {
      const fetchMock = mockFetchRaw('{"key":"value"}');
      global.fetch = fetchMock;

      await client.exportLocale("fr", "json", { filter: "tag1", fallback: undefined });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("filter=tag1");
      expect(url).not.toContain("fallback");
    });

    it("exportLocale with no params omits query string", async () => {
      const fetchMock = mockFetchRaw("content");
      global.fetch = fetchMock;

      await client.exportLocale("fr", "json");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/locale/fr.json");
    });

    it("exportAll builds correct URL", async () => {
      const fetchMock = mockFetchRaw("content");
      global.fetch = fetchMock;

      await client.exportAll("json", {});

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/all.json");
    });

    it("exportArchive returns base64-encoded content", async () => {
      const content = "zip-binary-content";
      const buffer = Buffer.from(content, "utf-8");
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
        headers: new Headers({ "content-type": "application/zip" }),
      });

      const result = await client.exportArchive("json", {});

      expect(result).toBe(buffer.toString("base64"));
    });

    it("exportTemplate builds correct URL", async () => {
      const fetchMock = mockFetchRaw("content");
      global.fetch = fetchMock;

      await client.exportTemplate("pot", {});

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/template.pot");
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/loco-client.test.ts
git commit -m "test: Add LocoClient export method tests (requestRaw path)"
```

---

### Task 7: Test LocoClient — POST methods

**Files:**
- Modify: `src/loco-client.test.ts`

- [ ] **Step 1: Add POST method tests**

Append inside the `describe("LocoClient")` block:

```ts
  describe("POST methods", () => {
    it("createAsset sends form-urlencoded body", async () => {
      const fetchMock = mockFetchJson({ id: "new-asset" });
      global.fetch = fetchMock;

      await client.createAsset({ id: "new-asset", text: "Hello" });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("id=new-asset");
      expect(options.body).toContain("text=Hello");
    });

    it("updateTranslation sends text/plain body", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.updateTranslation("asset1", "fr", "Bonjour");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe("Bonjour");
    });

    it("tagAsset sends form-urlencoded body", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.tagAsset("asset1", "my-tag");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1/tags");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("name=my-tag");
    });

    it("importFile sends text/plain body with query params", async () => {
      const fetchMock = mockFetchJson({ status: 200, message: "OK" });
      global.fetch = fetchMock;

      await client.importFile("json", '{"key":"value"}', { locale: "fr" } as any);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("https://localise.biz/api/import/json");
      expect(url).toContain("locale=fr");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe('{"key":"value"}');
    });

    it("flagTranslation sends form-urlencoded flag", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.flagTranslation("asset1", "fr", "fuzzy");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr/flag");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("flag=fuzzy");
    });

    it("createLocale sends form-urlencoded code", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.createLocale("fr_FR");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("code=fr_FR");
    });

    it("createTag sends form-urlencoded name", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.createTag("new-tag");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("name=new-tag");
    });

    it("batchTagAssets sends comma-joined IDs as text/plain", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.batchTagAssets("my-tag", ["asset1", "asset2", "asset3"]);

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/my-tag.json");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe("asset1,asset2,asset3");
    });
  });
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/loco-client.test.ts
git commit -m "test: Add LocoClient POST method tests"
```

---

### Task 8: Test LocoClient — PATCH, DELETE, and error handling

**Files:**
- Modify: `src/loco-client.test.ts`

- [ ] **Step 1: Add PATCH, DELETE, and error handling tests**

Append inside the `describe("LocoClient")` block:

```ts
  describe("PATCH methods", () => {
    it("updateAsset sends JSON body", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.updateAsset("asset1", { id: "new-id", context: "ctx" });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1.json");
      expect(options.method).toBe("PATCH");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual({ id: "new-id", context: "ctx" });
    });

    it("updateLocale sends JSON body", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.updateLocale("en", { code: "en_US", name: "English US" });

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/en");
      expect(options.method).toBe("PATCH");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("renameTag sends JSON body", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.renameTag("old-tag", "new-tag");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/old-tag.json");
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body)).toEqual({ name: "new-tag" });
    });
  });

  describe("DELETE methods", () => {
    it("deleteAsset calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.deleteAsset("asset/1");

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset%2F1.json");
      expect(options.method).toBe("DELETE");
    });

    it("eraseTranslation calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.eraseTranslation("asset1", "fr");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr");
    });

    it("unflagTranslation calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.unflagTranslation("asset1", "fr");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr/flag");
    });

    it("untagAsset calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.untagAsset("asset1", "my-tag");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1/tags/my-tag.json");
    });

    it("deleteLocale calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.deleteLocale("fr");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/fr");
    });

    it("deleteTag calls correct URL", async () => {
      const fetchMock = mockFetchJson({});
      global.fetch = fetchMock;

      await client.deleteTag("my-tag");

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/my-tag.json");
    });
  });

  describe("error handling", () => {
    it("throws on non-200 response via request", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
        headers: new Headers(),
      });

      await expect(client.listLocales()).rejects.toThrow("Loco API error (401): Unauthorized");
    });

    it("throws on non-200 response via requestRaw", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
        headers: new Headers(),
      });

      await expect(client.exportLocale("fr", "json")).rejects.toThrow(
        "Loco API error (404): Not Found"
      );
    });

    it("returns raw text when JSON parse fails", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("plain text response"),
        headers: new Headers(),
      });

      const result = await client.listLocales();
      expect(result).toBe("plain text response");
    });
  });
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/loco-client.test.ts
git commit -m "test: Add LocoClient PATCH, DELETE, and error handling tests"
```

---

### Task 9: Final validation

- [ ] **Step 1: Run full test suite and build**

```bash
npm test && npm run build
```

Expected: All tests pass, build succeeds.

- [ ] **Step 2: Verify type checking**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Final commit if any cleanup needed**

Only if adjustments were made during validation.
