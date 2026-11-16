/**
 * Estimation de portions qualitatives — permet de saisir un repas sans peser.
 *
 * L'utilisateur décrit sa portion en langage naturel : "2 grosses parts de lasagnes",
 * "1 bol de riz", "3 cuillères de Nutella".
 *
 * Chaque aliment a des portions prédéfinies avec un poids en grammes.
 * Le système extrait le nombre et le type de portion depuis le texte.
 */

export interface PortionSize {
  label: string;
  weight_g: number;
  keywords: string[];
}

export interface FoodWithPortions {
  id: number;
  name: string;
  portions: PortionSize[];
}

// Portions génériques par défaut si un aliment n'a pas de portions personnalisées
export const DEFAULT_PORTIONS: PortionSize[] = [
  { label: "petite part", weight_g: 120, keywords: ["petite", "petit", "peu"] },
  { label: "part standard", weight_g: 250, keywords: ["standard", "normale", "normal", "moyenne", "moyen"] },
  { label: "grosse part", weight_g: 400, keywords: ["grosse", "gros", "grande", "grand", "généreuse", "generese"] },
  { label: "très grosse part", weight_g: 600, keywords: ["très grosse", "tres grosse", "énorme", "enorme", "double"] },
];

export const COMMON_UNITS: Record<string, number> = {
  "cuillère": 15,
  "cuillères": 15,
  "cuillere": 15,
  "cuilleres": 15,
  "cuillère à soupe": 15,
  "cuillère à café": 5,
  "bol": 250,
  "bol moyen": 250,
  "grand bol": 400,
  "assiette": 300,
  "assiette pleine": 350,
  "verre": 200,
  "grand verre": 350,
  "tasse": 200,
  "mug": 300,
  "tranche": 30,
  "morceau": 50,
  "poignée": 30,
  "poignée pleine": 50,
  "barre": 35,
  "portion": 100,
  "part": 250,
  "pièce": 100,
  "piece": 100,
  "unité": 80,
  "unite": 80,
  "sachet": 40,
  "pot": 125,
  "yaourt": 125,
  "œuf": 60,
  "oeuf": 60,
  "banane": 120,
  "pomme": 150,
  "orange": 130,
};

export interface ParsedPortion {
  quantity: number;
  portionLabel: string;
  weight_g: number;
  matchedFood: string | null;
  rawInput: string;
}

/**
 * Parse une saisie utilisateur en portions estimées.
 * Exemples :
 *   "2 grosses parts de lasagnes" → { quantity: 2, weight_g: 800, portionLabel: "grosse part" }
 *   "1 bol de riz" → { quantity: 1, weight_g: 250, portionLabel: "bol" }
 *   "3 tranches de pain" → { quantity: 3, weight_g: 90, portionLabel: "tranche" }
 */
export function parsePortionInput(
  input: string,
  foodPortions: PortionSize[] = [],
): ParsedPortion {
  const text = input.toLowerCase().trim();

  // 1. Extraire la quantité (premier nombre trouvé)
  const qtyMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  const quantity = qtyMatch ? parseFloat(qtyMatch[1].replace(",", ".")) : 1;

  // 2. Chercher une portion personnalisée de l'aliment
  for (const p of foodPortions) {
    for (const kw of p.keywords) {
      if (text.includes(kw)) {
        return {
          quantity,
          portionLabel: p.label,
          weight_g: Math.round(p.weight_g * quantity),
          matchedFood: null,
          rawInput: input,
        };
      }
    }
  }

  // 3. Chercher dans les portions génériques
  for (const p of DEFAULT_PORTIONS) {
    for (const kw of p.keywords) {
      if (text.includes(kw)) {
        return {
          quantity,
          portionLabel: p.label,
          weight_g: Math.round(p.weight_g * quantity),
          matchedFood: null,
          rawInput: input,
        };
      }
    }
  }

  // 4. Chercher une unité commune (bol, cuillère, tranche, etc.)
  for (const [unit, weight] of Object.entries(COMMON_UNITS)) {
    if (text.includes(unit)) {
      return {
        quantity,
        portionLabel: unit,
        weight_g: Math.round(weight * quantity),
        matchedFood: null,
        rawInput: input,
      };
    }
  }

  // 5. Fallback : si un nombre est trouvé sans unité, supposer 100g par unité
  if (qtyMatch) {
    return {
      quantity,
      portionLabel: "portion estimée",
      weight_g: Math.round(100 * quantity),
      matchedFood: null,
      rawInput: input,
    };
  }

  // 6. Dernier recours : 1 portion standard de 250g
  return {
    quantity: 1,
    portionLabel: "portion standard",
    weight_g: 250,
    matchedFood: null,
    rawInput: input,
  };
}

/**
 * Recherche floue d'un aliment par nom dans la saisie.
 * "j'ai pris 2 grosses parts de lasagnes" → "lasagnes"
 */
export function extractFoodName(input: string, foodNames: string[]): string | null {
  const text = input.toLowerCase();
  // Trier par longueur décroissante pour matcher les noms composés d'abord
  const sorted = [...foodNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (text.includes(name.toLowerCase())) {
      return name;
    }
  }
  return null;
}
