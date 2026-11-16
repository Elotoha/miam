# Miam 🍽️

App de diététique multi-utilisateur — suivi des repas, calcul de points Weight Watchers, et suggestions d'ajustement intelligentes.

## Stack technique

- **React Router v8** (SSR) — frontend + API dans un seul déploiement
- **Cloudflare Workers** — runtime serverless
- **D1** — base de données SQLite serverless
- **Tailwind CSS v4** — styling mobile-first
- **PWA** — installable sur smartphone

## Fonctionnalités

- ✅ Authentification multi-utilisateur (email/mot de passe)
- ✅ Liste des aliments autorisés avec points WW par portion
- ✅ Planification des repas (petit-déj, déjeuner, dîner, collations)
- ✅ Saisie des repas réellement consommés
- ✅ **Saisie en langage naturel** — décrivez sans peser : « 2 grosses parts de lasagnes »
- ✅ **Calcul automatique des points** Weight Watchers (SmartPoints)
- ✅ **Suggestions d'ajustement intelligentes** — détecte les déséquilibres et propose d'adapter les repas restants
- ✅ Objectif de points quotidien personnalisable
- ✅ Interface mobile-first + desktop

## Démarrage

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer la base de données D1

```bash
npx wrangler d1 create miam-db
```

Copiez l'ID de base de données renvoyé, puis remplacez `YOUR_D1_DATABASE_ID` dans `wrangler.jsonc`.

### 3. Appliquer le schéma et les données de départ

```bash
npm run db:migrate
npm run db:seed
```

### 4. Lancer en développement

```bash
npm run dev
```

L'app est disponible sur `http://localhost:5173`.

### 5. Déployer

```bash
npm run deploy
```

## Connexion à GitHub (Workers Builds)

Pour déployer automatiquement à chaque `git push` :

1. Poussez ce code sur votre dépôt GitHub
2. Dans le dashboard Cloudflare → **Workers & Pages** → **Créer une application**
3. Sélectionnez **GitHub** et autorisez l'app Cloudflare
4. Choisissez votre dépôt
5. Configurez le build : `npm run build` / Deploy : `npx wrangler deploy`
6. **Save and Deploy**

## Calcul des points WW

La formule SmartPoints utilisée (approximation) :

```
points = max(0, round((kcal + 4×protéines + 9×graisses_saturées + 3×sucres - 4×fibres) / 33))
```

Ajustez les coefficients dans `app/lib/ww-points.ts` si vous utilisez un système différent.

## Suggestions d'ajustement

Après chaque saisie de repas, le système analyse :
- Les points consommés vs l'objectif quotidien
- Les catégories d'aliments déjà consommées (féculents, protéines, légumes…)
- Les repas encore programmés pour le reste de la journée

Si un déséquilibre est détecté (ex : trop de féculents consommés et un repas programmé en contient aussi), une suggestion est affichée pour ajuster le plan.
