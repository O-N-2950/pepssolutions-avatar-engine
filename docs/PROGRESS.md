# Avatar — progression technique

Produit propriétaire : PEP's Solutions. Référence : [INTEGRATION.md](INTEGRATION.md).
North Star propre : [NORTH_STAR.md](NORTH_STAR.md), AVE-001 à AVE-008 conservés.

## Lot du 05.11.2026

- Corrige l'encodage des paramètres vocaux, conserve les paramètres de session,
  refuse les URL avec identifiants intégrés et évite les sockets dupliquées.
- Libère le minuteur de keepalive et les pistes micro si une autorisation arrive
  après déconnexion. Choisit une taille de buffer ScriptProcessor autorisée.
- Préserve les autres couleurs/caractéristiques et les presets lors d'une
  modification partielle de l'avatar.
- Tests ciblés Node 24 : 6/6 passent avant soumission. Preuve locale seulement.
- Démo Railway observée le 05.11 : `avatar-demo`, dernier déploiement SUCCESS
  `95566436-f07c-4450-b165-759b499fe122`, source
  `8ce6ccb7a4c91ebfd243cdd218e42266e6d6d827` du 23.10. Ce déploiement antérieur
  ne contient pas les corrections du présent lot.

## Prochaines actions et limites

| Action | Propriétaire | Condition de clôture |
|---|---|---|
| Certification exacte du lot | Avatar / NEO CI | Checks applicables sur SHA final |
| Lockfile, build et audit des dépendances | Avatar | Installation figée, build complet et audit réussis |
| Interface et intégration utilisateur | PEP's Solutions | SDK versionné intégré, parcours texte et visuel vérifiés |
| Authentification et isolation voix | PEPSAVA / produit parent | Contrat serveur, refus inter-tenant et consentement prouvés |
| Mesures labiales, fluidité et appareils | Avatar | Benchmark reproductible et traces |

**0/8 critères AVE certifiés en production.** Le code, les tests ciblés, la fusion,
la publication de l'artefact et l'intégration réellement servie restent distincts.
