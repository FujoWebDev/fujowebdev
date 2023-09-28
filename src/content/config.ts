import { defineCollection, z } from "astro:content";

const teamCollection = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    avatar: z.string(),
    roles: z.string().array(),
    contacts: z.string().url().array(),
  }),
});

export const collections = {
  team: teamCollection,
};
