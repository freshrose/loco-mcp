# loco-mcp

An MCP server that lets AI assistants manage translations through the [Loco](https://localise.biz) API.

## What it does

This MCP provides tools to:
- List, create, update, and delete translatable assets
- Get, update, erase, flag, and review translation history across locales
- Export translations to 20+ file formats (JSON, PO, XLIFF, iOS strings, Android XML, YAML, CSV, etc.)
- Import translation files with fine-grained control (tag new assets, ignore existing, delete absent, etc.)
- Manage locales (create, update, delete, check progress and validation errors)
- Manage tags (create, rename, delete, batch-tag assets)

## Configuration

### API Key

You can provide your Loco API key in two ways:

1. **Environment variable** (recommended): Set `LOCO_API_KEY` in your MCP server configuration
2. **Per-tool parameter**: Pass `apiKey` as a parameter to any tool call

You can find your API key in your Loco project under **Developer Tools -> API Keys (Full Access Key)**.

### OpenCode

```json
{
  "mcp": {
    "loco": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "loco-mcp"],
      "env": {
        "LOCO_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Desktop

```json
{
  "mcpServers": {
    "loco": {
      "command": "npx",
      "args": ["-y", "loco-mcp"],
      "env": {
        "LOCO_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### Assets
| Tool | Description |
|------|-------------|
| `list_assets` | List all translatable assets (optionally filter by tags) |
| `get_asset` | Get a single asset by ID |
| `create_asset` | Create a new translatable asset |
| `update_asset` | Update an asset's properties |
| `delete_asset` | Permanently delete an asset |

### Translations
| Tool | Description |
|------|-------------|
| `get_translations` | Get all translations for an asset across all locales |
| `get_translation` | Get a single translation for an asset in a specific locale |
| `update_translation` | Add or update a translation |
| `erase_translation` | Erase translation data (clears history and comments) |
| `flag_translation` | Flag a translation (fuzzy, incorrect, provisional, etc.) |
| `unflag_translation` | Clear a flag from a translation |
| `get_translation_revisions` | Get previous revisions of a translation |

### Export
| Tool | Description |
|------|-------------|
| `export_locale` | Export a single locale to a language pack file |
| `export_all` | Export all locales to a multi-locale file |
| `export_archive` | Export all locales as a zip archive (base64-encoded) |
| `export_template` | Export source keys only (no translations) |

### Import
| Tool | Description |
|------|-------------|
| `import_file` | Import assets and translations from a language pack file |
| `import_progress` | Check the progress of an async import job |

### Locales
| Tool | Description |
|------|-------------|
| `list_locales` | List all locales in the project |
| `create_locale` | Add a new locale |
| `get_locale` | Get details of a single locale |
| `update_locale` | Modify a locale's code or display name |
| `delete_locale` | Delete a locale |
| `get_locale_errors` | Get validation errors for a locale |
| `get_locale_progress` | Get detailed translation progress |

### Tags
| Tool | Description |
|------|-------------|
| `list_tags` | List all tags in the project |
| `create_tag` | Create a new tag |
| `tag_asset` | Add a tag to an asset |
| `untag_asset` | Remove a tag from an asset |
| `batch_tag_assets` | Tag multiple assets at once |
| `rename_tag` | Rename an existing tag |
| `delete_tag` | Delete a tag |
