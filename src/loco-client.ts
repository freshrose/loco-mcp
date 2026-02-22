import {
  Asset,
  Translation,
  SuccessResponse,
  Locale,
  ExportParams,
  ImportParams,
  ImportResult,
  ImportProgress,
  LocaleError,
  LocaleProgress,
} from "./types.js";

const BASE_URL = "https://localise.biz/api";

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      qs.append(key, String(value));
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : "";
}

export class LocoClient {
  constructor(
    private apiKey: string,
    private baseUrl: string = BASE_URL
  ) {}

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    contentType: string = "application/json"
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Loco ${this.apiKey}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      if (contentType === "text/plain") {
        headers["Content-Type"] = "text/plain";
        options.body = body as string;
      } else if (contentType === "application/x-www-form-urlencoded") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
          if (value !== undefined) {
            params.append(key, String(value));
          }
        }
        options.body = params.toString();
      } else {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
      }
    }

    const response = await fetch(url, options);
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`Loco API error (${response.status}): ${text}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  // region Locale methods

  async listLocales(): Promise<Locale[]> {
    const endpoint = "/locales";
    return this.request<Locale[]>("GET", endpoint);
  }

  // endregion

  // region Asset methods

  async listAssets(filter?: string): Promise<Asset[]> {
    const endpoint = filter ? `/assets?filter=${encodeURIComponent(filter)}` : "/assets";
    return this.request<Asset[]>("GET", endpoint);
  }

  async getAsset(assetId: string): Promise<Asset> {
    return this.request<Asset>("GET", `/assets/${encodeURIComponent(assetId)}.json`);
  }

  async createAsset(params: {
    id?: string;
    text?: string;
    type?: "text" | "html" | "xml";
    context?: string;
    notes?: string;
  }): Promise<Asset> {
    return this.request<Asset>("POST", "/assets", params, "application/x-www-form-urlencoded");
  }

  async updateAsset(
    assetId: string,
    params: {
      id?: string;
      type?: "text" | "html" | "xml";
      context?: string;
      notes?: string;
    }
  ): Promise<Asset> {
    return this.request<Asset>(
      "PATCH",
      `/assets/${encodeURIComponent(assetId)}.json`,
      params
    );
  }

  async deleteAsset(assetId: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/assets/${encodeURIComponent(assetId)}.json`
    );
  }

  // endregion

  // region Translation methods

  async getTranslations(assetId: string): Promise<Translation[]> {
    return this.request<Translation[]>(
      "GET",
      `/translations/${encodeURIComponent(assetId)}.json`
    );
  }

  async getTranslation(assetId: string, locale: string): Promise<Translation> {
    return this.request<Translation>(
      "GET",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}`
    );
  }

  async updateTranslation(
    assetId: string,
    locale: string,
    text: string
  ): Promise<Translation> {
    return this.request<Translation>(
      "POST",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}`,
      text,
      "text/plain"
    );
  }

  // endregion

  // region Tag methods

  async listTags(): Promise<string[]> {
    return this.request<string[]>("GET", "/tags");
  }

  async tagAsset(assetId: string, tag: string): Promise<Asset> {
    return this.request<Asset>(
      "POST",
      `/assets/${encodeURIComponent(assetId)}/tags`,
      { name: tag },
      "application/x-www-form-urlencoded"
    );
  }

  async untagAsset(assetId: string, tag: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/assets/${encodeURIComponent(assetId)}/tags/${encodeURIComponent(tag)}.json`
    );
  }

  // endregion

  // region Export methods

  private async requestRaw(
    method: string,
    endpoint: string,
    body?: string,
    contentType?: string
  ): Promise<{ data: Buffer; contentType: string }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Loco ${this.apiKey}`,
    };
    const options: RequestInit = { method, headers };

    if (body !== undefined) {
      headers["Content-Type"] = contentType || "text/plain";
      options.body = body;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Loco API error (${response.status}): ${text}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      data: buffer,
      contentType: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  async exportLocale(
    locale: string,
    ext: string,
    params?: ExportParams
  ): Promise<string> {
    const query = buildQueryString(params as Record<string, unknown>);
    const endpoint = `/export/locale/${encodeURIComponent(locale)}.${encodeURIComponent(ext)}${query}`;
    const { data } = await this.requestRaw("GET", endpoint);
    return data.toString("utf-8");
  }

  async exportAll(ext: string, params?: ExportParams): Promise<string> {
    const query = buildQueryString(params as Record<string, unknown>);
    const endpoint = `/export/all.${encodeURIComponent(ext)}${query}`;
    const { data } = await this.requestRaw("GET", endpoint);
    return data.toString("utf-8");
  }

  async exportArchive(ext: string, params?: ExportParams): Promise<string> {
    const query = buildQueryString(params as Record<string, unknown>);
    const endpoint = `/export/archive/${encodeURIComponent(ext)}.zip${query}`;
    const { data } = await this.requestRaw("GET", endpoint);
    return data.toString("base64");
  }

  async exportTemplate(ext: string, params?: ExportParams): Promise<string> {
    const query = buildQueryString(params as Record<string, unknown>);
    const endpoint = `/export/template.${encodeURIComponent(ext)}${query}`;
    const { data } = await this.requestRaw("GET", endpoint);
    return data.toString("utf-8");
  }

  // endregion

  // region Import methods

  async importFile(
    ext: string,
    content: string,
    params?: ImportParams
  ): Promise<ImportResult> {
    const query = buildQueryString(params as Record<string, unknown>);
    const endpoint = `/import/${encodeURIComponent(ext)}${query}`;
    return this.request<ImportResult>("POST", endpoint, content, "text/plain");
  }

  async importProgress(jobId: string): Promise<ImportProgress> {
    return this.request<ImportProgress>(
      "GET",
      `/import/progress/${encodeURIComponent(jobId)}`
    );
  }

  // endregion

  // region Translation extended methods

  async eraseTranslation(assetId: string, locale: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}`
    );
  }

  async flagTranslation(
    assetId: string,
    locale: string,
    flag: string
  ): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "POST",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}/flag`,
      { flag },
      "application/x-www-form-urlencoded"
    );
  }

  async unflagTranslation(assetId: string, locale: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}/flag`
    );
  }

  async getTranslationRevisions(assetId: string, locale: string): Promise<Translation[]> {
    return this.request<Translation[]>(
      "GET",
      `/translations/${encodeURIComponent(assetId)}/${encodeURIComponent(locale)}/revisions`
    );
  }

  // endregion

  // region Locale extended methods

  async createLocale(code: string): Promise<Locale> {
    return this.request<Locale>(
      "POST",
      "/locales",
      { code },
      "application/x-www-form-urlencoded"
    );
  }

  async getLocale(locale: string): Promise<Locale> {
    return this.request<Locale>(
      "GET",
      `/locales/${encodeURIComponent(locale)}`
    );
  }

  async updateLocale(
    locale: string,
    params: { code?: string; name?: string }
  ): Promise<Locale> {
    return this.request<Locale>(
      "PATCH",
      `/locales/${encodeURIComponent(locale)}`,
      params
    );
  }

  async deleteLocale(locale: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/locales/${encodeURIComponent(locale)}`
    );
  }

  async getLocaleErrors(locale: string): Promise<LocaleError[]> {
    return this.request<LocaleError[]>(
      "GET",
      `/locales/${encodeURIComponent(locale)}/errors`
    );
  }

  async getLocaleProgress(locale: string): Promise<LocaleProgress> {
    return this.request<LocaleProgress>(
      "GET",
      `/locales/${encodeURIComponent(locale)}/progress`
    );
  }

  // endregion

  // region Tag extended methods

  async createTag(name: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "POST",
      "/tags",
      { name },
      "application/x-www-form-urlencoded"
    );
  }

  async batchTagAssets(tag: string, assetIds: string[]): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "POST",
      `/tags/${encodeURIComponent(tag)}.json`,
      assetIds.join(","),
      "text/plain"
    );
  }

  async renameTag(tag: string, newName: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "PATCH",
      `/tags/${encodeURIComponent(tag)}.json`,
      { name: newName }
    );
  }

  async deleteTag(tag: string): Promise<SuccessResponse> {
    return this.request<SuccessResponse>(
      "DELETE",
      `/tags/${encodeURIComponent(tag)}.json`
    );
  }

  // endregion
}
