import { redirect } from "react-router";
import type { Route } from "./+types/register";
import { hashPassword, createSession, createSessionCookie, getUserFromRequest } from "~/lib/auth";

export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.cloudflare.env.DB, new Request("http://localhost"));
  if (user) throw redirect("/dashboard");
  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
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
  if (!target || target < 10) {
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
      "Set-Cookie": createSessionCookie(token),
    },
  });
}

export default function Register() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-3xl font-bold text-orange-600">Créer un compte</h1>
          <p className="text-gray-500 mt-1">Rejoignez Miam</p>
        </div>

        <form method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              placeholder="Minimum 6 caractères"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objectif de points par jour
            </label>
            <input
              type="number"
              name="daily_points_target"
              required
              defaultValue={23}
              min={10}
              max={100}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Par défaut 23 points (ajustable plus tard)
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-3.5 text-white font-semibold hover:bg-orange-600 active:scale-95 transition"
          >
            Créer mon compte
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{" "}
          <a href="/login" className="text-orange-600 font-medium">
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
