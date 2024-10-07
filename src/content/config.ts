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
  "Proof Reader",
  "Character Designer",
]);

const Role = (roleType: any = z.string()) =>
  z.union([
    roleType,
    z.object({
      role: roleType,
      details: z.string(),
    }),
  ]);

const roles = z.object({
  "Volume 0 Kickstarter": Role().array().optional(),
  "Volume 0": Role().array().optional(),
  Website: Role().array().optional(),
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
