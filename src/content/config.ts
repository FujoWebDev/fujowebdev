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

const characterCollection = defineCollection({
  type: "content",
  schema: z.object({
    image_src: z.string(),
    likes: z.string().array(),
    dislikes: z.string().array(),
    tropes: z.string().array(),
    trivia: z.string(),
  }),
});

export const collections = {
  team: teamCollection,
  characters: characterCollection,
};
