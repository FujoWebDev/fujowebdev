import { defineCollection, z } from "astro:content";
import { socialsSchema, transformSocial } from "../lib/socials-transformer";

const Volume0Issue1 = z
  .enum([
    "Technical Writer",
    "Scenario Writer",
    "Beta Reading Coordinator",
    "Beta Reader",
    "Proof Reader",
  ])
  .array();

const teamCollection = defineCollection({
  type: "data",
  schema: (tools) =>
    z.object({
      name: z.string(),
      avatar: tools.image(),
      roles: z.object({
        "Volume 0 Kickstarter": z.string().array().optional(),
        "Volume 0": z.string().array().optional(),
        Website: z.string().array().optional(),
        "Volume 0 Issue 1": Volume0Issue1.default([]),
      }),
      contacts: socialsSchema
        .array()
        .default([])
        .transform((contacts) => contacts.map(transformSocial)),
    }),
});

const characterCollection = defineCollection({
  type: "content",
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
            url: z.string().url(),
          }),
        ])
        .array(),
      trivia: z.string(),
      order: z.number(),
    }),
});

export const collections = {
  team: teamCollection,
  characters: characterCollection,
};
