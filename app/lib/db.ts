/**
 * Couche d'accès aux données D1 — requêtes pour aliments, repas, plans.
 */

import { calculateWwPoints, type FoodMacros } from "./ww-points";

export interface Food {
  id: number;
  name: string;
  category: string;
  kcal_per_100g: number;
  protein_per_100g: number;
  sat_fat_per_100g: number;
  sugar_per_100g: number;
  fiber_per_100g: number;
  default_portion_g: number;
  allowed: number;
}

export interface FoodWithPoints extends Food {
  ww_points_per_default_portion: number;
}

export interface MealLog {
  id: number;
  user_id: number;
  date: string;
  meal_type: string;
  food_id: number;
  food_name: string;
  category: string;
  portion_desc: string;
  qty_g: number;
  ww_points: number;
  logged_at: string;
  note: string | null;
}

export interface MealPlan {
  id: number;
  user_id: number;
  date: string;
  meal_type: string;
  food_id: number;
  food_name: string;
  category: string;
  planned_qty_g: number;
  estimated_ww_points: number;
}

// --- Aliments ---

export async function getAllFoods(db: D1Database): Promise<FoodWithPoints[]> {
  const { results } = await db.prepare(
    `SELECT * FROM foods WHERE allowed = 1 ORDER BY name ASC`,
  ).all<Food>();

  return results.map((f) => ({
    ...f,
    ww_points_per_default_portion: calculateWwPoints(
      f as unknown as FoodMacros,
      f.default_portion_g,
    ),
  }));
}

export async function searchFoods(db: D1Database, query: string): Promise<Food[]> {
  const { results } = await db
    .prepare(`SELECT * FROM foods WHERE allowed = 1 AND name LIKE ? ORDER BY name ASC LIMIT 20`)
    .bind(`%${query}%`)
    .all<Food>();
  return results;
}

export async function getFoodById(db: D1Database, id: number): Promise<Food | null> {
  return await db.prepare(`SELECT * FROM foods WHERE id = ?`).bind(id).first<Food>();
}

// --- Repas saisis ---

export async function getMealLogsForDate(
  db: D1Database,
  userId: number,
  date: string,
): Promise<MealLog[]> {
  const { results } = await db
    .prepare(
      `SELECT ml.*, f.name as food_name, f.category
       FROM meal_logs ml
       JOIN foods f ON ml.food_id = f.id
       WHERE ml.user_id = ? AND ml.date = ?
       ORDER BY ml.logged_at ASC`,
    )
    .bind(userId, date)
    .all<MealLog>();
  return results;
}

export async function getTotalPointsForDate(
  db: D1Database,
  userId: number,
  date: string,
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COALESCE(SUM(ww_points), 0) as total FROM meal_logs WHERE user_id = ? AND date = ?`,
    )
    .bind(userId, date)
    .first<{ total: number }>();
  return result?.total ?? 0;
}

export async function logMeal(
  db: D1Database,
  userId: number,
  data: {
    date: string;
    meal_type: string;
    food_id: number;
    portion_desc: string;
    qty_g: number;
    ww_points: number;
    note?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO meal_logs (user_id, date, meal_type, food_id, portion_desc, qty_g, ww_points, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId,
      data.date,
      data.meal_type,
      data.food_id,
      data.portion_desc,
      data.qty_g,
      data.ww_points,
      data.note ?? null,
    )
    .run();
}

export async function deleteMealLog(db: D1Database, logId: number, userId: number): Promise<void> {
  await db.prepare(`DELETE FROM meal_logs WHERE id = ? AND user_id = ?`).bind(logId, userId).run();
}

// --- Plans de repas ---

export async function getMealPlansForDate(
  db: D1Database,
  userId: number,
  date: string,
): Promise<MealPlan[]> {
  const { results } = await db
    .prepare(
      `SELECT mp.*, f.name as food_name, f.category
       FROM meal_plans mp
       JOIN foods f ON mp.food_id = f.id
       WHERE mp.user_id = ? AND mp.date = ?
       ORDER BY
         CASE mp.meal_type
           WHEN 'petit-dejeuner' THEN 1
           WHEN 'collation-matin' THEN 2
           WHEN 'dejeuner' THEN 3
           WHEN 'collation-aprem' THEN 4
           WHEN 'diner' THEN 5
           ELSE 6
         END`,
    )
    .bind(userId, date)
    .all<MealPlan>();
  return results;
}

export async function addMealPlan(
  db: D1Database,
  userId: number,
  data: {
    date: string;
    meal_type: string;
    food_id: number;
    planned_qty_g: number;
  },
): Promise<void> {
  const food = await getFoodById(db, data.food_id);
  const points = food
    ? calculateWwPoints(food as unknown as FoodMacros, data.planned_qty_g)
    : 0;

  await db
    .prepare(
      `INSERT INTO meal_plans (user_id, date, meal_type, food_id, planned_qty_g, estimated_ww_points)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(userId, data.date, data.meal_type, data.food_id, data.planned_qty_g, points)
    .run();
}

export async function deleteMealPlan(db: D1Database, planId: number, userId: number): Promise<void> {
  await db.prepare(`DELETE FROM meal_plans WHERE id = ? AND user_id = ?`).bind(planId, userId).run();
}

// --- Utilisateur ---

export async function getUserById(db: D1Database, userId: number) {
  return await db
    .prepare(`SELECT id, email, daily_points_target FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ id: number; email: string; daily_points_target: number }>();
}

export async function updateUserTarget(
  db: D1Database,
  userId: number,
  target: number,
): Promise<void> {
  await db
    .prepare(`UPDATE users SET daily_points_target = ? WHERE id = ?`)
    .bind(target, userId)
    .run();
}
