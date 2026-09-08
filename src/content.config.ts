import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";
import { ContributorSchema } from "./content/contributors/_schema";
import { parseInline } from "marked";

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

const inlineMarkdownSchema = z
  .string()
  .transform(async (source) => await parseInline(source));

const commitSchema = z.object({
  hash: z.string().optional(),
  type: z.string(),
  message: inlineMarkdownSchema,
  pending: z.boolean().optional(),
});

const checklistItemSchema = z.object({
  message: inlineMarkdownSchema,
  pending: z.boolean().optional(),
});

const releaseAssetSchema = z.object({
  name: z.string(),
  meta: z.string().optional(),
  contents: z
    .object({ name: z.string(), meta: z.string().optional() })
    .array()
    .optional(),
  collapsed: z.boolean().default(false),
});

const roadmapBaseSchema = z.object({
  order: z.number(),
  branch: z.string(),
  mergeToMain: z.boolean().default(false),
  kind: z.enum(["done", "in-progress", "upcoming"]),
  heading: z.string(),
  body: inlineMarkdownSchema.optional(),
});

export const roadmapSchema = z.discriminatedUnion("view", [
  roadmapBaseSchema.extend({
    view: z.literal("terminal"),
    lane: z.enum(["left", "right"]),
    commits: commitSchema.array(),
  }),
  roadmapBaseSchema.extend({
    view: z.literal("editor"),
    lane: z.enum(["left", "right"]),
    file: z.string(),
    commits: checklistItemSchema.array(),
  }),
  roadmapBaseSchema.extend({
    view: z.literal("browser"),
    lane: z.enum(["left", "right"]),
    url: z.string(),
    commits: checklistItemSchema.array(),
  }),
  roadmapBaseSchema.extend({
    view: z.literal("release"),
    callToAction: z
      .object({
        title: z.string(),
        text: inlineMarkdownSchema,
      })
      .optional(),
    tag: z.string().optional(),
    assets: releaseAssetSchema.array().optional(),
  }),
]);

export type RoadmapContent = z.infer<typeof roadmapSchema>;

const roadmapCollection = defineCollection({
  loader: glob({
    pattern: "*.yaml",
    base: "./src/content/roadmap",
  }),
  schema: roadmapSchema,
});

export const collections = {
  contributors: contributorsCollection,
  characters: characterCollection,
  roadmap: roadmapCollection,
};
