// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/projects/index.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import type { Chip } from "../chips.ts";
import { ASKFUJO_ROLES } from "./askfujo.ts";
import { FANDOM_COOKIES_ROLES } from "./fandom-cookies.ts";
import {
  VOLUME_0_KICKSTARTER_ROLES,
  VOLUME_0_ROLES,
  VOLUME_0_ISSUE_1_ROLES,
} from "./volume-zero.ts";
import { FUJOCODED_COM_ROLES, FUJOWEB_DEV_ROLES } from "./websites.ts";

export {
  VOLUME_0_KICKSTARTER_ROLES,
  VOLUME_0_ROLES,
  VOLUME_0_ISSUE_1_ROLES,
} from "./volume-zero.ts";
export { FUJOCODED_COM_ROLES, FUJOWEB_DEV_ROLES } from "./websites.ts";

export { FANDOM_COOKIES_ROLES } from "./fandom-cookies.ts";
export { ASKFUJO_ROLES } from "./askfujo.ts";

export const FUJOCODED_ROLES = {
  HimeOps: ["SysAdmin"],
  FujoCoded: [],
  "Project Manager": ["PM"],
} as const satisfies Record<string, readonly Chip[]>;

export const LEARN_AT_ROLES = {
  "Article Writer": ["Writing"],
  "Writers Coordinator": ["Writing", "PM"],
} as const satisfies Record<string, readonly Chip[]>;

export const CODE_CONTRIBUTOR_ROLES = {
  Documentation: ["Writing"],
  Maintainer: ["Coding"],
} as const satisfies Record<string, readonly Chip[]>;

export const PROJECTS = [
  "Volume 0 Kickstarter",
  "Volume 0",
  "Volume 0 Issue 1",
  "fujoweb.dev",
  "fujocoded.com",
  "Fandom Cookies",
  "FujoCoded",
  "Learn@",
  "Code Contributor",
  "AskFujo",
] as const;
export type Project = (typeof PROJECTS)[number];

export type RoleMap = Readonly<Record<string, readonly Chip[]>>;

export const PROJECT_ROLES: Record<Project, RoleMap> = {
  "Volume 0 Kickstarter": VOLUME_0_KICKSTARTER_ROLES,
  "Volume 0": VOLUME_0_ROLES,
  "Volume 0 Issue 1": VOLUME_0_ISSUE_1_ROLES,
  "fujoweb.dev": FUJOWEB_DEV_ROLES,
  "fujocoded.com": FUJOCODED_COM_ROLES,
  "Fandom Cookies": FANDOM_COOKIES_ROLES,
  FujoCoded: FUJOCODED_ROLES,
  "Learn@": LEARN_AT_ROLES,
  "Code Contributor": CODE_CONTRIBUTOR_ROLES,
  AskFujo: ASKFUJO_ROLES,
};

export default PROJECTS;
