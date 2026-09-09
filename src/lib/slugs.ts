import slugify from "slugify";

export function toUrlSlug(value: string): string {
  return slugify(value, {
    lower: true,
    remove: /[^a-z0-9\s.-]/gi,
  });
}
