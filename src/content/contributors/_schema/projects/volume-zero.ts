// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/projects/volume-zero.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import type { Chip } from "../chips.ts";

export const VOLUME_0_KICKSTARTER_ROLES = {
  "Additional Art & Layout": ["Art", "Design"],
  "Additional Research, Feedback, Development, and Assistance": [
    "Research",
    "Coding",
  ],
  "Art Director": ["Art"],
  Artist: ["Art"],
  "Character Designer": ["Character Design"],
  Editor: ["Writing"],
  "Graphic Design": ["Design"],
  "Lead Research": ["Research"],
  "Merch Designer": ["Art", "Design"],
  "Project Lead": ["PM"],
  "Project Organizing": ["PM"],
  "QA Testing": ["QA"],
  "Sensitivity Reading": ["Research"],
  "Social Media & Marketing": ["Comms"],
  "Technical Writer": ["Writing"],
  Writer: ["Writing"],
} as const satisfies Record<string, readonly Chip[]>;

export const VOLUME_0_ROLES = {
  "Additional Coding": ["Coding"],
  Artist: ["Art"],
  "Beta Reader": ["Writing"],
  "Beta Reading Coordinator": ["Writing", "PM"],
  "Beta Wrangler": ["Writing", "PM"],
  "Character Designer": ["Character Design"],
  Editor: ["Writing"],
  "Project Lead": ["PM"],
  "Project Organizing": ["PM"],
  "Technical Writer": ["Writing"],
  "The One Who Talks With The Lawyers": [],
  Writer: ["Writing"],
} as const satisfies Record<string, readonly Chip[]>;

export const VOLUME_0_ISSUE_1_ROLES = {
  "Additional Coding": ["Coding"],
  Artist: ["Art"],
  "Beta Reader": ["Writing"],
  "Beta Reading Coordinator": ["Writing", "PM"],
  "Character Designer": ["Character Design"],
  Communications: ["Comms"],
  "Data Collection & Entry": ["Data Entry"],
  "Project Management": ["PM"],
  Proofreader: ["Writing"],
  "Scenario Writer": ["Writing"],
  "Tasks Coordinator": ["PM"],
  "Technical Writer": ["Writing"],
} as const satisfies Record<string, readonly Chip[]>;
