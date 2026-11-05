# Avatar — composant de PEP's Solutions

Moteur technique réutilisable de rendu, animation, synchronisation labiale et
connexion vocale. Le produit, son interface, sa feuille de route et sa
commercialisation appartiennent à [PEP's Solutions](https://github.com/O-N-2950/pepssolutions).

- [Rattachement et intégrations V1 → finale](docs/INTEGRATION.md)
- [North Star technique](docs/NORTH_STAR.md)
- [Progression et preuves](docs/PROGRESS.md)

Composants : `@peps/avatar-engine`, `@peps/avatar-sdk`,
`@peps/voice-avatar-bridge` et `packages/demo-app`.

Tests comportementaux ciblés, Node 24 : `node --test test/*.test.cjs`.
Le workflow `.neo/ci.yml` est destiné à NEO CI. Il ne remplace pas la
qualification de construction et de production encore manquante.

