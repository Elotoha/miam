import { cloudflareContext } from "~/lib/context";
import { redirect, Form } from "react-router";
import type { Route } from "./+types/register";
import { hashPassword, createSession, createSessionCookie, getUserFromRequest } from "~/lib/auth";

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.get(cloudflareContext).env.DB, request);
  if (user) throw redirect("/dashboard");
  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.get(cloudflareContext).env.DB;
  const formData = await request.formData();
  const email = (formData.get("email") as string)?.toLowerCase();
  const password = formData.get("password") as string;
  const target = parseInt(formData.get("daily_points_target") as string, 10);

  if (!email || !password) {
    return { error: "Email et mot de passe requis" };
  }
  if (password.length < 6) {
    return { error: "Le mot de passe doit faire au moins 6 caractères" };
  }
  if (!target || target < 10 || target > 100) {
    return { error: "Objectif de points invalide" };
  }

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return { error: "Un compte existe déjà avec cet email" };
  }

  const passwordHash = await hashPassword(password);
  const result = await db
    .prepare("INSERT INTO users (email, password_hash, daily_points_target) VALUES (?, ?, ?)")
    .bind(email, passwordHash, target)
    .run();

  const userId = result.meta?.last_row_id as number;
  const token = await createSession(db, userId);
  throw new Response(null, {
    status: 302,
    headers: {
      Location: "/dashboard",
      "Set-Cookie": createSessionCookie(token, new URL(request.url).protocol === "https:"),
    },
  });
}

export default function Register({ actionData }: Route.ComponentProps) {
 return <main className="auth-page"><section className="auth-card"><a className="brand" href="/">miam<span>·</span></a><p className="eyebrow">VOTRE CARNET PERSONNEL</p><h1>Une place à votre table.</h1><p className="subtitle">Un compte par personne : les goûts et les objectifs restent les vôtres.</p><Form method="post" className="stack">{actionData?.error&&<p className="alert" role="alert">{actionData.error}</p>}<label>Email<input type="email" name="email" autoComplete="email" required/></label><label>Mot de passe (6 caractères minimum)<input type="password" name="password" autoComplete="new-password" minLength={6} required/></label><label>Repère quotidien WW (approximatif)<input type="number" name="daily_points_target" min={10} max={100} defaultValue={23} required/></label><button className="primary">Créer mon compte</button></Form><p className="fine">Déjà inscrit ? <a href="/login">Se connecter →</a></p></section></main>;
}
