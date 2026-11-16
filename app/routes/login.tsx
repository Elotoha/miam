import { redirect } from "react-router";
import type { Route } from "./+types/login";
import { getUserFromRequest, verifyPassword, createSession, createSessionCookie } from "~/lib/auth";

export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUserFromRequest(context.cloudflare.env.DB, new Request("http://localhost"));
  if (user) throw redirect("/dashboard");
  return {};
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
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
      "Set-Cookie": createSessionCookie(token),
    },
  });
}

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🍽️</div>
          <h1 className="text-3xl font-bold text-orange-600">Miam</h1>
          <p className="text-gray-500 mt-1">Suivez vos repas et vos points</p>
        </div>

        <form method="post" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
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
              autoComplete="current-password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-3.5 text-white font-semibold hover:bg-orange-600 active:scale-95 transition"
          >
            Se connecter
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{" "}
          <a href="/register" className="text-orange-600 font-medium">
            Créer un compte
          </a>
        </p>
      </div>
    </div>
  );
}
