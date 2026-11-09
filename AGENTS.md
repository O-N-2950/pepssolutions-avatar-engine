<!-- NEO_AGENT_DELIVERY_POLICY_V1:START -->
## NEO Agent Delivery Policy — version épinglée
Repo : O-N-2950/pepssolutions-avatar-engine
Source : O-N-2950/neo-core@257778e57091bb4387b68cc82bb33aedbeb69026:knowledge/governance/agent-delivery-policy.v1.json
Version : 1.3.0 | sha256:b0d135c2e4e4fbbf6b6a40c6b6c077edfa65fd92beae31f77b7e5bee2b1d5a48
Lire d'abord les règles locales et docs/NORTH_STAR.md du produit.
Développement : commits atomiques poussés directement sur dev, sans PR vers dev.
Exception : seulement si GitHub l’impose techniquement, une PR pour tout le lot.
Livraison : une seule PR dev vers production, réutilisée par application et étape.
Étapes : V1, V2, V3, V4, finale puis confirmation commerciale ; gain client et tests verts, sans attendre la perfection.
Sécurité ou bug client en production : livraison immédiate par la même PR unique, après les contrôles obligatoires.
Décision du 09.11.2026 : les tests terrain se font après livraison ; ils ne bloquent pas V1/V2/V3/V4/finale si le gain client est réel et NEO CI vert sur le SHA exact.
Les anciennes consignes locales exigeant une preuve terrain avant livraison sont remplacées par cette décision ; les autres consignes locales restent applicables.
Avant livraison : sécurité, migrations de données, facturation, paiements et envois à de vrais clients restent contrôlés.
Les preuves terrain restent obligatoires pour 100 % North Star et la confirmation commerciale finale.
Suivre dans docs/PROGRESS.md, section « À prouver sur le terrain » : quoi, par qui, quand. Si seule cette preuve manque, noter, livrer et continuer.
Mesure hebdomadaire des PR par application et de l’occupation réelle des runners, en parallèle sans blocage.
Revue de capacité le 22 novembre 2026 : proposer puis réduire progressivement 10 vers 5, puis ajuster.
Cette décision du 8 novembre remplace toute ancienne consigne de PR vers dev ou de PR de diffusion.
Pas de certification lourde automatique par commit dev ou PR brouillon.
Une version prête : certification complète avant une seule fusion vers main/master.
Autofusion NEO Factory uniquement pour les dépôts éligibles ; NEO Core et les dépôts dédiés listés dans OWNER_AUTOMERGE_DECISION_2026-11-02.md restent hors autofusion jusqu'à décision propriétaire explicite.
Les consignes locales plus strictes restent applicables ; UNKNOWN reste UNKNOWN.
- **ADP-001 PRODUCT_NORTH_STAR** : Chaque produit garde sa North Star, ses données et règles métier ; aucune instruction globale ne peut remplacer cette autorité.
- **ADP-002 VERIFY_CURRENT_CODE** : Avant travail lire les instructions, le HEAD réel, la base et les PR concurrentes ; les souvenirs et descriptions ne prouvent pas le code.
- **ADP-003 FEATURE_BRANCH** : Pousser directement les commits atomiques sur dev, sans PR vers dev. Une PR vers dev uniquement si GitHub l’impose techniquement ; regrouper alors tout le lot. Aucun push direct sur main ou master après bootstrap.
- **ADP-004 NO_MICRO_PR** : Aucune PR de développement par commit ou fonctionnalité. Réutiliser une seule PR de livraison dev vers la branche réelle de production par application et par étape.
- **ADP-005 BATCH_INTEGRATION** : Regrouper les changements compatibles sur dev, conserver provenance et collisions, puis livrer une étape utile V1, V2, V3, V4 ou finale dès qu’elle apporte un vrai gain client et que NEO CI est vert sur la version exacte. Les tests terrain ne bloquent pas ces livraisons ; ils se font après, en production. Les contrôles de sécurité, migrations de données, facturation, paiements et envois à de vrais clients restent obligatoires avant livraison. Sécurité ou bug client en production : livraison immédiate par la même PR unique, après ces contrôles.
- **ADP-006 RISK_TIERED_TESTS** : Exécuter T0/T1 rapides pendant le développement et T2 sur le lot ; aucune CI lourde automatique par commit dev ou PR brouillon ; une PR terminée sort du brouillon pour être testée puis fusionnée ; réserver T3 au candidat figé prêt et T4 à la livraison.
- **ADP-007 FAIL_CLOSED_CI** : BLOCKED, UNKNOWN, neutral, NON_SUPPORTED, workflow manquant ou couverture incomplète ne sont jamais un succès.
- **ADP-008 DEDUPE_BLOCKED** : Ne pas répéter indéfiniment une même panne d'infrastructure avec entrées identiques ; enregistrer empreinte, propriétaire et condition de relance.
- **ADP-009 FAIR_QUEUE** : Protéger les anciennes PR éligibles contre la famine par priorité liée à l'attente persistée et alternance entre produits.
- **ADP-010 REFRESH_ONLY_EVIDENCE** : L'âge d'une PR ne l'invalide pas ; rafraîchir la seule preuve temporaire nécessaire sans refaire la suite inchangée.
- **ADP-011 EXACT_RELEASE_IDENTITY** : Certifier le SHA, l'arbre Git, les workflows applicables et l'artefact immuable de la release candidate finale.
- **ADP-012 REQUIRE_AUTHORITY_GATE** : Les fusions automatiques de NEO Factory s'appliquent uniquement aux dépôts éligibles par décision propriétaire vérifiée. NEO Core et les autres dépôts à traitement dédié listés dans OWNER_AUTOMERGE_DECISION_2026-11-02.md restent hors autofusion jusqu'à décision propriétaire explicite levant leur exception. Pour les dépôts éligibles, aucune confirmation de routine n'est demandée ; toutes les portes de sécurité, chemins sensibles, anti-collision, produit et autorité restent obligatoires.
- **ADP-013 ATOMIC_PROMOTION** : Fusionner la version une seule fois par PR avec expected-head SHA, certification complète préalable et contrôle anti-collision ; promouvoir seulement le digest réellement testé.
- **ADP-014 PROVE_RUNTIME_AND_UX** : Vérifier l'artefact et SHA effectivement servis, santé, parcours métier, UX/accessibilité et restauration sans régression.
- **ADP-015 ISOLATE_SECURITY** : Aucun secret ou donnée client dans les prompts/CI ni accès inter-produit implicite ; respecter scopes, confidentialité et isolation.
- **ADP-016 CONTROL_REAL_COST** : Mesurer chaque semaine les PR ouvertes par application et l’occupation réelle des runners NEO CI, en parallèle sans bloquer développement ou livraison. Au 22 novembre 2026, proposer la capacité à garder puis arrêter progressivement les runners excédentaires (10 vers 5, puis ajuster), sans interrompre les jobs actifs. Coûts réels sourcés, inconnus conservés.
- **ADP-017 EVIDENCE_NOT_CLAIMS** : Séparer code, tests, CI, fusion, runtime et cas réel. Les essais avec de vrais utilisateurs et preuves d’usage réel ne conditionnent pas les livraisons V1, V2, V3, V4 ou finale ; ils restent obligatoires pour déclarer 100 % North Star et pour la confirmation commerciale finale. Inscrire chaque preuve manquante dans docs/PROGRESS.md sous « À prouver sur le terrain » avec quoi, par qui et quand. Si seule une preuve terrain manque, la noter, livrer l’étape et poursuivre ; jamais 100 % sans preuve sur la version livrée. Cette décision du 09.11.2026 remplace les anciennes consignes bloquant une livraison uniquement pour preuve terrain manquante.
- **ADP-018 ROLLOUT_WITHOUT_BIG_BANG** : Diffuser directement sur dev dans AGENTS.md et CLAUDE.md, avec version et empreinte épinglées, en préservant les instructions métier ; aucune PR de diffusion par dépôt. Cette décision remplace les anciennes consignes de PR vers dev.
T0/T1 : rapidité ; T2 : arbre combiné ; T3 : certification exacte ; T4 : version servie.
Si la source/empreinte manque : rester sur branche et bloquer la release non prouvée.
<!-- NEO_AGENT_DELIVERY_POLICY_V1:END -->

## Application du cycle Théo à ce dépôt

Pour le travail courant, la branche d’intégration est `dev`, avec branches courtes depuis son SHA courant. Les mentions historiques de branche fraîche depuis main/master décrivent l’ancien cycle. Les exigences métier, de sécurité, de confidentialité, les validations humaines métier et les preuves de livraison restent applicables. Une PR documentaire de préparation vers `dev` est contrôlée au niveau T0 (contenu, empreinte, diff et identité Git) ; elle ne certifie aucune capacité applicative. La certification complète et le contrôle NEO CI requis s’appliquent au candidat prêt avant sa fusion vers `main`. Aucun résultat absent, neutre ou bloqué ne devient un succès. La production conserve son hébergement et son déployeur canoniques. Lire les consignes dans `dev` à la reprise du développement.

Aucune North Star dédiée n’a été identifiée dans cet instantané : préserver les consignes et le périmètre existants, sans inventer de critères ni annoncer de certification produit.
