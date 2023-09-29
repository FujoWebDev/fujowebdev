import { defineCollection, z } from "astro:content";

const teamCollection = defineCollection({
  type: "data",
  schema: (tools) =>
    z.object({
      name: z.string(),
      avatar: tools.image(),
      roles: z.string().array(),
      contacts: z.string().url().array(),
    }),
});

export const collections = {
  team: teamCollection,
};
