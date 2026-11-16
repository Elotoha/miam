import { redirect } from "react-router";
import type { Route } from "./+types/dashboard";
import { getUserFromRequest } from "~/lib/auth";
import { getMealLogsForDate, getMealPlansForDate, getTotalPointsForDate, getUserById } from "~/lib/db";
import { pointsForDay } from "~/lib/ww-points";
import { generateSuggestions, type LoggedMeal, type PlannedMeal } from "~/lib/smart-adjustments";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, new Request("http://localhost"));
  if (!user) throw redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [logs, plans, consumed, userInfo] = await Promise.all([
    getMealLogsForDate(db, user.id, today),
    getMealPlansForDate(db, user.id, today),
    getTotalPointsForDate(db, user.id, today),
    getUserById(db, user.id),
  ]);

  const target = userInfo?.daily_points_target ?? user.daily_points_target;
  const { remaining, percentage } = pointsForDay(target, consumed);

  const loggedMeals: LoggedMeal[] = logs.map((l) => ({
    food_id: l.food_id,
    food_name: l.food_name,
    category: l.category,
    ww_points: l.ww_points,
    qty_g: l.qty_g,
    meal_type: l.meal_type,
  }));

  const plannedMeals: PlannedMeal[] = plans.map((p) => ({
    id: p.id,
    food_id: p.food_id,
    food_name: p.food_name,
    category: p.category,
    meal_type: p.meal_type,
    planned_qty_g: p.planned_qty_g,
    estimated_ww_points: p.estimated_ww_points,
  }));

  const suggestions = generateSuggestions(loggedMeals, plannedMeals, target, consumed);

  return { user, target, consumed, remaining, percentage, logs, plans, suggestions, today };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { target, consumed, remaining, percentage, logs, plans, suggestions } = loaderData;

  const mealTypeLabels: Record<string, string> = {
    "petit-dejeuner": "Petit-déjeuner",
    "collation-matin": "Collation matin",
    "dejeuner": "Déjeuner",
    "collation-aprem": "Collation après-midi",
    "diner": "Dîner",
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* Header */}
      <header className="bg-orange-500 text-white px-4 pt-3 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🍽️ Miam</h1>
          <form method="post" action="/logout" className="inline">
            <button type="submit" className="text-sm text-orange-100 hover:text-white">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {/* Points summary card */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">Points consommés aujourd'hui</p>
              <p className="text-3xl font-bold text-orange-600">
                {consumed} <span className="text-lg text-gray-400">/ {target}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Restants</p>
              <p className="text-3xl font-bold text-green-500">{remaining}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${percentage > 100 ? "bg-red-500" : "bg-orange-500"}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {percentage}% de votre objectif quotidien
          </p>
        </div>
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 mt-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Suggestions</h2>
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 ${
                s.type === "warning"
                  ? "bg-red-50 border border-red-200"
                  : s.type === "swap" || s.type === "reduce"
                    ? "bg-amber-50 border border-amber-200"
                    : "bg-green-50 border border-green-200"
              }`}
            >
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.message}</p>
              {s.action && (
                <a
                  href={`/plan`}
                  className="inline-block mt-2 text-xs font-medium text-orange-600 hover:underline"
                >
                  Ajuster le plan →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Logged meals */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Repas saisis aujourd'hui
        </h2>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Aucun repas saisi pour le moment.</p>
            <a href="/log" className="inline-block mt-3 rounded-xl bg-orange-500 px-6 py-3 text-white font-medium">
              + Saisir un repas
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div>
                  <p className="font-medium text-gray-800">{log.food_name}</p>
                  <p className="text-xs text-gray-400">
                    {mealTypeLabels[log.meal_type] || log.meal_type} · {log.portion_desc} · {log.qty_g}g
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-orange-600">{log.ww_points}</span>
                  <span className="text-xs text-gray-400"> pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Planned meals */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Repas programmés
        </h2>
        {plans.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>Aucun repas programmé.</p>
            <a href="/plan" className="inline-block mt-3 text-orange-600 font-medium text-sm">
              Programmer un repas →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white/70 rounded-xl p-3 flex items-center justify-between border border-orange-100">
                <div>
                  <p className="font-medium text-gray-700">{plan.food_name}</p>
                  <p className="text-xs text-gray-400">
                    {mealTypeLabels[plan.meal_type] || plan.meal_type} · {plan.planned_qty_g}g
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-400">~{plan.estimated_ww_points} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 bottom-nav">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <a href="/dashboard" className="flex flex-col items-center text-orange-600">
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
          <a href="/settings" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">⚙️</span>
            <span className="text-[10px]">Réglages</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
