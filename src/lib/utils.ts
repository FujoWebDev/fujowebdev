import type { Project } from "../content.config";

export const isRelevantProject = (projectName: Project) =>
  projectName === "fujoweb.dev" || projectName.startsWith("Volume ");
