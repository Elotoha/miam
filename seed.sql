-- Miam — Données de départ : ~30 aliments courants avec macros
-- Catégories : feculents, proteines, legumes, fruits, produits_laitiers, matieres_grasses, sucreries, boissons
-- Macros pour 100g : kcal, protéines, graisses saturées, sucres, fibres

INSERT INTO foods (name, category, kcal_per_100g, protein_per_100g, sat_fat_per_100g, sugar_per_100g, fiber_per_100g, default_portion_g) VALUES
-- Féculents
('Lasagnes', 'feculents', 135, 7, 3.5, 2.5, 1.8, 350),
('Riz cuit', 'feculents', 130, 2.7, 0.1, 0.1, 0.4, 200),
('Pâtes cuites', 'feculents', 158, 5.8, 0.2, 0.6, 1.8, 200),
('Pain de mie', 'feculents', 265, 9, 1.2, 5, 3, 50),
('Pommes de terre cuites', 'feculents', 87, 2, 0.1, 0.2, 2.2, 200),
('Quinoa cuit', 'feculents', 120, 4.4, 0.2, 0.4, 2.8, 200),
('Semoule couscous', 'feculents', 112, 3.8, 0.1, 0.1, 1.8, 200),
('Flocons d''avoine', 'feculents', 389, 13.2, 1.3, 1, 10.3, 40),
('Pomme de terre frite', 'feculents', 312, 3.4, 2.5, 0.3, 3.8, 150),

-- Protéines
('Poulet grillé', 'proteines', 165, 31, 1, 0, 0, 150),
('Steak haché 5%', 'proteines', 135, 20, 2, 0, 0, 150),
('Poisson blanc (cabillaud)', 'proteines', 82, 18, 0.2, 0, 0, 150),
('Saumon', 'proteines', 208, 20, 3, 0, 0, 150),
('Jambon blanc', 'proteines', 115, 22, 1, 0.5, 0, 50),
('Œuf', 'proteines', 155, 13, 3.3, 1.1, 0, 60),
('Tofu', 'proteines', 144, 17, 1.3, 0.6, 2.3, 100),
('Crevettes', 'proteines', 99, 24, 0.1, 0, 0, 100),

-- Légumes
('Salade verte', 'legumes', 15, 1.4, 0.1, 0.8, 1.3, 100),
('Tomate', 'legumes', 18, 0.9, 0.1, 2.6, 1.2, 150),
('Brocoli cuit', 'legumes', 35, 2.4, 0.1, 1.7, 3.3, 150),
('Carottes cuites', 'legumes', 35, 0.6, 0.1, 3.4, 2.6, 150),
('Courgettes cuites', 'legumes', 15, 1.2, 0.1, 1.7, 1.1, 150),
('Épinards cuits', 'legumes', 23, 3, 0.1, 0.4, 2.4, 150),

-- Fruits
('Pomme', 'fruits', 52, 0.3, 0.1, 10.4, 2.4, 150),
('Banane', 'fruits', 89, 1.1, 0.1, 12.2, 2.6, 120),
('Orange', 'fruits', 47, 0.9, 0.1, 9.4, 2.4, 130),
('Fraises', 'fruits', 32, 0.7, 0.1, 4.9, 2, 150),

-- Produits laitiers
('Yaourt nature', 'produits_laitiers', 59, 10, 1.5, 4.7, 0, 125),
('Fromage blanc 0%', 'produits_laitiers', 45, 8, 0.1, 4.5, 0, 100),
('Comté', 'produits_laitiers', 387, 25, 18, 0.2, 0, 30),

-- Matières grasses
('Huile d''olive', 'matieres_grasses', 884, 0, 13.5, 0, 0, 10),
('Beurre', 'matieres_grasses', 717, 0.9, 51, 0.1, 0, 10),

-- Sucreries
('Chocolat noir', 'sucreries', 546, 4.9, 19.6, 30, 7, 30),
('Nutella', 'sucreries', 539, 6.3, 10.9, 57.5, 0, 15),
('Biscuit sablé', 'sucreries', 459, 6, 8, 25, 1.5, 15),

-- Boissons
('Jus d''orange', 'boissons', 45, 0.7, 0.1, 8.4, 0.2, 200),
('Coca-Cola', 'boissons', 42, 0, 0, 10.6, 0, 330);
