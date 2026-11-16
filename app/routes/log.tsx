import { redirect } from "react-router";
import type { Route } from "./+types/log";
import { getUserFromRequest } from "~/lib/auth";
import { getAllFoods, logMeal, getMealLogsForDate, getMealPlansForDate, getTotalPointsForDate, getUserById } from "~/lib/db";
import { parsePortionInput, extractFoodName } from "~/lib/portion-estimator";
import { calculateWwPoints, type FoodMacros } from "~/lib/ww-points";
import { generateSuggestions, type LoggedMeal, type PlannedMeal } from "~/lib/smart-adjustments";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, new Request("http://localhost"));
  if (!user) throw redirect("/login");

  const foods = await getAllFoods(db);
  return { foods };
}

export async function action({ request, context }: Route.ActionArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, request);
  if (!user) throw redirect("/login");

  const formData = await request.formData();
  const mode = formData.get("mode") as string; // "search" | "free-text" | "quick"
  const today = new Date().toISOString().split("T")[0];

  let foodId: number;
  let portionDesc: string;
  let qtyG: number;
  let wwPoints: number;

  if (mode === "free-text") {
    // Saisie libre en langage naturel
    const freeText = formData.get("free_text") as string;
    const mealType = formData.get("meal_type") as string;
    const foods = await getAllFoods(db);
    const foodNames = foods.map((f) => f.name);

    // Trouver l'aliment dans le texte
    const matchedName = extractFoodName(freeText, foodNames);
    if (!matchedName) {
      return { error: "Aliment non reconnu dans votre saisie. Essayez la recherche par nom." };
    }

    const food = foods.find((f) => f.name === matchedName)!;
    foodId = food.id;

    // Estimer la portion
    const parsed = parsePortionInput(freeText);
    portionDesc = `${parsed.quantity} × ${parsed.portionLabel}`;
    qtyG = parsed.weight_g;
    wwPoints = calculateWwPoints(food as unknown as FoodMacros, qtyG);

    await logMeal(db, user.id, {
      date: today,
      meal_type: mealType,
      food_id: foodId,
      portion_desc: portionDesc,
      qty_g: qtyG,
      ww_points: wwPoints,
      note: freeText,
    });
  } else if (mode === "quick") {
    // Saisie rapide : aliment sélectionné + portion qualitative
    foodId = parseInt(formData.get("food_id") as string, 10);
    const portionLabel = formData.get("portion_label") as string;
    const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
    const mealType = formData.get("meal_type") as string;

    const foods = await getAllFoods(db);
    const food = foods.find((f) => f.id === foodId);
    if (!food) return { error: "Aliment introuvable" };

    // Mapper le label de portion à un poids
    const portionWeights: Record<string, number> = {
      "petite part": 120,
      "part standard": 250,
      "grosse part": 400,
      "très grosse part": 600,
    };
    qtyG = (portionWeights[portionLabel] ?? food.default_portion_g) * quantity;
    portionDesc = `${quantity} × ${portionLabel}`;
    wwPoints = calculateWwPoints(food as unknown as FoodMacros, qtyG);

    await logMeal(db, user.id, {
      date: today,
      meal_type: mealType,
      food_id: foodId,
      portion_desc: portionDesc,
      qty_g: qtyG,
      ww_points: wwPoints,
    });
  } else {
    // Recherche par nom + quantité en grammes
    foodId = parseInt(formData.get("food_id") as string, 10);
    qtyG = parseInt(formData.get("qty_g") as string, 10);
    const mealType = formData.get("meal_type") as string;

    const foods = await getAllFoods(db);
    const food = foods.find((f) => f.id === foodId);
    if (!food) return { error: "Aliment introuvable" };

    portionDesc = `${qtyG}g`;
    wwPoints = calculateWwPoints(food as unknown as FoodMacros, qtyG);

    await logMeal(db, user.id, {
      date: today,
      meal_type: mealType,
      food_id: foodId,
      portion_desc: portionDesc,
      qty_g: qtyG,
      ww_points: wwPoints,
    });
  }

  // Générer les suggestions après la saisie
  const [logs, plans, consumed, userInfo] = await Promise.all([
    getMealLogsForDate(db, user.id, today),
    getMealPlansForDate(db, user.id, today),
    getTotalPointsForDate(db, user.id, today),
    getUserById(db, user.id),
  ]);

  const target = userInfo?.daily_points_target ?? user.daily_points_target;
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

  return { success: true, suggestions, wwPoints, qtyG, portionDesc };
}

