import type { SchemaContext } from "astro:content";
// ────────────────────────────────────────────────────────────
// DO NOT EDIT — synced from FujoWebDev/contributors @ 41e1ae70e729
// Source: contributors/_schema/index.ts
// Refresh: pnpm sync
// ────────────────────────────────────────────────────────────
import { z } from "astro/zod";
import { CHIPS, type Chip } from "./chips.ts";
import { PROJECT_ROLES, PROJECTS, type Project } from "./projects/index.ts";
import { SocialLinks } from "./socials.ts";

export { CHIPS, type Chip } from "./chips.ts";
export { PROJECTS, type Project } from "./projects/index.ts";

export type ContributorSchemaContext<AvatarSchema extends z.ZodTypeAny> = {
  image: () => AvatarSchema;
};

type RoleOutput = {
  project: Project;
  name: string;
  details?: string;
  chips: readonly Chip[];
};

// function isNonEmpty<Value>(values: Value[]): values is [Value, ...Value[]] {
//   return values.length > 0;
// }

const RoleFor = (project: Project) => {
  const roleMap = PROJECT_ROLES[project];
  const names = Object.keys(roleMap);
  // const NameSchema = isNonEmpty(names) ? z.enum(names) : z.string();
  const NameSchema = names.length > 0 ? z.enum(names) : z.string();

  return z
    .union([
      NameSchema,
      z.object({
        role: NameSchema,
        details: z.string(),
      }),
    ])
    .transform((value): RoleOutput => {
      const name = typeof value === "string" ? value : value.role;
      const details = typeof value === "string" ? undefined : value.details;
      const chips = roleMap?.[name] ?? [];
      return { project, name, details, chips };
    });
};

const Roles = z
  .object(
    Object.fromEntries(
      PROJECTS.map((project) => [
        project,
        RoleFor(project).array().default([]),
      ]),
    ),
  )
  .strict();

const TYPE = z.enum(["founder", "contractor", "community"]);

export const createContributorSchema = <AvatarSchema extends z.ZodTypeAny>({
  image,
}: ContributorSchemaContext<AvatarSchema>) =>
  z.object({
    name: z.string(),
    aliases: z.string().array().default([]),
    avatar: image(),
    type: z.union([TYPE, TYPE.array()]),
    roles: Roles,
    chips: z.enum(CHIPS).array().default([]),
    contacts: SocialLinks,
  });

export const ContributorSchema = ({ image }: SchemaContext) =>
  createContributorSchema({ image });
