import { cloudflareContext } from "~/lib/context";
import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { deleteSession, clearSessionCookie } from "~/lib/auth";

export async function action({ request, context }: Route.ActionArgs) {
  await deleteSession(context.get(cloudflareContext).env.DB, request);
  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": clearSessionCookie(),
    },
  });
}

export async function loader() {
  throw redirect("/login");
}

import { redirect as _redirect } from "react-router";
