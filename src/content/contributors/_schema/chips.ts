// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/chips.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
export const CHIPS = [
  "Art",
  "Character Design",
  "Design",
  "Writing",
  "Research",
  "Coding",
  "QA",
  "Data Entry",
  "Comms",
  "PM",
  "SysAdmin",
] as const;

export type Chip = (typeof CHIPS)[number];
