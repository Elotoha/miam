import { redirect } from "react-router";
import type { Route } from "./+types/plan";
import { getUserFromRequest } from "~/lib/auth";
import { getMealPlansForDate, addMealPlan, deleteMealPlan, getAllFoods } from "~/lib/db";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, new Request("http://localhost"));
  if (!user) throw redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const [plans, foods] = await Promise.all([
    getMealPlansForDate(db, user.id, today),
    getAllFoods(db),
  ]);

  return { plans, foods, today };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, request);
  if (!user) throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const today = new Date().toISOString().split("T")[0];

  if (intent === "add") {
    const foodId = parseInt(formData.get("food_id") as string, 10);
    const mealType = formData.get("meal_type") as string;
    const qtyG = parseInt(formData.get("planned_qty_g") as string, 10) || 250;

    await addMealPlan(db, user.id, {
      date: today,
      meal_type: mealType,
      food_id: foodId,
      planned_qty_g: qtyG,
    });
  } else if (intent === "delete") {
    const planId = parseInt(formData.get("plan_id") as string, 10);
    await deleteMealPlan(db, planId, user.id);
  }

  return { ok: true };
}

export default function Plan({ loaderData }: Route.ComponentProps) {
  const { plans, foods, today } = loaderData;

  const mealTypeLabels: Record<string, string> = {
    "petit-dejeuner": "Petit-déjeuner",
    "collation-matin": "Collation matin",
    "dejeuner": "Déjeuner",
    "collation-aprem": "Collation après-midi",
    "diner": "Dîner",
  };

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      <header className="bg-orange-500 text-white px-4 pt-3 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <h1 className="text-xl font-bold">📅 Plan des repas</h1>
        <p className="text-sm text-orange-100 mt-1">
          {new Date(today).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {/* Add a planned meal */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">+ Programmer un repas</h2>
          <form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="add" />
            <select name="meal_type" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              <option value="petit-dejeuner">Petit-déjeuner</option>
              <option value="collation-matin">Collation matin</option>
              <option value="dejeuner" selected>Déjeuner</option>
              <option value="collation-aprem">Collation après-midi</option>
              <option value="diner">Dîner</option>
            </select>
            <select name="food_id" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              {foods.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.category})
                </option>
              ))}
            </select>
            <input
              type="number"
              name="planned_qty_g"
              defaultValue={250}
              min={10}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Quantité en grammes"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 active:scale-95 transition"
            >
              Programmer
            </button>
          </form>
        </div>

        {/* Planned meals */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Repas programmés
          </h2>
          {plans.length === 0 ? (
            <p className="text-center py-8 text-gray-400">Aucun repas programmé pour aujourd'hui.</p>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{plan.food_name}</p>
                    <p className="text-xs text-gray-400">
                      {mealTypeLabels[plan.meal_type] || plan.meal_type} · {plan.planned_qty_g}g · ~{plan.estimated_ww_points} pts
                    </p>
                  </div>
                  <form method="post" className="inline">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <button
                      type="submit"
                      className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
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
          <a href="/plan" className="flex flex-col items-center text-orange-600">
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
