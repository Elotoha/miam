CREATE TABLE IF NOT EXISTS workspace_migrations(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS profiles (
 user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 weight REAL, height REAL, sex TEXT, age INTEGER, target_weight REAL, target_date TEXT,
 activity REAL NOT NULL DEFAULT 1.4, intolerances TEXT NOT NULL DEFAULT '[]', targets_json TEXT NOT NULL DEFAULT '{}', program_enabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS weight_history (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, date TEXT NOT NULL, weight REAL NOT NULL, UNIQUE(user_id,date)
);
CREATE TABLE IF NOT EXISTS catalog_foods (
 id TEXT PRIMARY KEY, owner_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, origin_id TEXT,
 name TEXT NOT NULL, category TEXT NOT NULL, portion REAL NOT NULL DEFAULT 100,
 nutrients TEXT NOT NULL DEFAULT '{}', source TEXT NOT NULL DEFAULT '', gluten TEXT NOT NULL DEFAULT 'unknown', lactose TEXT NOT NULL DEFAULT 'unknown', UNIQUE(owner_user_id,origin_id)
);
CREATE TABLE IF NOT EXISTS food_preferences (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, food_id TEXT NOT NULL REFERENCES catalog_foods(id), affinity INTEGER CHECK(affinity BETWEEN 0 AND 5), available INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(user_id,food_id)
);
CREATE TABLE IF NOT EXISTS meal_programs (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 meal_type TEXT NOT NULL, title TEXT NOT NULL, tree_json TEXT NOT NULL, UNIQUE(user_id,meal_type)
);
CREATE TABLE IF NOT EXISTS meals (
 id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 date TEXT NOT NULL, meal_type TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','planned','consumed')), title TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meal_items (
 id TEXT PRIMARY KEY, meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
 food_id TEXT REFERENCES catalog_foods(id), name TEXT NOT NULL, grams REAL NOT NULL CHECK(grams > 0),
 nutrients TEXT NOT NULL, source TEXT NOT NULL, gluten TEXT NOT NULL DEFAULT 'unknown', lactose TEXT NOT NULL DEFAULT 'unknown',
 estimated INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id,date);
CREATE INDEX IF NOT EXISTS idx_items_meal ON meal_items(meal_id);
INSERT OR IGNORE INTO catalog_foods(id,name,category,portion,nutrients,source)
 SELECT 'base-'||id,name,category,default_portion_g,
 json_object('energy',kcal_per_100g,'protein',protein_per_100g,'saturated',sat_fat_per_100g,'sugars',sugar_per_100g,'fiber',fiber_per_100g),
 'Catalogue initial : valeurs approximatives, à vérifier sur l’étiquette ou Ciqual' FROM foods;
-- Preserve earlier meals. Stable IDs make the migration repeatable.
INSERT OR IGNORE INTO meals(id,user_id,date,meal_type,status,title)
 SELECT 'legacy-log-'||user_id||'-'||date||'-'||meal_type,user_id,date,meal_type,'consumed','Repas réalisé' FROM meal_logs WHERE NOT EXISTS (SELECT 1 FROM workspace_migrations WHERE id='legacy-meals-v1') GROUP BY user_id,date,meal_type;
INSERT OR IGNORE INTO meal_items(id,meal_id,food_id,name,grams,nutrients,source,estimated,note)
 SELECT 'legacy-log-item-'||l.id,'legacy-log-'||l.user_id||'-'||l.date||'-'||l.meal_type,c.id,c.name,l.qty_g,c.nutrients,c.source,1,COALESCE(l.portion_desc,'')
 FROM meal_logs l JOIN catalog_foods c ON c.id='base-'||l.food_id WHERE l.qty_g>0 AND NOT EXISTS (SELECT 1 FROM workspace_migrations WHERE id='legacy-meals-v1');
INSERT OR IGNORE INTO meals(id,user_id,date,meal_type,status,title)
 SELECT 'legacy-plan-'||user_id||'-'||date||'-'||meal_type,user_id,date,meal_type,'planned','Repas planifié' FROM meal_plans WHERE NOT EXISTS (SELECT 1 FROM workspace_migrations WHERE id='legacy-meals-v1') GROUP BY user_id,date,meal_type;
INSERT OR IGNORE INTO meal_items(id,meal_id,food_id,name,grams,nutrients,source)
 SELECT 'legacy-plan-item-'||p.id,'legacy-plan-'||p.user_id||'-'||p.date||'-'||p.meal_type,c.id,c.name,p.planned_qty_g,c.nutrients,c.source
 FROM meal_plans p JOIN catalog_foods c ON c.id='base-'||p.food_id WHERE p.planned_qty_g>0 AND NOT EXISTS (SELECT 1 FROM workspace_migrations WHERE id='legacy-meals-v1');
INSERT OR IGNORE INTO workspace_migrations(id) VALUES('legacy-meals-v1');
INSERT OR IGNORE INTO catalog_foods(id,name,category,portion,nutrients,source,gluten,lactose) VALUES
 ('extra-peanuts','Cacahuètes','Oleagineux',25,'{}','À compléter selon le produit','unknown','unknown'),
 ('extra-soup','Soupe de légumes','Legumes',300,'{}','Recette à renseigner','unknown','unknown'),
 ('extra-fromage-blanc','Fromage blanc 3%','Produits laitiers',100,'{}','À compléter selon l’étiquette','unknown','present'),
 ('extra-skyr','Skyr nature','Produits laitiers',100,'{}','À compléter selon l’étiquette','unknown','present');
CREATE TABLE IF NOT EXISTS ai_usage(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,date TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,date));
