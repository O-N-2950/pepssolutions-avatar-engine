# Paquet local scellé — préparation de livraison directe

Ces scripts construisent et vérifient un artefact local. Ils n'envoient rien, ne
déploient rien, ne font aucune extraction et n'interviennent pas sur une base de
données. La qualification complète du candidat, le transport via le connecteur,
le canari isolé, la bascule et le retour arrière restent des étapes distinctes.

## Exécution dans ce dépôt

`artifact.py` et `test_artifact.py` sont installés dans ce répertoire. Python 3.10 ou ultérieur et Git sur Linux/POSIX sont nécessaires, sans dépendance Python externe. Voir la cible et les limites dans `docs/deployment/DIRECT_DELIVERY.md`.

Lancer les tests depuis la racine :

```bash
python -m unittest discover -s scripts/deliver -p 'test_*.py' -v
```

Les tests utilisent de vrais dépôts Git temporaires et des remotes bare locaux.
Aucun appel réseau, compte cloud ni service de production n'est nécessaire.

## Conditions de scellage

L'opérateur doit d'abord récupérer l'état distant avec `git fetch origin dev` et
qualifier la tête exacte. Le script vérifie la branche `dev`, le SHA complet de
HEAD, un arbre Git propre, et l'égalité avec la référence locale `origin/dev`.
Il répète les contrôles après la construction. Il n'exécute pas de fetch et ne
prétend donc pas prouver à lui seul que la référence distante n'a pas avancé.
Les marqueurs Git `assume-unchanged` et `skip-worktree`, qui peuvent masquer une
modification, bloquent le scellage ; les objets Git de remplacement sont ignorés.

Les fichiers ignorés par Git ne rendent pas l'arbre sale ; cela permet le build
de `dist`. Leur contenu doit être celui du build qualifié. Le manifeste atteste
les octets effectivement empaquetés, pas la reproductibilité d'un build depuis
le code source.

Le dossier de staging doit contenir uniquement une liste explicite de fichiers
nécessaires à l'exécution. Ne jamais utiliser la racine du dépôt comme staging.
Les sorties de commandes ne sont pas des preuves si la commande n'a pas été
réellement exécutée et lue par l'opérateur.

## Préparation Avatar

```bash
python scripts/deliver/package_avatar.py --repo . --output /tmp/release.tar.gz
```

Le wrapper utilise une liste explicite de fichiers et conserve l’identité Git relevée avant préparation. Il ne réalise ni envoi ni déploiement. Les contrôles applicatifs et leurs sorties doivent être exécutés et lus séparément.

Pour un staging manuel, faire valider leur liste de fichiers de runtime et la
copier dans un staging privé hors dépôt ; ne pas déduire cette liste de tous les
fichiers présents. Puis appeler :

```bash
python scripts/deliver/artifact.py seal --repo . --source /tmp/release-staging --output /tmp/release.tar.gz
```

La destination doit être hors du dépôt et hors du staging, dans un dossier déjà
existant. Un fichier existant n'est jamais écrasé. Une construction échouée retire
l'archive partielle qu'elle a créée.

## Contrat de l'archive et vérification

L'archive gzip/USTAR est déterministe pour les mêmes fichiers, modes exécutables
et identité Git, avec le même runtime Python/zlib. Les dates, identités système
et noms gzip ne varient pas. Elle ajoute :

- `RELEASE_SHA` : SHA Git complet, suivi d'un saut de ligne.
- `RELEASE.json` : version du schéma, branche, SHA source et SHA de l'arbre Git.
- `MANIFEST.sha256` : chaque fichier, y compris les deux métadonnées, sauf le
  manifeste lui-même dont l'empreinte est retournée séparément.

La sortie JSON comporte `sha`, `tree`, `archive_sha256`, `manifest_sha256`,
`file_count` (métadonnées incluses, manifeste exclu) et `payload_file_count`.
Conserver les empreintes attendues par un canal de confiance distinct de
l'archive ; un hash fourni seulement par une archive non fiable ne prouve rien.

```bash
python scripts/deliver/artifact.py verify \
  --archive /tmp/release.tar.gz \
  --expected-sha <SHA_COMPLET_ATTENDU> \
  --archive-sha256 <SHA256_ARCHIVE_ATTENDU> \
  --manifest-sha256 <SHA256_MANIFESTE_ATTENDU>
```

La vérification lit le même descripteur pour l'empreinte et le contenu, vérifie
que le fichier n'a pas été remplacé/modifié, refuse les doublons, liens et chemins
dangereux, vérifie l'exhaustivité du manifeste et l'identité de release. Elle
n'extrait jamais l'archive et n'exécute aucun fichier. Le code de sortie zéro
atteste seulement la vérification de l'artefact, pas un déploiement ni un test UX.

## Limites explicites

- Fichiers réguliers seulement ; pas de liens symboliques ni d'entrées TAR de
  liens, appareils, répertoires, PAX ou GNU. Les dossiers nécessaires découlent
  des chemins des fichiers réguliers.
- Chemins UTF-8 relatifs, au plus 255 octets et représentables en USTAR. Aucun
  `..`, chemin absolu, séparateur inverse, caractère de contrôle ou deux-points.
- Au plus 10 000 fichiers, métadonnées incluses ; 64 Mio par fichier ; 256 Mio de
  contenu total ; 512 Mio d'archive compressée ; manifeste limité à 4 Mio. Les
  fichiers sont lus par morceaux d'au plus 1 Mio.
- Refus des noms sensibles (`.git`, `.env*`, `.npmrc`, credentials, clés privées,
  etc.), des marqueurs de clés privées et de formats reconnaissables de jetons.
  Ce filtre ne garantit pas l'absence de tout secret arbitraire : revue de la
  liste de runtime et contrôle des fichiers restent obligatoires.
- Ni sauvegarde, ni migration, ni canari, ni envoi, ni bascule, ni rollback ne sont
  implémentés ici. Ils doivent être adaptés à l'hébergement réellement observé,
  exécutés via les accès autorisés et prouvés avant toute affirmation de livraison.
