/**
 * Suggestions d'ajustement intelligentes.
 *
 * Après qu'un repas est saisi, le système analyse :
 * 1. Les points consommés vs l'objectif quotidien
 * 2. Les catégories d'aliments déjà consommées dans la journée
 * 3. Les repas encore programmés pour le reste de la journée
 *
 * Si un déséquilibre est détecté (ex: trop de féculents consommés et un repas
 * programmé contient aussi des féculents), le système propose un ajustement.
 */

export type FoodCategory = "feculents" | "proteines" | "legumes" | "fruits" | "produits_laitiers" | "matieres_grasses" | "sucreries" | "boissons";

export interface LoggedMeal {
  food_id: number;
  food_name: string;
  category: string;
  ww_points: number;
  qty_g: number;
  meal_type: string;
}

export interface PlannedMeal {
  id: number;
  food_id: number;
  food_name: string;
  category: string;
  meal_type: string;
  planned_qty_g: number;
  estimated_ww_points: number;
}

export interface AdjustmentSuggestion {
  type: "swap" | "reduce" | "skip" | "info" | "warning";
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  action?: {
    planned_meal_id: number;
    suggested_food_id?: number;
    suggested_food_name?: string;
    suggested_qty_g?: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  feculents: "féculents",
  proteines: "protéines",
  legumes: "légumes",
  fruits: "fruits",
  produits_laitiers: "produits laitiers",
  matieres_grasses: "matières grasses",
  sucreries: "sucreries",
  boissons: "boissons",
};

export function generateSuggestions(
  loggedMeals: LoggedMeal[],
  plannedMeals: PlannedMeal[],
  dailyTarget: number,
  consumedPoints: number,
): AdjustmentSuggestion[] {
  const suggestions: AdjustmentSuggestion[] = [];
  const remainingPoints = dailyTarget - consumedPoints;

  // 1. Alerte si dépassement de l'objectif quotidien
  if (remainingPoints < 0) {
    suggestions.push({
      type: "warning",
      priority: "high",
      title: "Objectif quotidien dépassé",
      message: `Vous avez consommé ${consumedPoints} points aujourd'hui, soit ${Math.abs(remainingPoints)} points au-dessus de votre objectif de ${dailyTarget}. Les repas restants pourraient être allégés.`,
    });
  }

  // 2. Analyser les catégories consommées
  const consumedByCategory: Record<string, { count: number; points: number }> = {};
  for (const meal of loggedMeals) {
    const cat = meal.category;
    if (!consumedByCategory[cat]) consumedByCategory[cat] = { count: 0, points: 0 };
    consumedByCategory[cat].count++;
    consumedByCategory[cat].points += meal.ww_points;
  }

  // 3. Analyser les repas programmés restants
  const remainingPlanned = plannedMeals.filter(
    (p) => !loggedMeals.some((l) => l.food_id === p.food_id && l.meal_type === p.meal_type),
  );

  // 4. Pour chaque repas programmé restant, vérifier si la catégorie est déjà très consommée
  for (const planned of remainingPlanned) {
    const cat = planned.category;
    const consumed = consumedByCategory[cat];
    const catLabel = CATEGORY_LABELS[cat] || cat;

    if (consumed && consumed.count >= 2 && consumed.points > dailyTarget * 0.3) {
      // La catégorie est déjà très présente aujourd'hui
      suggestions.push({
        type: "swap",
        priority: "medium",
        title: `Beaucoup de ${catLabel} aujourd'hui`,
        message: `Vous avez déjà consommé ${consumed.count} portions de ${catLabel} (${consumed.points} pts). Le repas "${planned.meal_type}" prévoit aussi du ${catLabel} (« ${planned.food_name} »). Voulez-vous remplacer par des légumes ou une autre catégorie ?`,
        action: {
          planned_meal_id: planned.id,
        },
      });
    }
  }

  // 5. Suggestion de réduction si les points restants sont faibles
  if (remainingPoints > 0 && remainingPoints < dailyTarget * 0.2 && remainingPlanned.length > 0) {
    const nextMeal = remainingPlanned[0];
    if (nextMeal.estimated_ww_points > remainingPoints) {
      suggestions.push({
        type: "reduce",
        priority: "high",
        title: "Ajuster la prochaine portion",
        message: `Il vous reste ${remainingPoints} points pour la journée, mais le prochain repas prévu (« ${nextMeal.food_name} ») est estimé à ${nextMeal.estimated_ww_points} points. Envisagez de réduire la portion d'environ ${Math.round((1 - remainingPoints / nextMeal.estimated_ww_points) * 100)}%.`,
        action: {
          planned_meal_id: nextMeal.id,
          suggested_qty_g: Math.round(nextMeal.planned_qty_g * (remainingPoints / nextMeal.estimated_ww_points)),
        },
      });
    }
  }

  // 6. Info si tout va bien
  if (suggestions.length === 0) {
    suggestions.push({
      type: "info",
      priority: "low",
      title: "Bien équilibré ! 👍",
      message: `Vous avez consommé ${consumedPoints} points sur votre objectif de ${dailyTarget}. Il vous reste ${remainingPoints} points pour les repas restants.`,
    });
  }

  // Trier par priorité
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}
