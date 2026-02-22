#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LocoClient } from "./loco-client.js";

const server = new McpServer({
  name: "loco-mcp",
  version: "2.0.0",
});

function getClient(apiKey?: string): LocoClient {
  const key = apiKey || process.env.LOCO_API_KEY;
  if (!key) {
    throw new Error(
      "No API key provided. Either pass apiKey as a tool parameter or set the LOCO_API_KEY environment variable."
    );
  }
  return new LocoClient(key);
}

// region Locale tools

server.registerTool(
    "list_locales",
    {
        description: "Lists all locales in the project. The source language will always be the first in the list",
        inputSchema: {
            apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)")
        }
    },
    async ({ apiKey }) => {
        const client = getClient(apiKey);
        const result = await client.listLocales();
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        }
    }
);

// endregion

// region Asset tools

server.registerTool(
  "list_assets",
  {
    description: "List all translatable assets in the project. Optionally filter by tags.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      filter: z
        .string()
        .optional()
        .describe(
          "Filter by comma-separated tag names. Use * to match any tag, prefix with ! to negate"
        ),
    },
  },
  async ({ apiKey, filter }) => {
    const client = getClient(apiKey);
    const result = await client.listAssets(filter);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_asset",
  {
    description: "Get a single asset by its ID",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The unique asset identifier"),
    },
  },
  async ({ apiKey, assetId }) => {
    const client = getClient(apiKey);
    const result = await client.getAsset(assetId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "create_asset",
  {
    description: "Create a new translatable asset in the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      id: z
        .string()
        .optional()
        .describe("Unique asset identifier (auto-generated if omitted)"),
      text: z
        .string()
        .optional()
        .describe("Initial source language translation (required if id is empty)"),
      context: z.string().optional().describe("Contextual information for translators"),
      notes: z.string().optional().describe("Notes/guidance for translators"),
    },
  },
  async ({ apiKey, id, text, context, notes }) => {
    const client = getClient(apiKey);
    const result = await client.createAsset({ id, text, type: 'text', context, notes });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "update_asset",
  {
    description: "Update an existing asset's properties (not tags or translations)",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier to update"),
      newId: z.string().optional().describe("New unique identifier for the asset"),
      context: z.string().optional().describe("Contextual information for translators"),
      notes: z.string().optional().describe("Notes/guidance for translators"),
    },
  },
  async ({ apiKey, assetId, newId, context, notes }) => {
    const client = getClient(apiKey);
    const result = await client.updateAsset(assetId, {
      id: newId,
      type: 'text',
      context,
      notes,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "delete_asset",
  {
    description: "Permanently delete an asset from the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier to delete"),
    },
  },
  async ({ apiKey, assetId }) => {
    const client = getClient(apiKey);
    const result = await client.deleteAsset(assetId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Translation tools

server.registerTool(
  "get_translations",
  {
    description: "Get all translations for an asset across all locales",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
    },
  },
  async ({ apiKey, assetId }) => {
    const client = getClient(apiKey);
    const result = await client.getTranslations(assetId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_translation",
  {
    description: "Get a single translation for an asset in a specific locale",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de, en_US)"),
    },
  },
  async ({ apiKey, assetId, locale }) => {
    const client = getClient(apiKey);
    const result = await client.getTranslation(assetId, locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "update_translation",
  {
    description: "Add or update a translation for an asset in a specific locale",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de, en_US)"),
      text: z.string().describe("The translation text (empty string marks as untranslated)"),
    },
  },
  async ({ apiKey, assetId, locale, text }) => {
    const client = getClient(apiKey);
    const result = await client.updateTranslation(assetId, locale, text);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Tag tools

server.registerTool(
  "list_tags",
  {
    description: "List all tags in the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
    },
  },
  async ({ apiKey }) => {
    const client = getClient(apiKey);
    const result = await client.listTags();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "tag_asset",
  {
    description: "Add a tag to an asset. Creates the tag if it doesn't exist.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier to tag"),
      tag: z.string().describe("The tag name to add"),
    },
  },
  async ({ apiKey, assetId, tag }) => {
    const client = getClient(apiKey);
    const result = await client.tagAsset(assetId, tag);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "untag_asset",
  {
    description: "Remove a tag from an asset",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      tag: z.string().describe("The tag name to remove"),
    },
  },
  async ({ apiKey, assetId, tag }) => {
    const client = getClient(apiKey);
    const result = await client.untagAsset(assetId, tag);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Export tools

server.registerTool(
  "export_locale",
  {
    description:
      "Export a single locale to a language pack file. Supports many formats: json, po, xlf, strings, xml, yml, csv, etc.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Locale code to export (e.g., en, fr, de)"),
      ext: z
        .string()
        .describe(
          "File format extension (json, po, xlf, strings, xml, yml, csv, properties, resx, etc.)"
        ),
      filter: z.string().optional().describe("Filter by comma-separated tag names"),
      fallback: z
        .string()
        .optional()
        .describe("Fallback locale for untranslated items (or 'auto')"),
      status: z
        .string()
        .optional()
        .describe("Export only assets with a specific status/flag; prefix with ! to negate"),
      order: z
        .enum(["created", "id"])
        .optional()
        .describe("Sort order: created (default) or id (alphabetical)"),
      index: z
        .string()
        .optional()
        .describe("Lookup key: id, text, or custom alias"),
      format: z
        .string()
        .optional()
        .describe("Sub-format variant (e.g., symfony, rails, chrome, i18next4)"),
    },
  },
  async ({ apiKey, locale, ext, filter, fallback, status, order, index, format }) => {
    const client = getClient(apiKey);
    const result = await client.exportLocale(locale, ext, {
      filter,
      fallback,
      status,
      order,
      index,
      format,
    });
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

server.registerTool(
  "export_all",
  {
    description:
      "Export all locales to a single multi-locale file. Supported formats: json, csv, html, sql, tmx, xlf, yml.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      ext: z
        .string()
        .describe("File format extension (json, csv, html, sql, tmx, xlf, yml)"),
      filter: z.string().optional().describe("Filter by comma-separated tag names"),
      fallback: z
        .string()
        .optional()
        .describe("Fallback locale for untranslated items"),
      status: z.string().optional().describe("Filter by status/flag"),
      format: z.string().optional().describe("Sub-format variant"),
    },
  },
  async ({ apiKey, ext, filter, fallback, status, format }) => {
    const client = getClient(apiKey);
    const result = await client.exportAll(ext, { filter, fallback, status, format });
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

server.registerTool(
  "export_archive",
  {
    description:
      "Export all locales as a zip archive (one file per locale). Returns base64-encoded zip data.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      ext: z.string().describe("File format extension for files inside the archive"),
      filter: z.string().optional().describe("Filter by comma-separated tag names"),
      fallback: z.string().optional().describe("Fallback locale for untranslated items"),
      status: z.string().optional().describe("Filter by status/flag"),
      format: z.string().optional().describe("Sub-format variant"),
    },
  },
  async ({ apiKey, ext, filter, fallback, status, format }) => {
    const client = getClient(apiKey);
    const base64 = await client.exportArchive(ext, {
      filter,
      fallback,
      status,
      format,
    });
    return {
      content: [{ type: "text", text: base64 }],
    };
  }
);

server.registerTool(
  "export_template",
  {
    description: "Export a template containing source keys only (no translations)",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      ext: z.string().describe("File format extension"),
      filter: z.string().optional().describe("Filter by comma-separated tag names"),
      format: z.string().optional().describe("Sub-format variant"),
    },
  },
  async ({ apiKey, ext, filter, format }) => {
    const client = getClient(apiKey);
    const result = await client.exportTemplate(ext, { filter, format });
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// endregion

// region Import tools

server.registerTool(
  "import_file",
  {
    description:
      "Import assets and translations from a language pack file. The file content is passed as a string.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      ext: z
        .string()
        .describe(
          "File format extension (json, po, xlf, strings, xml, yml, csv, properties, etc.)"
        ),
      content: z.string().describe("The file content to import"),
      locale: z
        .string()
        .optional()
        .describe("Target locale for the imported translations"),
      index: z
        .enum(["id", "text"])
        .optional()
        .describe("Whether the file is indexed by asset id or source text"),
      format: z.string().optional().describe("Schema hint (e.g., multi, rails, symfony)"),
      async: z
        .boolean()
        .optional()
        .describe("Set to true for background processing of large files"),
      ignoreNew: z
        .boolean()
        .optional()
        .describe("Do NOT add new assets found in the file"),
      ignoreExisting: z
        .boolean()
        .optional()
        .describe("Do NOT update existing assets found in the file"),
      ignoreBlank: z
        .boolean()
        .optional()
        .describe("Do NOT import blank/empty translations"),
      tagNew: z
        .string()
        .optional()
        .describe("Apply comma-separated tags to newly created assets"),
      tagAll: z
        .string()
        .optional()
        .describe("Apply tags to all matched assets"),
      tagUpdated: z
        .string()
        .optional()
        .describe("Apply tags to updated assets"),
      tagAbsent: z
        .string()
        .optional()
        .describe("Apply tags to assets NOT found in the file"),
      deleteAbsent: z
        .boolean()
        .optional()
        .describe("PERMANENTLY DELETE assets NOT found in the file"),
      flagNew: z
        .string()
        .optional()
        .describe("Set a flag on newly imported translations (e.g., fuzzy)"),
      flagUpdated: z
        .string()
        .optional()
        .describe("Set a flag on updated translations"),
    },
  },
  async ({
    apiKey,
    ext,
    content,
    locale,
    index,
    format,
    async: asyncImport,
    ignoreNew,
    ignoreExisting,
    ignoreBlank,
    tagNew,
    tagAll,
    tagUpdated,
    tagAbsent,
    deleteAbsent,
    flagNew,
    flagUpdated,
  }) => {
    const client = getClient(apiKey);
    const params: Record<string, unknown> = {};
    if (locale) params["locale"] = locale;
    if (index) params["index"] = index;
    if (format) params["format"] = format;
    if (asyncImport) params["async"] = "1";
    if (ignoreNew) params["ignore-new"] = "1";
    if (ignoreExisting) params["ignore-existing"] = "1";
    if (ignoreBlank) params["ignore-blank"] = "1";
    if (tagNew) params["tag-new"] = tagNew;
    if (tagAll) params["tag-all"] = tagAll;
    if (tagUpdated) params["tag-updated"] = tagUpdated;
    if (tagAbsent) params["tag-absent"] = tagAbsent;
    if (deleteAbsent) params["delete-absent"] = "1";
    if (flagNew) params["flag-new"] = flagNew;
    if (flagUpdated) params["flag-updated"] = flagUpdated;
    const result = await client.importFile(ext, content, params as any);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "import_progress",
  {
    description: "Check the progress of an asynchronous import job",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      jobId: z.string().describe("Job ID returned from an async import"),
    },
  },
  async ({ apiKey, jobId }) => {
    const client = getClient(apiKey);
    const result = await client.importProgress(jobId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Translation extended tools

server.registerTool(
  "erase_translation",
  {
    description:
      "Erase translation data for an asset in a specific locale. This clears the translation, its history, and comments.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de)"),
    },
  },
  async ({ apiKey, assetId, locale }) => {
    const client = getClient(apiKey);
    const result = await client.eraseTranslation(assetId, locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "flag_translation",
  {
    description:
      "Flag a translation or set its status. Valid flags: fuzzy, incorrect, incomplete, provisional, rejected, unapproved. Valid statuses: translated, untranslated.",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de)"),
      flag: z
        .string()
        .describe(
          "Flag or status to set (fuzzy, incorrect, incomplete, provisional, rejected, unapproved, translated, untranslated)"
        ),
    },
  },
  async ({ apiKey, assetId, locale, flag }) => {
    const client = getClient(apiKey);
    const result = await client.flagTranslation(assetId, locale, flag);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "unflag_translation",
  {
    description: "Clear a flag from a translation",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de)"),
    },
  },
  async ({ apiKey, assetId, locale }) => {
    const client = getClient(apiKey);
    const result = await client.unflagTranslation(assetId, locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_translation_revisions",
  {
    description: "Get previous revisions (history) of a translation",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      assetId: z.string().describe("The asset identifier"),
      locale: z.string().describe("Locale code (e.g., en, fr, de)"),
    },
  },
  async ({ apiKey, assetId, locale }) => {
    const client = getClient(apiKey);
    const result = await client.getTranslationRevisions(assetId, locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Locale extended tools

server.registerTool(
  "create_locale",
  {
    description: "Add a new locale to the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      code: z.string().describe("Locale code or language tag (e.g., fr, en_GB, zh_CN)"),
    },
  },
  async ({ apiKey, code }) => {
    const client = getClient(apiKey);
    const result = await client.createLocale(code);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_locale",
  {
    description: "Get details of a single locale",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Locale code (e.g., en, fr, de)"),
    },
  },
  async ({ apiKey, locale }) => {
    const client = getClient(apiKey);
    const result = await client.getLocale(locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "update_locale",
  {
    description: "Modify a locale's code or display name",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Current locale code to update"),
      newCode: z.string().optional().describe("New locale code"),
      name: z.string().optional().describe("New display name"),
    },
  },
  async ({ apiKey, locale, newCode, name }) => {
    const client = getClient(apiKey);
    const result = await client.updateLocale(locale, { code: newCode, name });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "delete_locale",
  {
    description: "Delete a locale from the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Locale code to delete"),
    },
  },
  async ({ apiKey, locale }) => {
    const client = getClient(apiKey);
    const result = await client.deleteLocale(locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_locale_errors",
  {
    description: "Get validation errors for a locale's translations",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Locale code to check for errors"),
    },
  },
  async ({ apiKey, locale }) => {
    const client = getClient(apiKey);
    const result = await client.getLocaleErrors(locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "get_locale_progress",
  {
    description: "Get detailed translation progress for a locale",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      locale: z.string().describe("Locale code to get progress for"),
    },
  },
  async ({ apiKey, locale }) => {
    const client = getClient(apiKey);
    const result = await client.getLocaleProgress(locale);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

// region Tag extended tools

server.registerTool(
  "create_tag",
  {
    description: "Create a new tag in the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      name: z.string().describe("Name of the tag to create"),
    },
  },
  async ({ apiKey, name }) => {
    const client = getClient(apiKey);
    const result = await client.createTag(name);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "batch_tag_assets",
  {
    description: "Add multiple assets to an existing tag at once",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      tag: z.string().describe("The tag name"),
      assetIds: z.array(z.string()).describe("Array of asset identifiers to tag"),
    },
  },
  async ({ apiKey, tag, assetIds }) => {
    const client = getClient(apiKey);
    const result = await client.batchTagAssets(tag, assetIds);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "rename_tag",
  {
    description: "Rename an existing tag",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      tag: z.string().describe("Current tag name"),
      newName: z.string().describe("New name for the tag"),
    },
  },
  async ({ apiKey, tag, newName }) => {
    const client = getClient(apiKey);
    const result = await client.renameTag(tag, newName);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "delete_tag",
  {
    description: "Delete a tag from the project",
    inputSchema: {
      apiKey: z.string().optional().describe("Loco API key (or set LOCO_API_KEY env var)"),
      tag: z.string().describe("Name of the tag to delete"),
    },
  },
  async ({ apiKey, tag }) => {
    const client = getClient(apiKey);
    const result = await client.deleteTag(tag);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// endregion

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("loco-mcp server running on stdio…");
}

main().catch(console.error);
