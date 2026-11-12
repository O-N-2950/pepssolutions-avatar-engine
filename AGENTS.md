<!-- NEO_AGENT_DELIVERY_POLICY_V1:START -->
## NEO Agent Delivery Policy — version épinglée
Repo : O-N-2950/pepssolutions-avatar-engine
Source : O-N-2950/neo-core@6c564f02f3b8ae1cae047653bc77bd6514e71725:knowledge/governance/agent-delivery-policy.v1.json
Version : 1.4.0 | sha256:dbc9a0a0887b4ba6e4725064d3067ebc4c9d42653e6ad8fea9bf094b27d79a0b
Lire d'abord les règles locales et docs/NORTH_STAR.md du produit.
Développement : commits atomiques poussés directement sur dev, sans PR vers dev.
Exception : seulement si GitHub l’impose techniquement, une PR pour tout le lot.
Décision d’Olivier du 12.11.2026, toutes applications : livraison directe en production par l’agent, sans attendre NEO CI, NEO Factory ni GitHub Actions, et sans annonce préalable (ADP-019).
Portes avant mise en ligne, sur le SHA exact poussé sur dev : arbre propre, contrôles et tests complets, scénarios navigateur deux fois verts.
Artefact immuable : manifeste SHA-256 de chaque fichier, vérifié sur le serveur ; canari à côté de la production ; bascule atomique ; version précédente gardée pour le retour arrière.
Après bascule : santé au SHA exact sur le domaine client, parcours réels vérifiés, docs/PROGRESS.md à jour.
Après la mise en ligne, sans bloquer : une seule PR de livraison remet main au SHA servi ; NEO CI est lancé sur ce SHA ; un échec impose correctif ou retour arrière immédiat.
Étapes : V1, V2, V3, V4, finale puis confirmation commerciale ; gain client et tests verts, sans attendre la perfection.
Sécurité ou bug client en production : livraison immédiate par la voie directe, après les contrôles obligatoires.
Les tests terrain se font après livraison ; ils ne bloquent aucune étape si le gain client est réel et les portes locales vertes sur le SHA exact.
Les anciennes consignes locales exigeant une preuve terrain avant livraison sont remplacées par cette décision ; les autres consignes locales restent applicables.
Avant livraison : sécurité, migrations de données (sauvegarde de la base d’abord), facturation, paiements et envois à de vrais clients restent contrôlés.
Les preuves terrain restent obligatoires pour 100 % North Star et la confirmation commerciale finale.
Suivre dans docs/PROGRESS.md, section « À prouver sur le terrain » : quoi, par qui, quand. Si seule cette preuve manque, noter, livrer et continuer.
Mesure hebdomadaire des PR par application et de l’occupation réelle des runners, en parallèle sans blocage.
Revue de capacité le 22 novembre 2026 : proposer puis réduire progressivement 10 vers 5, puis ajuster.
Pas de PR vers dev ni de PR de diffusion ; pas de certification lourde automatique par commit dev.
Procédé exact : knowledge/governance/DIRECT_PRODUCTION_DELIVERY.md dans NEO Core.
Les consignes locales plus strictes restent applicables ; UNKNOWN reste UNKNOWN.
- **ADP-001 PRODUCT_NORTH_STAR** : Chaque produit garde sa North Star, ses données et règles métier ; aucune instruction globale ne peut remplacer cette autorité.
- **ADP-002 VERIFY_CURRENT_CODE** : Avant travail lire les instructions, le HEAD réel, la base et les PR concurrentes ; les souvenirs et descriptions ne prouvent pas le code.
- **ADP-003 FEATURE_BRANCH** : Pousser directement les commits atomiques sur dev, sans PR vers dev. Une PR vers dev uniquement si GitHub l’impose techniquement ; regrouper alors tout le lot. Aucun push direct sur main ou master après bootstrap.
- **ADP-004 NO_MICRO_PR** : Aucune PR de développement par commit ou fonctionnalité. La production est livrée directement depuis dev (ADP-019) ; une seule PR de livraison dev vers la branche réelle de production par application, fusionnée après la mise en ligne, garde main au SHA servi.
- **ADP-005 BATCH_INTEGRATION** : Regrouper les changements compatibles sur dev, conserver provenance et collisions, puis livrer en production dès qu’un lot apporte un vrai gain client et que les portes locales de l’agent sont vertes sur le SHA exact (ADP-019). Les tests terrain ne bloquent pas ces livraisons ; ils se font après, en production. Les contrôles de sécurité, migrations de données (sauvegarde préalable, migrations additives), facturation, paiements et envois à de vrais clients restent obligatoires avant livraison. Sécurité ou bug client en production : livraison immédiate par la voie directe, après ces contrôles.
- **ADP-006 RISK_TIERED_TESTS** : Exécuter T0/T1 rapides pendant le développement et T2 sur le lot, sur la machine de l’agent ; aucune CI lourde automatique par commit dev ; T3 est la qualification locale complète du SHA exact (contrôles, tests, scénarios navigateur deux fois verts) suivie du canari sur le serveur ; T4 la vérification de la version servie. NEO CI s’exécute après la livraison, sans la bloquer.
- **ADP-007 FAIL_CLOSED_CI** : BLOCKED, UNKNOWN, neutral, NON_SUPPORTED, workflow manquant, test ignoré ou couverture incomplète ne sont jamais un succès, ni localement ni dans NEO CI. Un échec de NEO CI après livraison impose un correctif ou un retour arrière immédiat.
- **ADP-008 DEDUPE_BLOCKED** : Ne pas répéter indéfiniment une même panne d'infrastructure avec entrées identiques ; enregistrer empreinte, propriétaire et condition de relance.
- **ADP-009 FAIR_QUEUE** : Protéger les anciennes PR éligibles contre la famine par priorité liée à l'attente persistée et alternance entre produits.
- **ADP-010 REFRESH_ONLY_EVIDENCE** : L'âge d'une PR ne l'invalide pas ; rafraîchir la seule preuve temporaire nécessaire sans refaire la suite inchangée.
- **ADP-011 EXACT_RELEASE_IDENTITY** : Certifier le SHA, l'arbre Git propre et l'artefact immuable livré : manifeste SHA-256 de chaque fichier, empreinte de l’archive, vérification complète sur le serveur avant la bascule.
- **ADP-012 REQUIRE_AUTHORITY_GATE** : Les fusions automatiques de NEO Factory s'appliquent uniquement aux dépôts éligibles par décision propriétaire vérifiée. NEO Core et les autres dépôts à traitement dédié listés dans OWNER_AUTOMERGE_DECISION_2026-11-02.md restent hors autofusion jusqu'à décision propriétaire explicite levant leur exception. Pour les dépôts éligibles, aucune confirmation de routine n'est demandée ; toutes les portes de sécurité, chemins sensibles, anti-collision, produit et autorité restent obligatoires.
- **ADP-013 ATOMIC_PROMOTION** : Promouvoir seulement l’artefact réellement testé : vérifié fichier par fichier sur le serveur, essayé en canari à côté de la production, puis bascule atomique (renommage de dossier ou équivalent) avec la version précédente conservée pour un retour arrière immédiat.
- **ADP-014 PROVE_RUNTIME_AND_UX** : Vérifier sur le domaine client que la santé annonce le SHA exact, puis les parcours métier, l’UX/accessibilité sur téléphone et ordinateur, la console et la restauration ; consigner SHA, heure et preuves dans docs/PROGRESS.md.
- **ADP-015 ISOLATE_SECURITY** : Aucun secret ou donnée client dans les prompts/CI ni accès inter-produit implicite ; respecter scopes, confidentialité et isolation.
- **ADP-016 CONTROL_REAL_COST** : Mesurer chaque semaine les PR ouvertes par application et l’occupation réelle des runners NEO CI, en parallèle sans bloquer développement ou livraison. Au 22 novembre 2026, proposer la capacité à garder puis arrêter progressivement les runners excédentaires (10 vers 5, puis ajuster), sans interrompre les jobs actifs. Coûts réels sourcés, inconnus conservés.
- **ADP-017 EVIDENCE_NOT_CLAIMS** : Séparer code, tests, CI, fusion, runtime et cas réel. Les essais avec de vrais utilisateurs et preuves d’usage réel ne conditionnent pas les livraisons V1, V2, V3, V4 ou finale ; ils restent obligatoires pour déclarer 100 % North Star et pour la confirmation commerciale finale. Inscrire chaque preuve manquante dans docs/PROGRESS.md sous « À prouver sur le terrain » avec quoi, par qui et quand. Si seule une preuve terrain manque, la noter, livrer l’étape et poursuivre ; jamais 100 % sans preuve sur la version livrée. Cette décision du 09.11.2026 remplace les anciennes consignes bloquant une livraison uniquement pour preuve terrain manquante.
- **ADP-018 ROLLOUT_WITHOUT_BIG_BANG** : Diffuser directement sur dev dans AGENTS.md et CLAUDE.md, avec version et empreinte épinglées, en préservant les instructions métier ; aucune PR de diffusion par dépôt. Cette décision remplace les anciennes consignes de PR vers dev.
- **ADP-019 DIRECT_PRODUCTION_DELIVERY** : Décision d’Olivier du 12.11.2026, pour toutes les applications : l’agent livre lui-même en production, sans attendre NEO CI, NEO Factory ni GitHub Actions et sans annonce préalable. Portes obligatoires sur le SHA exact poussé sur dev : arbre propre, contrôles et tests complets, scénarios navigateur deux fois verts, artefact immuable vérifié sur le serveur, canari à côté de la production, bascule atomique, santé au SHA exact sur le domaine client, retour arrière prêt. Après la mise en ligne : PR de livraison fusionnée pour remettre main au SHA servi, NEO CI lancé sur ce SHA, PROGRESS à jour. Procédé : knowledge/governance/DIRECT_PRODUCTION_DELIVERY.md.
T0/T1 : rapidité ; T2 : arbre combiné ; T3 : qualification locale du SHA exact et canari ; T4 : version servie.
Si la source/empreinte manque : rester sur dev et ne pas livrer.
<!-- NEO_AGENT_DELIVERY_POLICY_V1:END -->

## Application du cycle Théo à ce dépôt

Pour le travail courant, pousser les commits atomiques directement sur `dev`. Les exigences métier, de sécurité, de confidentialité, les validations humaines métier et les preuves de livraison restent applicables. Les contrôles complets et deux passes navigateur qualifient localement le SHA exact avant sa livraison directe ; NEO CI s'exécute après la mise en ligne sur le SHA servi. La PR unique dev → main remet ensuite main au SHA livré. Aucun résultat absent, neutre ou bloqué ne devient un succès. La production conserve son hébergement et son déployeur canoniques. Lire les consignes dans `dev` à la reprise du développement.

Aucune North Star dédiée n’a été identifiée dans cet instantané : préserver les consignes et le périmètre existants, sans inventer de critères ni annoncer de certification produit.

## Décision locale du 12.11.2026 — progression et autorité

« On progresse toujours, on ne régresse jamais. » Préserver les acquis métier,
les données, la sécurité et les parcours existants ; toute régression observée
doit être corrigée ou faire l'objet d'un retour arrière immédiat.
L'accord explicite d'Olivier reste requis avant une livraison touchant la
sécurité, les paiements ou la facturation, les données ou des envois à de vrais
clients. Les autres livraisons suivent ADP-019 sans annonce préalable.
