import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect }) => {
  return redirect("https://www.essentialrandomness.com/streams", 307);
};
