-- Miam — Schéma de base de données D1

-- Utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  daily_points_target INTEGER NOT NULL DEFAULT 23,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Aliments
CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  kcal_per_100g REAL NOT NULL,
  protein_per_100g REAL NOT NULL,
  sat_fat_per_100g REAL NOT NULL,
  sugar_per_100g REAL NOT NULL,
  fiber_per_100g REAL NOT NULL,
  default_portion_g INTEGER NOT NULL DEFAULT 250,
  allowed INTEGER NOT NULL DEFAULT 1
);

-- Plans de repas (ce qui est prévu)
CREATE TABLE IF NOT EXISTS meal_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  food_id INTEGER NOT NULL,
  planned_qty_g INTEGER NOT NULL,
  estimated_ww_points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Repas saisis (ce qui a été réellement mangé)
CREATE TABLE IF NOT EXISTS meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  food_id INTEGER NOT NULL,
  portion_desc TEXT NOT NULL,
  qty_g INTEGER NOT NULL,
  ww_points INTEGER NOT NULL,
  note TEXT,
  logged_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON meal_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
