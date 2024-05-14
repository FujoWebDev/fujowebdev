import { defineConfig } from "astro/config";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
  integrations: [icon()],
  redirects: {
    "/streams": {
      destination: 'https://www.essentialrandomness.com/streams',
      status: 307
    }
  }
});
