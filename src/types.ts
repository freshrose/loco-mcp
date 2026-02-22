export interface Locale {
  code: string;
  name: string;
  source?: boolean;
  plurals: {
    length: number;
    equation: string;
    forms: string[];
  };
  progress: {
    translated: number;
    untranslated: number;
    flagged: number;
    words?: number;
  }
}

export interface Asset {
  id: string;
  type: string;
  context?: string;
  notes?: string;
  printf?: string;
  created: string;
  modified: string;
  plurals: number;
  tags: string[];
  aliases: Record<string, string>;
  progress: {
    translated: number;
    untranslated: number;
    flagged: number;
  };
}

export interface Translation {
  id: string;
  translation: string;
  translated: boolean;
  status: string;
  revision: number;
  flagged: boolean;
  modified: string;
  author?: {
    id: number;
    name: string;
    email: string;
  };
  locale: {
    code: string;
    name: string;
  };
  plurals?: string[];
}

export interface SuccessResponse {
  status: number;
  message: string;
}

export interface ExportParams {
  format?: string;
  filter?: string;
  index?: string;
  source?: string;
  namespace?: string;
  fallback?: string;
  order?: "created" | "id";
  status?: string;
  printf?: "php" | "java" | "objc" | "icu" | "python";
  charset?: string;
  breaks?: "Unix" | "DOS" | "Mac";
  "no-comments"?: boolean;
  "no-expand"?: boolean;
  collisions?: "overwrite" | "ignore" | "fail" | "auto" | "legacy";
}

export interface ImportParams {
  locale?: string;
  index?: "id" | "text";
  format?: string;
  async?: boolean;
  path?: string;
  "ignore-new"?: boolean;
  "ignore-existing"?: boolean;
  "ignore-blank"?: boolean;
  "tag-new"?: string;
  "tag-all"?: string;
  "tag-updated"?: string;
  "tag-absent"?: string;
  "untag-all"?: string;
  "untag-updated"?: string;
  "untag-absent"?: string;
  "delete-absent"?: boolean;
  "flag-new"?: string;
  "flag-updated"?: string;
}

export interface ImportResult {
  status: number;
  message: string;
  locales?: {
    code: string;
    name: string;
    progress: {
      translated: number;
      untranslated: number;
      flagged: number;
    };
  }[];
}

export interface ImportProgress {
  progress: number;
  success?: string;
  error?: string;
}

export interface LocaleError {
  id: string;
  type: string;
  message: string;
}

export interface LocaleProgress {
  progress: {
    translated: number;
    untranslated: number;
    flagged: number;
    words: number;
  };
  translated?: {
    count: number;
    words: { source: number; target: number };
    chars: { source: number; target: number };
    bytes: { source: number; target: number };
  };
}
