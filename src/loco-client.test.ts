import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocoClient } from "./loco-client.js";

function stubFetchJson(data: unknown, status = 200) {
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function stubFetchRaw(content: string, contentType = "application/json", status = 200) {
  const buffer = Buffer.from(content, "utf-8");
  const mock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(content),
    arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    headers: new Headers({ "content-type": contentType }),
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

describe("LocoClient", () => {
  let client: LocoClient;

  beforeEach(() => {
    client = new LocoClient("test-api-key");
    vi.restoreAllMocks();
  });

  describe("auth", () => {
    it("sends Authorization header with Loco prefix", async () => {
      const fetchMock = stubFetchJson([]);

      await client.listLocales();

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers.Authorization).toBe("Loco test-api-key");
    });
  });

  describe("GET methods via request", () => {
    it("listLocales calls GET /locales", async () => {
      const fetchMock = stubFetchJson([]);
      await client.listLocales();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales");
    });

    it("listAssets calls GET /assets", async () => {
      const fetchMock = stubFetchJson([]);
      await client.listAssets();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets");
    });

    it("listAssets with filter encodes filter param", async () => {
      const fetchMock = stubFetchJson([]);
      await client.listAssets("tag1,!tag2");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets?filter=tag1%2C!tag2");
    });

    it("getAsset encodes asset ID in URL", async () => {
      const fetchMock = stubFetchJson({ id: "foo/bar" });
      await client.getAsset("foo/bar");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/foo%2Fbar.json");
    });

    it("getTranslation encodes both asset and locale", async () => {
      const fetchMock = stubFetchJson({});
      await client.getTranslation("asset/1", "en_US");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset%2F1/en_US");
    });

    it("getTranslations encodes asset ID", async () => {
      const fetchMock = stubFetchJson([]);
      await client.getTranslations("asset/1");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset%2F1.json");
    });

    it("listTags calls GET /tags", async () => {
      const fetchMock = stubFetchJson([]);
      await client.listTags();
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags");
    });

    it("getLocale encodes locale in URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.getLocale("en_US");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/en_US");
    });

    it("importProgress encodes job ID", async () => {
      const fetchMock = stubFetchJson({ progress: 100 });
      await client.importProgress("job/123");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/import/progress/job%2F123");
    });
  });

  describe("GET methods via requestRaw (exports)", () => {
    it("exportLocale builds correct URL with query params", async () => {
      const fetchMock = stubFetchRaw('{"key":"value"}');
      const result = await client.exportLocale("fr", "json", { filter: "tag1", fallback: "en" });
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("https://localise.biz/api/export/locale/fr.json?");
      expect(url).toContain("filter=tag1");
      expect(url).toContain("fallback=en");
      expect(result).toBe('{"key":"value"}');
    });

    it("exportLocale omits undefined params from query string", async () => {
      const fetchMock = stubFetchRaw('{"key":"value"}');
      await client.exportLocale("fr", "json", { filter: "tag1", fallback: undefined });
      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain("filter=tag1");
      expect(url).not.toContain("fallback");
    });

    it("exportLocale with no params omits query string", async () => {
      const fetchMock = stubFetchRaw("content");
      await client.exportLocale("fr", "json");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/locale/fr.json");
    });

    it("exportAll builds correct URL", async () => {
      const fetchMock = stubFetchRaw("content");
      await client.exportAll("json", {});
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/all.json");
    });

    it("exportArchive returns base64-encoded content", async () => {
      const content = "zip-binary-content";
      const buffer = Buffer.from(content, "utf-8");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
        headers: new Headers({ "content-type": "application/zip" }),
      }));
      const result = await client.exportArchive("json", {});
      expect(result).toBe(buffer.toString("base64"));
    });

    it("exportTemplate builds correct URL", async () => {
      const fetchMock = stubFetchRaw("content");
      await client.exportTemplate("pot", {});
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/export/template.pot");
    });
  });

  describe("POST methods", () => {
    it("createAsset sends form-urlencoded body", async () => {
      const fetchMock = stubFetchJson({ id: "new-asset" });
      await client.createAsset({ id: "new-asset", text: "Hello" });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("id=new-asset");
      expect(options.body).toContain("text=Hello");
    });

    it("updateTranslation sends text/plain body", async () => {
      const fetchMock = stubFetchJson({});
      await client.updateTranslation("asset1", "fr", "Bonjour");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe("Bonjour");
    });

    it("tagAsset sends form-urlencoded body", async () => {
      const fetchMock = stubFetchJson({});
      await client.tagAsset("asset1", "my-tag");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1/tags");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("name=my-tag");
    });

    it("importFile sends text/plain body with query params", async () => {
      const fetchMock = stubFetchJson({ status: 200, message: "OK" });
      await client.importFile("json", '{"key":"value"}', { locale: "fr" } as any);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toContain("https://localise.biz/api/import/json");
      expect(url).toContain("locale=fr");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe('{"key":"value"}');
    });

    it("flagTranslation sends form-urlencoded flag", async () => {
      const fetchMock = stubFetchJson({});
      await client.flagTranslation("asset1", "fr", "fuzzy");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr/flag");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("flag=fuzzy");
    });

    it("createLocale sends form-urlencoded code", async () => {
      const fetchMock = stubFetchJson({});
      await client.createLocale("fr_FR");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("code=fr_FR");
    });

    it("createTag sends form-urlencoded name", async () => {
      const fetchMock = stubFetchJson({});
      await client.createTag("new-tag");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags");
      expect(options.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(options.body).toContain("name=new-tag");
    });

    it("batchTagAssets sends comma-joined IDs as text/plain", async () => {
      const fetchMock = stubFetchJson({});
      await client.batchTagAssets("my-tag", ["asset1", "asset2", "asset3"]);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/my-tag.json");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("text/plain");
      expect(options.body).toBe("asset1,asset2,asset3");
    });
  });

  describe("PATCH methods", () => {
    it("updateAsset sends JSON body", async () => {
      const fetchMock = stubFetchJson({});
      await client.updateAsset("asset1", { id: "new-id", context: "ctx" });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1.json");
      expect(options.method).toBe("PATCH");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(options.body)).toEqual({ id: "new-id", context: "ctx" });
    });

    it("updateLocale sends JSON body", async () => {
      const fetchMock = stubFetchJson({});
      await client.updateLocale("en", { code: "en_US", name: "English US" });
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/en");
      expect(options.method).toBe("PATCH");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("renameTag sends JSON body", async () => {
      const fetchMock = stubFetchJson({});
      await client.renameTag("old-tag", "new-tag");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/old-tag.json");
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body)).toEqual({ name: "new-tag" });
    });
  });

  describe("DELETE methods", () => {
    it("deleteAsset calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.deleteAsset("asset/1");
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset%2F1.json");
      expect(options.method).toBe("DELETE");
    });

    it("eraseTranslation calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.eraseTranslation("asset1", "fr");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr");
    });

    it("unflagTranslation calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.unflagTranslation("asset1", "fr");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/translations/asset1/fr/flag");
    });

    it("untagAsset calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.untagAsset("asset1", "my-tag");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/assets/asset1/tags/my-tag.json");
    });

    it("deleteLocale calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.deleteLocale("fr");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/locales/fr");
    });

    it("deleteTag calls correct URL", async () => {
      const fetchMock = stubFetchJson({});
      await client.deleteTag("my-tag");
      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe("https://localise.biz/api/tags/my-tag.json");
    });
  });

  describe("error handling", () => {
    it("throws on non-200 response via request", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
        headers: new Headers(),
      }));
      await expect(client.listLocales()).rejects.toThrow("Loco API error (401): Unauthorized");
    });

    it("throws on non-200 response via requestRaw", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
        headers: new Headers(),
      }));
      await expect(client.exportLocale("fr", "json")).rejects.toThrow(
        "Loco API error (404): Not Found"
      );
    });

    it("returns raw text when JSON parse fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("plain text response"),
        headers: new Headers(),
      }));
      const result = await client.listLocales();
      expect(result).toBe("plain text response");
    });
  });
});
