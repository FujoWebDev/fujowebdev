import { defineCollection, z } from "astro:content";
import {
  socialsSchema,
  transformSocial,
  type SocialsData,
} from "../lib/socials-transformer";

const Volume0Issue1Role = z.enum([
  "Technical Writer",
  "Scenario Writer",
  "Beta Reading Coordinator",
  "Beta Reader",
  "Proofreader",
  "Artist",
  "Tasks Coordinator",
  "Communications",
  "Character Designer",
  "Additional Coding",
  "Data Collection & Entry",
]);

const Role = <T extends z.ZodEnum<any> | z.ZodString = z.ZodString>(
  roleType: T | z.ZodString = z.string()
) =>
  z.union([
    roleType,
    z.object({
      role: roleType,
      details: z.string(),
    }),
  ]);

const roles = z.object({
  "Volume 0 Kickstarter": Role().array().default([]),
  "Volume 0": Role().array().default([]),
  Website: Role().array().default([]),
  "Volume 0 Issue 1": Role(Volume0Issue1Role).array().default([]),
});

const teamCollection = defineCollection({
  type: "data",
  schema: (tools) =>
    z.object({
      name: z.string(),
      avatar: tools.image(),
      roles,
      contacts: socialsSchema
        .array()
        .default([])
        .transform(
          (contacts) => contacts.map(transformSocial) as Array<SocialsData>
        ),
    }),
});

export type Project = keyof typeof roles.shape;

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
