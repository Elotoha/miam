import { redirect } from "react-router";
import type { Route } from "./+types/foods";
import { getUserFromRequest } from "~/lib/auth";
import { getAllFoods } from "~/lib/db";

export async function loader({ context }: Route.LoaderArgs) {
  const db = context.cloudflare.env.DB;
  const user = await getUserFromRequest(db, new Request("http://localhost"));
  if (!user) throw redirect("/login");

  const foods = await getAllFoods(db);
  return { foods };
}

export default function Foods({ loaderData }: Route.ComponentProps) {
  const { foods } = loaderData;

  const categoryColors: Record<string, string> = {
    feculents: "bg-amber-100 text-amber-700",
    proteines: "bg-red-100 text-red-700",
    legumes: "bg-green-100 text-green-700",
    fruits: "bg-pink-100 text-pink-700",
    produits_laitiers: "bg-blue-100 text-blue-700",
    matieres_grasses: "bg-yellow-100 text-yellow-700",
    sucreries: "bg-purple-100 text-purple-700",
    boissons: "bg-cyan-100 text-cyan-700",
  };

  const categoryLabels: Record<string, string> = {
    feculents: "Féculents",
    proteines: "Protéines",
    legumes: "Légumes",
    fruits: "Fruits",
    produits_laitiers: "Produits laitiers",
    matieres_grasses: "Matières grasses",
    sucreries: "Sucreries",
    boissons: "Boissons",
  };

  // Grouper par catégorie
  const grouped: Record<string, typeof foods> = {};
  for (const food of foods) {
    if (!grouped[food.category]) grouped[food.category] = [];
    grouped[food.category].push(food);
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      <header className="bg-orange-500 text-white px-4 pt-3 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <h1 className="text-xl font-bold">🍎 Aliments autorisés</h1>
      </header>

      <div className="px-4 mt-4 space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${categoryColors[category] || "bg-gray-100 text-gray-700"}`}>
              {categoryLabels[category] || category}
            </h2>
            <div className="space-y-2">
              {items.map((food) => (
                <div key={food.id} className="bg-white rounded-xl p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{food.name}</p>
                      <p className="text-xs text-gray-400">
                        Portion standard : {food.default_portion_g}g · {food.kcal_per_100g} kcal/100g
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-orange-600">
                        {food.ww_points_per_default_portion}
                      </span>
                      <span className="text-xs text-gray-400"> pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
          <a href="/foods" className="flex flex-col items-center text-orange-600">
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
