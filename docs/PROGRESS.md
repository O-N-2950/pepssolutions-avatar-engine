# 12.11.2026 — ADP-019 et préparation de livraison directe
- Utilitaire de scellement : **29 tests de contrat réussis** sur la version commune réellement exécutée et relue ; empreinte `artifact.py` `d6600e3862db736820c6c38f9ebd6d472ec503443f8ee95771c1864376d8235f`. Chaque copie installée est comparée à cette empreinte. Ces tests ne sont ni des tests navigateur ni une preuve de réception du paquet de cette application.


## Fait et vérifié à 06:12 Europe/Zurich

- Politique NEO 1.4.0 de `neo-core@ec369ea` : bloc exact dans AGENTS/CLAUDE,
  source `6c564f02f3b8ae1cae047653bc77bd6514e71725`, empreinte
  `dbc9a0a0887b4ba6e4725064d3067ebc4c9d42653e6ad8fea9bf094b27d79a0b`, lock aligné.
- Règle d'Olivier enregistrée : « On progresse toujours, on ne régresse jamais. »
  Les règles métier et les accords préalables pour les changements sensibles
  restent applicables. NEO CI/PR passent après la mise en ligne qualifiée.
- SHA de base inspecté : `a6db03ee85bbc45e7e0bbcf699269fa2ff6b0bdd`.
  Les contrôles ci-dessous portent sur le snapshot local modifié, pas sur une
  version déjà poussée ou installée ; les empreintes de code sont conservées.
- Préparé : serveur statique Node sans dépendance avec `/health` JSON au SHA
  complet ; HTTP 503 si identité inconnue/contradictoire ou build absent ;
  healthcheck Railway `/health`, lock npm, build Docker sans erreur masquée.
- Compatibilité TypeScript/ES2020 réparée sans changement d'interface : exports
  de types, typage des tableaux audio, recherche des transcriptions partielles
  sans `findLastIndex`, suppression d'une comparaison d'état impossible.
- Exécuté : `npm ci --prefix packages/demo-app --ignore-scripts` PASS,
  typecheck PASS, **11/11 tests PASS**, build Vite PASS (41 modules).
  Le premier typecheck avait été tué (137) ; le passage borné a révélé les erreurs
  corrigées, puis le contrôle final a terminé avec le code 0.
- Audit production : **0 vulnérabilité**, code 0. Audit complet : **ÉCHEC**,
  1 avis élevé et 1 modéré dans Vite 5 / esbuild (outils de construction),
  correction proposée par npm vers Vite 8 nécessitant une migration majeure.
  Aucun avis ni contrôle n'a été supprimé ; `.neo/ci.yml` conserve l'audit complet.
- Documentation : [cible, commandes et retour arrière](deployment/DIRECT_DELIVERY.md).

## Production et blocages réels

**AUCUNE LIVRAISON EFFECTUÉE. SHA servi : UNKNOWN. Heure de bascule : aucune.**

Railway confirmé : projet `pepssolutions-digital`, service `avatar-demo`, source
`O-N-2950/pepssolutions-avatar-engine`, branche **main**. Aucun push vers dev ne
déclenche ce service ; aucun réglage distant modifié. Déploiement observé :
`95566436-f07c-4450-b165-759b499fe122`. Seul domaine technique :
`avatar-demo-production.up.railway.app`, aucun domaine client configuré.
Lecture réelle `/health` à **06:09:11 Europe/Zurich** : HTTP 200 **HTML** de la
SPA, sans SHA ; ce résultat n'est pas une santé conforme.

| Blocage | Responsable | Condition et échéance de reprise |
| --- | --- | --- |
| Chromium ne démarre pas : `socket() failed: Operation not permitted`, SIGABRT | Exécution agent / infrastructure navigateur | Fournir un environnement navigateur fonctionnel ; avant toute livraison, exécuter deux passes vertes sur le candidat exact et conserver captures/console |
| Domaine client absent, canari absent (seul environnement production listé) | Exploitation Railway / propriétaire PEP’s Solutions | Déclarer domaine et canari isolé ; avant réception du candidat |
| Audit complet élevé sur la chaîne Vite/esbuild | Responsable Avatar | Migrer/qualifier les outils de construction et refaire l'audit complet avant de déclarer tous les contrôles verts |
| Transport, vérification serveur, canari et bascule non exécutés | Agent de livraison / exploitation | Terminer l'adaptation Railway du paquet et lire tous les reçus, avant bascule |
| Retour arrière au SHA exact non éprouvé | Agent de livraison / exploitation | Confirmer le déploiement précédent disponible, sa santé et son identité ; avant bascule |

Deux passes navigateur : **NON EXÉCUTÉES**, aucune capture du candidat. Tests
HTTP et build ne les remplacent pas. Aucun paquet envoyé, aucune migration ou
sauvegarde distante, aucun canari ou retour arrière exécuté. Pas de PR de
resynchronisation main ni de NEO CI après livraison, puisqu'aucune livraison
n'a eu lieu. Main et production sont conservés.

## À prouver sur le terrain

| Quoi | Par qui | Quand |
| --- | --- | --- |
| Lisibilité, réglages avatar et navigation sur téléphone et ordinateur réels | Responsable PEP’s Solutions et utilisateurs pilotes | Après livraison de l'étape qualifiée ; avant confirmation commerciale |
| Voix, autorisation micro, arrêt/reprise et rendu des transcriptions sur appareils réels, avec données de test autorisées | Responsable Avatar / pilote métier | Après canari conforme et livraison autorisée ; avant annonce de qualité de service |
| Intégration effective sous PEP’s Solutions et statut de North Star dédiée | Responsable produit | Avant déclaration 100 % ou commercialisation finale |

---

## Historique (les anciennes règles d'ordre de livraison sont remplacées par ADP-019)

## 2026-11-09 — Livraison progressive et preuves terrain

- Fait : décision d’Olivier du 09.11.2026 diffusée dans les instructions épinglées NEO Core 1.3.0.
- Règle : livrer une étape utile V1/V2/V3/V4/finale après NEO CI vert sur le SHA exact et contrôles applicables ; les seuls essais terrain manquants ne bloquent plus la livraison.
- Contrôles maintenus avant livraison : sécurité, migrations, facturation, paiements et envois à de vrais clients. Aucun échec technique ni contrôle sensible manquant n’est reclassé en preuve terrain.
- Prouvé : présence du bloc et du pin contrôlée lors de la diffusion ; cela ne prouve ni la réception par les agents ni une nouvelle version en production.
- Propriétaire : responsable du produit et NEO Factory. Prochaine action : distinguer les blocages techniques des essais terrain, puis livrer le prochain candidat utile certifié.

### À prouver sur le terrain

| Quoi | Par qui | Quand |
| --- | --- | --- |
| Inventorier les essais avec utilisateurs et preuves d’usage réel restant à réaliser pour cette application, sans les déclarer acquis | Responsable du produit | Après livraison de l’étape concernée ; avant toute déclaration 100 % North Star ou confirmation commerciale finale |

