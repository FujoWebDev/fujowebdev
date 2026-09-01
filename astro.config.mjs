import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [icon()],
  redirects: {
    "/streams": {
      destination: "https://www.essentialrandomness.com/streams",
      status: 307,
    },
    "/contributors/codeargent": "/contributors/argent",
    "/team": "/contributors",
    "/team/codeargent": "/contributors/argent",
    "/team/[member]": "/contributors/[member]",
    "/team/[project]": "/contributors/[project]",
  },
});
