// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/socials.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import { createSocialsTransformer } from "@fujocoded/zod-transform-socials/zod4";

export const { SocialLinks, SocialsSchema, transformSocial } =
  createSocialsTransformer({
    domains: {
      mastodon: [
        "blorbo.social",
        "fandom.ink",
        "gamedev.lgbt",
        "hachyderm.io",
        "indiepocalypse.social",
        "tech.lgbt",
      ],
    },
  });
