# Avatar dans PEP's Solutions

Décision propriétaire du 05.11.2026 : **Avatar est un module de PEP's Solutions**.

| Responsabilité | Autorité |
|---|---|
| Produit, parcours, offre, facturation et support | [O-N-2950/pepssolutions](https://github.com/O-N-2950/pepssolutions) |
| Rendu, animation, synchronisation labiale et SDK | Ce dépôt technique |
| Connexion vocale, lorsqu'elle est activée | PEPSAVA / voice-core, contrat explicite par intégration |
| Doctrine et registre des produits | NEO Core |
| Qualification et livraison | NEO CI / NEO Factory, déployeur du produit concerné |

Le moteur n'a ni compte client, ni tarification, ni abonnement autonome. Il ne
reçoit pas de permission métier du seul fait qu'il anime un assistant.

## Intégration progressive

1. **V1 — moteur fiable** : corriger le SDK et le cycle de connexion. Démo
   technique `avatar-demo` existante ; aucune certification commerciale déduite.
2. **V2 — module PEP's Solutions** : intégrer un artefact SDK versionné et vérifié
   dans un parcours choisi par le produit parent. Le produit conserve session,
   consentement, identité et accessibilité. Prévoir un parcours texte équivalent.
3. **V3 — voix autorisée** : session serveur liée au tenant et à l'agent autorisés,
   permission micro explicite, interruption et fin de session éprouvées. Aucun
   secret durable dans le navigateur. Des paramètres `tenant`/`agent` ne constituent
   jamais une authentification ni un contrôle d'accès.
4. **V4 — réutilisation** : même SDK dans d'autres produits, contrats et scopes
   propres, version épinglée et preuve d'intégration ; pas de copie divergente.
5. **Finale** : benchmarks et tous les critères AVE prouvés, intégration parent
   réellement servie et audit commercial du parent.

## Limites de ce lot

Le transport accepte une URL WebSocket explicitement fournie, conserve ses
paramètres de session et encode les identifiants. La validation du jeton et du
tenant reste une obligation du serveur vocal, pas du moteur graphique.
La démo vocale historique ne vaut pas intégration authentifiée de production.
Ne pas envoyer de données réelles tant que cette preuve manque.

La construction complète reste à rendre reproductible : lockfile manquant,
ancien Dockerfile tolérant des erreurs (`|| true`) et dépendances à qualifier.
Les tests ciblés Node 24 ne prouvent ni le build Docker ni une nouvelle livraison.
