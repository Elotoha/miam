import { redirect } from "react-router";
import type { Route } from "./+types/_index";
import { getUserFromRequest } from "~/lib/auth";

export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.cloudflare.env.DB, context.cloudflare.env.request ?? new Request("http://localhost"));
  if (user) {
    throw redirect("/dashboard");
  }
  throw redirect("/login");
}
