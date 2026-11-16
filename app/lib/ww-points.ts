/**
 * Calcul des points Weight Watchers (SmartPoints) — approximation.
 *
 * Formule SmartPoints (approximation publique) :
 *   points = max(0, round((kcal + 4×protéines + 9×graisses_saturées + 3×sucres - 4×fibres) / 33))
 *
 * NOTE : Cette formule est une approximation. Ajustez les coefficients
 * si vous utilisez un système de points différent (SmartPoints 2015, PersonalPoints, etc.).
 */

export interface FoodMacros {
  kcal_per_100g: number;
  protein_per_100g: number;
  sat_fat_per_100g: number;
  sugar_per_100g: number;
  fiber_per_100g: number;
}

export function calculateWwPoints(macros: FoodMacros, quantityGrams: number): number {
  const ratio = quantityGrams / 100;
  const kcal = macros.kcal_per_100g * ratio;
  const protein = macros.protein_per_100g * ratio;
  const satFat = macros.sat_fat_per_100g * ratio;
  const sugar = macros.sugar_per_100g * ratio;
  const fiber = macros.fiber_per_100g * ratio;

  const raw = (kcal + 4 * protein + 9 * satFat + 3 * sugar - 4 * fiber) / 33;
  return Math.max(0, Math.round(raw));
}

export function pointsForDay(target: number, consumed: number): { remaining: number; percentage: number } {
  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(100, Math.round((consumed / target) * 100));
  return { remaining, percentage };
}
