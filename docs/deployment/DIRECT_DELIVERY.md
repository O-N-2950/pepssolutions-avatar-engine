# Livraison directe — Avatar PEP’s Solutions

## Autorité et cible vérifiées le 12.11.2026

Appliquer [ADP-019 et son procédé](https://github.com/O-N-2950/neo-core/blob/ec369ea/knowledge/governance/DIRECT_PRODUCTION_DELIVERY.md).
Les contrôles locaux complets précèdent la livraison ; la PR dev → main et NEO CI
suivent la mise en ligne sur le SHA exact. Aucun test absent n'est un succès.

| Élément | Preuve vérifiée |
| --- | --- |
| Dépôt | `O-N-2950/pepssolutions-avatar-engine` |
| Hébergeur réel | Railway, projet `pepssolutions-digital` |
| Projet | `9a671a50-f05c-453b-a889-d794925dbd25` |
| Environnement | `production` — `0dfd6c49-419f-4173-8ede-27bbc363383a` |
| Service | `avatar-demo` — `6994ebfe-4100-4da7-956a-f9c511d99b38` |
| Région | `europe-west4-drams3a` |
| Source automatique | dépôt ci-dessus, branche **main** ; aucun push dev ne déclenche ce service |
| Déploiement avant ce lot | `95566436-f07c-4450-b165-759b499fe122`, état Railway SUCCESS, créé le 23.10.2026 |
| Domaine technique | `https://avatar-demo-production.up.railway.app` |
| Domaine client | **NON CONFIGURÉ** selon `list_domains` ; ne pas assimiler le domaine Railway à une preuve client |
| Canari | **ABSENT** : `list_services` ne liste que production dans ce projet |
| Santé en place | `/health` répond HTML de la SPA, HTTP 200, sans SHA (lecture du 12.11 à 06:09:11 Europe/Zurich) |
| SHA effectivement servi | **UNKNOWN**, le contrôle de santé actuel ne permet pas de le prouver |
| Base/migration de ce lot | Aucune migration prévue ; aucun accès à des données clients demandé |

Les identifiants proviennent des lectures Railway MCP `describe_service`,
`describe_environment`, `list_domains` et `list_services`. Aucun réglage distant
n'a été modifié dans ce lot. `railway.json` prépare `/health` pour la prochaine
version qualifiée ; le service actuellement installé n'a pas de healthcheck
configuré. Le projet nommé `pepsava-engine` héberge des services `star-mix` :
il ne constitue pas une cible Avatar. Aucun rattachement à `pepssolutions-prod`
sur Jelastic n'a été prouvé.

## Runtime préparé

`scripts/serve.mjs` sert la démo compilée sans dépendance Node supplémentaire.
`GET /health` répond JSON, sans cache, avec `sha` et la variable source :
`RAILWAY_GIT_COMMIT_SHA` pour un déploiement GitHub, sinon `GIT_SHA`.
La valeur doit être un SHA complet de 40 caractères hexadécimaux. Une valeur
absente, invalide, contradictoire entre les deux variables, ou un `index.html`
absent produit HTTP 503. Un HTTP 200 HTML ne vaut jamais contrôle de santé.

Le Dockerfile construit la démo depuis le lockfile, sans erreur masquée par
`|| true`. Vite résout les bibliothèques directement depuis leurs sources via
les alias existants. Le runtime utilise `scripts/serve.mjs` avec les fichiers
de `packages/demo-app/dist`, sous l'utilisateur `node`. Les routes SPA restent
servies ; les ressources manquantes et les chemins sortant du paquet sont refusés.

## Commandes de qualification locale

Depuis le SHA exact de `dev`, arbre propre et synchronisé avec `origin/dev` :

```sh
npm ci --prefix packages/demo-app --ignore-scripts
npm run typecheck
npm test
npm run build
npm audit --prefix packages/demo-app --audit-level=high
npm audit --prefix packages/demo-app --omit=dev --audit-level=high
```

Les scénarios navigateur doivent couvrir les avatars, les réglages et la vue
voix sur ordinateur et téléphone, deux fois sur la même version. La voix réelle
utilise un service extérieur ; effectuer les scénarios canari avec un service
de test isolé et sans transmission de données réelles. Un écran statique ou les
tests HTTP ne remplacent pas ces scénarios. L'échec Chromium constaté dans cette
session interdit la livraison ; il ne doit pas être reclassé en preuve terrain.

## Paquet scellé, réception et canari

Le paquet doit contenir le runtime et les fichiers de démo compilés du SHA
qualifié ; le manifeste SHA-256 couvre chaque fichier. L'archive et le manifeste
reçoivent chacun une empreinte. Conserver les reçus hors du dépôt, sans secret.
Les utilitaires sous `scripts/deliver/` constituent la préparation locale :
ils ne sont pas la preuve d'un envoi ou d'une installation.

Avant toute commande de transport, configurer un environnement Railway séparé
`canary` ou `staging`, avec son service Avatar lié au même dépôt et sans la base
de production, Stripe live, envoi réel ni accès vocal client. Ajouter un domaine
client à la cible de production. Faire parvenir le paquet exact à la cible,
vérifier les empreintes côté serveur, puis démarrer le canari et vérifier son
`/health` au SHA exact ainsi que les parcours. Cette réception n'a pas été
effectuée ; ne pas lancer la bascule tant que ces éléments manquent.

Si le transport passe par `railway up`, partir du SHA exact propre et enregistrer
son identifiant de déploiement. Un déploiement GitHub lit
`RAILWAY_GIT_COMMIT_SHA` ; un envoi CLI doit recevoir `GIT_SHA` à la même valeur.
Un jeton ne peut être présent que dans l'environnement de la session, jamais
dans les commandes enregistrées, les fichiers, la conversation ou les journaux.

## Bascule et retour arrière

1. Avant livraison, relever à nouveau l'identifiant courant et sa capacité de
   redéploiement ; l'identifiant ci-dessus est une observation datée, pas un gel.
2. Garder le build précédent. Configurer `healthcheckPath: /health` sur la cible.
3. Déployer uniquement l'artefact qualifié et attendre la santé avant le routage.
4. Lire `/health` sur le **domaine client**, vérifier le SHA exact, puis les
   parcours ordinateur/téléphone et la console. Enregistrer heure et reçus.
5. En cas d'échec, utiliser Railway MCP `redeploy` avec l'identifiant précédent,
   puis vérifier de nouveau le domaine client et le SHA. Ce retour arrière
   n'est pas déclaré éprouvé tant que la version précédente ne fournit pas
   elle-même une preuve SHA fiable.
6. Après succès seulement, réutiliser la PR dev → main et lancer NEO CI sur le
   SHA servi. Un échec entraîne correctif ou retour arrière immédiat.

L'accord d'Olivier reste requis avant livraison d'un changement de sécurité,
paiement/facturation, données ou envois réels. Sauvegarder toute base avant une
migration future ; migrations additives et rejouables uniquement. Ce lot n'a
effectué ni sauvegarde distante, ni canari, ni bascule, ni retour arrière.

## Commandes de scellage local

```sh
python scripts/deliver/package_avatar.py --repo . --output /tmp/avatar-release.tar.gz
python scripts/deliver/artifact.py verify --archive /tmp/avatar-release.tar.gz --expected-sha <SHA_GIT_40> --archive-sha256 <EMPREINTE_ARCHIVE_64> --manifest-sha256 <EMPREINTE_MANIFESTE_64>
```

Remplacer les paramètres par les reçus réels ; le vérificateur refuse les valeurs
absentes/incohérentes. Le wrapper requiert `dev` propre et synchronisée avec
`origin/dev`. Le paquet local n'est pas encore un déploiement complet : les
scripts de transport, de réception, de canari, de bascule et de retour arrière
restent à adapter à la cible et à exécuter. Aucun de ces pas n'est revendiqué.
