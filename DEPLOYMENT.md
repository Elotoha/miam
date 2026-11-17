# Construire et déployer Miam

## Cloudflare Workers Builds (GitHub)

Le dépôt contient désormais les mêmes sources que le déploiement direct. Paramètres du projet Cloudflare relié à `Elotoha/miam` :

- Branche de production : `main`.
- Répertoire racine : `/` (racine du dépôt).
- Commande de build : `npm run build`.
- Commande de déploiement : `npx wrangler deploy`.
- Node : `24.22.1` (`.node-version`). Dépendances npm verrouillées par `package-lock.json`.

Cloudflare doit installer avec npm à partir du verrou. Pour reproduire exactement l'installation, utiliser `npm ci`. Il n'est pas nécessaire de changer de version de React Router ni de réactiver `future.v8_viteEnvironmentApi`, supprimé en v8.

Le plugin Vite produit `build/server/wrangler.json` et `.wrangler/deploy/config.json`. Wrangler sélectionne cette configuration de déploiement automatiquement. `wrangler.jsonc` contient l'identifiant de la base existante et les bindings `DB` et `AI` ; ces identifiants ne sont pas des secrets. Aucun fichier externe à ce dépôt n'est nécessaire pour compiler ou déployer.

L'authentification du build est gérée par Cloudflare Workers Builds. Pour déployer depuis un terminal, fournir les identifiants dans l'environnement sécurisé (`CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`), jamais dans le dépôt.

Un push sur `main` doit déclencher le build associé dans Cloudflare. L'état réel est visible dans Workers & Pages → miam → Builds. Un échec de build avant le déploiement ne remplace pas le Worker déjà en ligne.

## Reproduction locale

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run setup:local` initialise le schéma historique et applique `migrations/0001_meal_workspace.sql`, sans dupliquer les aliments ni réimporter un ancien repas déjà supprimé. Il ne touche pas à la base distante.

Dans deux terminaux :

```bash
npm run dev -- --host 0.0.0.0
```

```bash
npm run test:smoke
```

Les contrôles d'interface utilisent Chromium/Playwright (`CHROMIUM_PATH` si nécessaire). Les tests suppriment leurs comptes dédiés. Pour les étapes précises et les limites des données, voir `PRODUCT.md`.

## Déploiement depuis un terminal

```bash
npm run deploy
```

Ce script construit puis déploie. Pour un contrôle sans publication :

```bash
npm run build
npx wrangler deploy --dry-run
```

L'application publiée est https://miam.elom75.workers.dev.

## Migrations D1

La migration de l'espace repas est déjà appliquée en production. Ne pas réinitialiser ni resemer la base à chaque build. Pour une future évolution : sauvegarder D1, examiner la migration puis l'appliquer explicitement avant le code qui en dépend.

```bash
npx wrangler d1 export miam-db --remote --output /chemin/prive/sauvegarde.sql
npx wrangler d1 execute miam-db --remote --file migrations/0001_meal_workspace.sql --yes
```

Conserver les sauvegardes hors du dépôt. Les anciennes tables sont conservées. Le marqueur `legacy-meals-v1` empêche de ressusciter un historique supprimé lors d'une relance.

## Workers AI et contrôles publics

Le binding `AI` utilise le modèle `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. L'IA identifie les aliments et estime les portions ; l'utilisateur confirme les lignes. Les valeurs nutritionnelles viennent du catalogue. Si l'IA est indisponible, le repli local est explicitement indiqué.

Dans l'environnement cloud de développement, le test public peut être lancé avec la chaîne de confiance du proxy fournie à Node :

```bash
NODE_USE_ENV_PROXY=1 MIAM_TEST_URL=https://miam.elom75.workers.dev node tests/api-smoke.mjs
```

Ne pas désactiver la vérification TLS pour les tests.
