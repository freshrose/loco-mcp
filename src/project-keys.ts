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
