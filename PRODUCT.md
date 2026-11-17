# Miam : principes et limites de la nouvelle version

## Un repas est un objet, pas une liste de saisies indépendantes

Un repas possède une date, un type, un état (`draft`, `planned`, `consumed`) et des lignes. Les mêmes composants calculent et affichent ses nutriments pendant la composition, dans une proposition et une fois réalisé. Le carnet distingue consommation et projection. Les anciens `meal_logs` et `meal_plans` sont importés par identifiants stables sans les supprimer.

L'ajout manuel et l'interprétation IA ne sont pas des repas distincts. L'IA retourne une proposition multi-lignes, corrigible et sélectionnable avant confirmation. Le serveur vérifie les IDs et les poids ; aucune réponse du modèle n'est interprétée comme du SQL ou des valeurs nutritionnelles. Limite de 20 demandes d'estimation par utilisateur et par jour.

## Options de la diététicienne

Les programmes sont des arbres : feuille = aliment + quantité ; `all` = ET ; `any` = OU d'une branche entière. Le moteur additionne les exigences identiques dans une branche (une même portion ne peut pas satisfaire deux obligations ET). Il borne profondeur, nombre d'éléments et combinaisons afin d'éviter une explosion combinatoire. Les notes permettent de préciser cru/cuit ; cette précision reste à vérifier dans le catalogue.

Un utilisateur peut activer son programme, l'autre rester en composition libre. La transcription du dîner fournie est partielle et éditable, jamais automatiquement activée. Les captures coupées ne permettent pas de reconstituer tout le plan. Pour une transcription exhaustive, il faudra le document complet ou les blocs manquants.

## Nutrition et transparence

Les nutriments sont normalisés pour 100 g puis conservés avec chaque ligne : source, quantités, état d'incertitude et présence déclarée de gluten/lactose. Les modifications futures d'un aliment ne réécrivent pas les repas passés. La table initiale fournit seulement cinq valeurs approximatives. Les autres champs restent inconnus ; aucun poids estimé par un LLM ne justifie d'inventer une vitamine, un profil lipidique ou un allergène.

Une agrégation garde à la fois le total connu et sa couverture. Incomplet : signe ≥ et barre grise, jamais un feu vert ou un total WW complet. Les sous-composantes AGS/AGMI/AGPI et sucres/amidon sont séparées. Elles ne doivent pas être additionnées à leurs parents comme des catégories indépendantes. Le lactose et le gluten chiffrés sont distincts de la présence/absence/traces déclarée.

Les références générales pour adultes sont paramétrables et ne constituent pas une prescription. Les repères par repas sont indicatifs (25 % petit-déjeuner, 35 % repas principaux, 10 % collation). Les micronutriments s'interprètent surtout à la journée. Un plafond seul ne crée pas de seuil « trop peu ». Pas de plafond automatique sur les sucres totaux assimilé à tort aux sucres libres. Pas de déficit énergétique imposé à partir du poids cible ou d'une échéance. L'énergie de maintien est une estimation Mifflin–St Jeor × activité quand les entrées nécessaires sont disponibles.

Références :
- ANSES Ciqual : https://ciqual.anses.fr/
- Métadonnées officielles du jeu Ciqual 2020 consultées : https://www.data.gouv.fr/datasets/table-de-composition-nutritionnelle-des-aliments-ciqual-2020
- EFSA DRV Finder : https://www.efsa.europa.eu/en/interactive-pages/drvs
- OMS sodium : https://www.who.int/news-room/fact-sheets/detail/salt-reduction
- NHS glucides : https://www.nhs.uk/live-well/eat-well/food-types/starchy-foods-and-carbohydrates/

Le téléchargement du jeu Ciqual a échoué (HTTP 503) pendant cette tâche. Il n'a donc pas été importé ni présenté comme validé. L'enrichissement depuis des étiquettes ou une référence reste possible dans l'éditeur. Les points WW conservent la formule approximative historique, sans prétention d'équivalence avec le programme officiel actuel.

## Smartphone et confidentialité

Navigation à cinq entrées, cibles tactiles de 44–46 px, labels explicites, états accompagnant les couleurs, détail par divulgation progressive. Les mini-barres de ligne comparent les contributions connues au repas, pas une note morale. Le bilan est accessible directement depuis la composition. Sur ordinateur, résumé et composition passent en deux colonnes.

Les goûts, disponibilités, profils, programmes et repas sont filtrés côté serveur par l'utilisateur authentifié. Un aliment public modifié devient une copie personnelle. Retirer un aliment est une suppression logique pour préserver les anciennes lignes, avec possibilité de restauration. Les tests vérifient les tentatives de lecture et de mutation d'un repas d'un autre compte.

## Contrôles réalisés

- 7 tests de domaine : inconnues, plafonds, ET/OU imbriqués, portions cumulées, affinités, branches incomplètes, bornes de complexité, copies personnelles.
- Test SQLite de migration : reprise initiale, rejouabilité et non-résurrection des repas supprimés.
- Chromium local à 390 px et 1440 px : catalogue/préférences, programme imbriqué, planification, bilan, profil et isolation des comptes ; absence de débordement horizontal et d'erreurs JS.
- HTTP public : Workers AI reconnaît les 4 aliments de l'exemple ; confirmation, état réalisé, profil, programmes imbriqués et projection de journée passent.
- Le Chromium de cette machine n'accepte pas l'autorité du certificat du proxy pour le site distant. Sa vérification TLS n'a pas été désactivée : les contrôles publics HTTP ont utilisé la chaîne de confiance fournie à Node, et les contrôles d'interface ont été faits en local.
