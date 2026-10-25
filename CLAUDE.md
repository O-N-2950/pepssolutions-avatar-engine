# Instructions agent


## Tests : NEO CI

- Le check de référence est « **NEO CI / tests** » (application GitHub `neo-ci-2950`), lu sur le SHA exact du dernier commit de la PR.
- GitHub Actions est en pause (facturation bloquée) : un échec Actions « startup_failure / No jobs were run » n'est pas un échec de code.
- Un résultat NEO CI `BLOCKED` ou `neutral` signifie une couverture incomplète, jamais un succès.
- Ne pas modifier les workflows pour contourner NEO CI. S'il est absent, demander son exécution au projet NEO Factory au lieu de fusionner.
- Règle canonique : [neo-core — NEO_CI_TESTS_REPLACES_GITHUB_ACTIONS.md](https://github.com/O-N-2950/neo-core/blob/main/knowledge/governance/NEO_CI_TESTS_REPLACES_GITHUB_ACTIONS.md)

<!-- NEO_AGENT_DELIVERY_POLICY_V1:START -->
## NEO Agent Delivery Policy — version épinglée
Repo : O-N-2950/pepssolutions-avatar-engine
Source : O-N-2950/neo-core@d8e6da0a61c118e11abe9827e8e8ff079eb0d2f8:knowledge/governance/agent-delivery-policy.v1.json
Version : 1.0.0 | sha256:3b3d9a6bdfdd1cfe2a42a8ee20936a0c4619757af00bcf5cce66832d6e5550ef
Lire d'abord les règles locales et docs/NORTH_STAR.md du produit.
Branches Git : dev pour développer/intégrer ; branche par défaut réelle pour livrer.
Pas de certification lourde automatique par commit dev ou PR brouillon.
Une version prête : certification complète avant une seule fusion vers main/master.
Un check NEO CI / tests vert n'autorise pas la fusion à lui seul.
Les consignes locales plus strictes restent applicables ; UNKNOWN reste UNKNOWN.
- **ADP-001 PRODUCT_NORTH_STAR** : Chaque produit garde sa North Star, ses données et règles métier ; aucune instruction globale ne peut remplacer cette autorité.
- **ADP-002 VERIFY_CURRENT_CODE** : Avant travail lire les instructions, le HEAD réel, la base et les PR concurrentes ; les souvenirs et descriptions ne prouvent pas le code.
- **ADP-003 FEATURE_BRANCH** : Développer sur la branche Git dev, éventuellement via des branches feature courtes ; commits atomiques et aucun push direct sur main ou master après bootstrap.
- **ADP-004 NO_MICRO_PR** : Ne pas ouvrir une PR par commit ; regrouper plusieurs commits en une fonctionnalité ou unité de revue cohérente.
- **ADP-005 BATCH_INTEGRATION** : Regrouper les changements compatibles sur dev par application, tracer leur provenance et les collisions, puis préparer une seule PR de version vers la branche par défaut réelle.
- **ADP-006 RISK_TIERED_TESTS** : Exécuter T0/T1 rapides pendant le développement et T2 sur le lot ; aucune CI lourde automatique par commit dev ou PR brouillon ; réserver T3 au candidat figé prêt et T4 à la livraison.
- **ADP-007 FAIL_CLOSED_CI** : BLOCKED, UNKNOWN, neutral, NON_SUPPORTED, workflow manquant ou couverture incomplète ne sont jamais un succès.
- **ADP-008 DEDUPE_BLOCKED** : Ne pas répéter indéfiniment une même panne d'infrastructure avec entrées identiques ; enregistrer empreinte, propriétaire et condition de relance.
- **ADP-009 FAIR_QUEUE** : Protéger les anciennes PR éligibles contre la famine par priorité liée à l'attente persistée et alternance entre produits.
- **ADP-010 REFRESH_ONLY_EVIDENCE** : L'âge d'une PR ne l'invalide pas ; rafraîchir la seule preuve temporaire nécessaire sans refaire la suite inchangée.
- **ADP-011 EXACT_RELEASE_IDENTITY** : Certifier le SHA, l'arbre Git, les workflows applicables et l'artefact immuable de la release candidate finale.
- **ADP-012 REQUIRE_AUTHORITY_GATE** : Un check NEO CI / tests vert n'autorise pas seul la fusion ; exiger toutes les portes métier, sécurité, canonique et autorité requises.
- **ADP-013 ATOMIC_PROMOTION** : Fusionner la version une seule fois par PR avec expected-head SHA, certification complète préalable et contrôle anti-collision ; promouvoir seulement le digest réellement testé.
- **ADP-014 PROVE_RUNTIME_AND_UX** : Vérifier l'artefact et SHA effectivement servis, santé, parcours métier, UX/accessibilité et restauration sans régression.
- **ADP-015 ISOLATE_SECURITY** : Aucun secret ou donnée client dans les prompts/CI ni accès inter-produit implicite ; respecter scopes, confidentialité et isolation.
- **ADP-016 CONTROL_REAL_COST** : Mesurer coûts et quotas réels par livraison ; distinguer alerte de budget d'un plafond effectif chez le fournisseur.
- **ADP-017 EVIDENCE_NOT_CLAIMS** : Séparer code, tests, CI, fusion, runtime et cas réel ; jamais 100 % North Star sans preuves sur la version livrée.
- **ADP-018 ROLLOUT_WITHOUT_BIG_BANG** : Diffuser par PR locales, version et empreinte épinglées en préservant les instructions produits ; aucun déploiement transversal forcé.
T0/T1 : rapidité ; T2 : arbre combiné ; T3 : certification exacte ; T4 : version servie.
Si la source/empreinte manque : rester sur branche et bloquer la release non prouvée.
<!-- NEO_AGENT_DELIVERY_POLICY_V1:END -->

## Application du cycle Théo à ce dépôt

Pour le travail courant, la branche d’intégration est `dev`, avec branches courtes depuis son SHA courant. Les mentions historiques de branche fraîche depuis main/master décrivent l’ancien cycle. Les exigences métier, de sécurité, de confidentialité, les validations humaines métier et les preuves de livraison restent applicables. Une PR documentaire de préparation vers `dev` est contrôlée au niveau T0 (contenu, empreinte, diff et identité Git) ; elle ne certifie aucune capacité applicative. La certification complète et le contrôle NEO CI requis s’appliquent au candidat prêt avant sa fusion vers `main`. Aucun résultat absent, neutre ou bloqué ne devient un succès. La production conserve son hébergement et son déployeur canoniques. Lire les consignes dans `dev` à la reprise du développement.

Aucune North Star dédiée n’a été identifiée dans cet instantané : préserver les consignes et le périmètre existants, sans inventer de critères ni annoncer de certification produit.
