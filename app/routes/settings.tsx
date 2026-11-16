import { redirect } from "react-router";
import type { Route } from "./+types/settings";
import { getUserFromRequest } from "~/lib/auth";
import { getUserById, updateUserTarget } from "~/lib/db";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, new Request("http://localhost"));
  if (!user) throw redirect("/login");

  const userInfo = await getUserById(db, user.id);
  return { email: userInfo?.email ?? user.email, target: userInfo?.daily_points_target ?? user.daily_points_target };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, request);
  if (!user) throw redirect("/login");

  const formData = await request.formData();
  const target = parseInt(formData.get("daily_points_target") as string, 10);

  if (!target || target < 10 || target > 100) {
    return { error: "L'objectif doit être entre 10 et 100 points" };
  }

  await updateUserTarget(db, user.id, target);
  return { success: true, target };
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const currentTarget = actionData?.target ?? loaderData.target;

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      <header className="bg-orange-500 text-white px-4 pt-3 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <h1 className="text-xl font-bold">⚙️ Réglages</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-1">Compte</h2>
          <p className="text-sm text-gray-500">{loaderData.email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">Objectif de points quotidien</h2>
          {actionData?.success && (
            <p className="text-sm text-green-600 mb-2">Objectif mis à jour ! ✅</p>
          )}
          {actionData?.error && (
            <p className="text-sm text-red-500 mb-2">{actionData.error}</p>
          )}
          <form method="post" className="space-y-3">
            <input
              type="number"
              name="daily_points_target"
              defaultValue={currentTarget}
              min={10}
              max={100}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 active:scale-95 transition"
            >
              Enregistrer
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-2">À propos de Miam</h2>
          <p className="text-sm text-gray-500">
            Miam calcule les points Weight Watchers (SmartPoints) à partir des macros des aliments.
            La formule est une approximation : (kcal + 4×protéines + 9×graisses saturées + 3×sucres - 4×fibres) / 33.
          </p>
        </div>

        <form method="post" action="/logout" className="pt-4">
          <button
            type="submit"
            className="w-full rounded-xl bg-red-50 border border-red-200 py-3 text-red-600 font-medium hover:bg-red-100 active:scale-95 transition"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 bottom-nav">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <a href="/dashboard" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">🏠</span>
            <span className="text-[10px]">Accueil</span>
          </a>
          <a href="/log" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">➕</span>
            <span className="text-[10px]">Saisir</span>
          </a>
          <a href="/foods" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">🍎</span>
            <span className="text-[10px]">Aliments</span>
          </a>
          <a href="/plan" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">📅</span>
            <span className="text-[10px]">Plan</span>
          </a>
          <a href="/settings" className="flex flex-col items-center text-orange-600">
            <span className="text-xl">⚙️</span>
            <span className="text-[10px]">Réglages</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
