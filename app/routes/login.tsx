import { cloudflareContext } from "~/lib/context";
import { redirect, Form } from "react-router";
import type { Route } from "./+types/login";
import { getUserFromRequest, verifyPassword, createSession, createSessionCookie } from "~/lib/auth";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.get(cloudflareContext).env.DB, request);
  if (user) throw redirect("/dashboard");
  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.get(cloudflareContext).env.DB;
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email et mot de passe requis" };
  }

  const user = await db
    .prepare("SELECT id, email, password_hash, daily_points_target FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: number; email: string; password_hash: string; daily_points_target: number }>();

  if (!user) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return { error: "Email ou mot de passe incorrect" };
  }

  const token = await createSession(db, user.id);
  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/dashboard",
      "Set-Cookie": createSessionCookie(token, new URL(request.url).protocol === "https:"),
    },
  });
}

export default function Login({ actionData }: Route.ComponentProps) {
 return <main className="auth-page"><section className="auth-card"><a className="brand" href="/">miam<span>·</span></a><p className="eyebrow">LE PLAISIR DE MANGER, PLUS SEREINEMENT</p><h1>Retrouvez votre équilibre.</h1><p className="subtitle">Vos goûts, vos repas, vos repères. À votre rythme.</p><Form method="post" className="stack">{actionData?.error&&<p className="alert" role="alert">{actionData.error}</p>}<label>Email<input type="email" name="email" autoComplete="email" required/></label><label>Mot de passe<input type="password" name="password" autoComplete="current-password" required/></label><button className="primary">Se connecter</button></Form><p className="fine">Pas encore de compte ? <a href="/register">Créer mon compte →</a></p></section></main>;
}
