// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/projects/askfujo.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import type { Chip } from "../chips.ts";

export const ASKFUJO_ROLES = {
  Artist: ["Art"],
  Designer: ["Design"],
  "General Help": [],
  "Project Lead": ["PM"],
} as const satisfies Record<string, readonly Chip[]>;