export default function Log({ loaderData, actionData }: Route.ComponentProps) {
  const { foods } = loaderData;

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      <header className="bg-orange-500 text-white px-4 pt-3 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <h1 className="text-xl font-bold">➕ Saisir un repas</h1>
      </header>

      <div className="px-4 mt-4 space-y-4">
        {actionData?.success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="font-semibold text-green-700">Repas enregistré ! ✅</p>
            <p className="text-sm text-gray-600 mt-1">
              {actionData.portionDesc} → {actionData.wwPoints} points
            </p>
          </div>
        )}

        {/* Saisie libre en langage naturel */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">💬 Saisie libre</h2>
          <p className="text-xs text-gray-400 mb-3">
            Décrivez ce que vous avez mangé sans peser. Ex : « 2 grosses parts de lasagnes »
          </p>
          <form method="post" className="space-y-3">
            <input type="hidden" name="mode" value="free-text" />
            <select name="meal_type" className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
              <option value="petit-dejeuner">Petit-déjeuner</option>
              <option value="collation-matin">Collation matin</option>
              <option value="dejeuner" selected>Déjeuner</option>
              <option value="collation-aprem">Collation après-midi</option>
              <option value="diner">Dîner</option>
            </select>
            <textarea
              name="free_text"
              rows={3}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-orange-500 outline-none resize-none"
              placeholder="Ex : j'ai pris 2 grosses parts de lasagnes et un petit bol de riz"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 active:scale-95 transition"
            >
              Enregistrer
            </button>
          </form>
          {actionData?.error && mode === "free-text" && (
            <p className="text-sm text-red-500 mt-2">{actionData.error}</p>
          )}
        </div>

        {/* Saisie rapide par aliment */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-800 mb-3">🍎 Saisie rapide</h2>
          <form method="post" className="space-y-3">
            <input type="hidden" name="mode" value="quick" />
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
            <div className="flex gap-2">
              <select name="portion_label" className="flex-1 rounded-xl border border-gray-300 px-3 py-2.5 text-sm">
                <option value="petite part">Petite part (~120g)</option>
                <option value="part standard" selected>Part standard (~250g)</option>
                <option value="grosse part">Grosse part (~400g)</option>
                <option value="très grosse part">Très grosse part (~600g)</option>
              </select>
              <input
                type="number"
                name="quantity"
                defaultValue={1}
                min={1}
                max={10}
                className="w-20 rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-center"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-orange-500 py-3 text-white font-medium hover:bg-orange-600 active:scale-95 transition"
            >
              Enregistrer
            </button>
          </form>
        </div>

        {/* Saisie précise en grammes */}
        <details className="bg-white rounded-2xl shadow-sm p-4">
          <summary className="font-semibold text-gray-800 cursor-pointer">⚖️ Saisie précise (en grammes)</summary>
          <form method="post" className="space-y-3 mt-3">
            <input type="hidden" name="mode" value="search" />
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
              name="qty_g"
              defaultValue={250}
              min={1}
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="Quantité en grammes"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-gray-700 py-3 text-white font-medium hover:bg-gray-800 active:scale-95 transition"
            >
              Enregistrer
            </button>
          </form>
        </details>

        {/* Suggestions d'ajustement */}
        {actionData?.suggestions && actionData.suggestions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ajustements suggérés</h2>
            {actionData.suggestions.map((s: any, i: number) => (
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
                  <a href="/plan" className="inline-block mt-2 text-xs font-medium text-orange-600 hover:underline">
                    Ajuster le plan →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 bottom-nav">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto">
          <a href="/dashboard" className="flex flex-col items-center text-gray-400">
            <span className="text-xl">🏠</span>
            <span className="text-[10px]">Accueil</span>
          </a>
          <a href="/log" className="flex flex-col items-center text-orange-600">
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
