// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/projects/fandom-cookies.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import type { Chip } from "../chips.ts";

export const FANDOM_COOKIES_ROLES = {
  "Additional Research, Feedback, Development, and Assistance": [
    "Research",
    "Coding",
  ],
  "Alt Text": ["Writing"],
  "Art Direction": ["Art"],
  Artist: ["Art"],
  "Cookie Catcher Design": ["Design"],
  "CSS & Design": ["Coding", "Design"],
  "Digital Item Pack Assembly": ["Design"],
  "Digital Item Pack Wallpapers": ["Art"],
  Extra: [],
  "Extra Hands (and Brains)": [],
  Feedback: ["Research"],
  Programming: ["Coding"],
  "Project Management": ["PM"],
  "Promo Campaign Assistance": ["Comms"],
} as const satisfies Record<string, readonly Chip[]>;
