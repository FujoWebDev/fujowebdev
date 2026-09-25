import type { AstroIntegration } from "astro";

// Adds the /og/characters/[slug] pages screenshotted by generate.ts
export default function characterOgCards(): AstroIntegration {
  return {
    name: "character-og-cards",
    hooks: {
      "astro:config:setup": ({ command, injectRoute }) => {
        if (command !== "dev") {
          return;
        }
        injectRoute({
          pattern: "/og/characters/[slug]",
          entrypoint: new URL("./OgCardPage.astro", import.meta.url),
        });
      },
    },
  };
}
