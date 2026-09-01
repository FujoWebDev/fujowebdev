import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { ContributorSchema } from "./content/contributors/_schema";

export type { Project } from "./content/contributors/_schema";

const contributorsCollection = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/content/contributors",
  }),
  schema: ContributorSchema,
});
const characterCollection = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/characters",
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      image: image(),
      icon: image(),
      home: z.enum(["localhost", "browserland", "the real world"]),
      likes: z.string().array(),
      dislikes: z.string().array(),
      tropes: z
        .union([
          z.string(),
          z.object({
            name: z.string(),
            url: z.url(),
          }),
        ])
        .array(),
      trivia: z.string(),
      order: z.number(),
    }),
});

export const collections = {
  contributors: contributorsCollection,
  characters: characterCollection,
};
