import icon from "astro-icon";
import { defineConfig } from "astro/config";
import characterOgCards from "./src/integrations/character-og-cards";

// https://astro.build/config
export default defineConfig({
  site: "https://fujoweb.dev",
  integrations: [icon(), characterOgCards()],
  redirects: {
    "/streams": {
      destination: "https://www.essentialrandomness.com/streams",
      status: 307,
    },
    "/contributors/codeargent": "/contributors/argent",
    "/team": "/contributors",
    "/team/codeargent": "/contributors/argent",
    "/team/website": "/contributors/fujoweb.dev",
    "/team/[slug]": "/contributors/[slug]",
  },
});
