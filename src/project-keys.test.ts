import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveProjectKey, getClient } from "./project-keys.js";
import { LocoClient } from "./loco-client.js";

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

describe("getClient", () => {
  const savedEnv = process.env;

  function stubFetch() {
    const mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
      headers: new Headers(),
    });
    vi.stubGlobal("fetch", mock);
    return mock;
  }

  async function getUsedApiKey(client: LocoClient): Promise<string> {
    const fetchMock = stubFetch();
    await client.listLocales();
    const [, options] = fetchMock.mock.calls[0];
    return options.headers.Authorization.replace("Loco ", "");
  }

  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.LOCO_API_KEY;
    delete process.env.LOCO_PROJECTS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = savedEnv;
  });

  it("uses explicit apiKey when provided", async () => {
    const client = getClient("explicit-key");
    expect(await getUsedApiKey(client)).toBe("explicit-key");
  });

  it("resolves project name to API key", async () => {
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    const client = getClient(undefined, "mobile");
    expect(await getUsedApiKey(client)).toBe("mobile-key");
  });

  it("falls back to LOCO_API_KEY when no apiKey or project", async () => {
    process.env.LOCO_API_KEY = "default-key";
    const client = getClient();
    expect(await getUsedApiKey(client)).toBe("default-key");
  });

  it("falls back to LOCO_API_KEY when project is unresolvable", async () => {
    process.env.LOCO_API_KEY = "default-key";
    const client = getClient(undefined, "unknown-project");
    expect(await getUsedApiKey(client)).toBe("default-key");
  });

  it("explicit apiKey takes priority over project and env", async () => {
    process.env.LOCO_API_KEY = "default-key";
    process.env.LOCO_API_KEY_MOBILE = "mobile-key";
    const client = getClient("explicit-key", "mobile");
    expect(await getUsedApiKey(client)).toBe("explicit-key");
  });

  it("throws when no key found by any method", () => {
    expect(() => getClient()).toThrow(
      "No API key found. Provide apiKey, use project name (with LOCO_API_KEY_<NAME> or LOCO_PROJECTS env), or set LOCO_API_KEY."
    );
  });
});
