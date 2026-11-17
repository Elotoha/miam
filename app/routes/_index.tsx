import { cloudflareContext } from "~/lib/context";
import { redirect } from "react-router";
import type { Route } from "./+types/_index";
import { getUserFromRequest } from "~/lib/auth";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.get(cloudflareContext).env.DB, request);
  if (user) {
    throw redirect("/dashboard");
  }
  throw redirect("/login");
}
