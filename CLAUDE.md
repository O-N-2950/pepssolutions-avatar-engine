# Instructions agent


## Tests : NEO CI

- Le check de référence est « **NEO CI / tests** » (application GitHub `neo-ci-2950`), lu sur le SHA exact du dernier commit de la PR.
- GitHub Actions est en pause (facturation bloquée) : un échec Actions « startup_failure / No jobs were run » n'est pas un échec de code.
- Un résultat NEO CI `BLOCKED` ou `neutral` signifie une couverture incomplète, jamais un succès.
- Ne pas modifier les workflows pour contourner NEO CI. S'il est absent, demander son exécution au projet NEO Factory au lieu de fusionner.
- Règle canonique : [neo-core — NEO_CI_TESTS_REPLACES_GITHUB_ACTIONS.md](https://github.com/O-N-2950/neo-core/blob/main/knowledge/governance/NEO_CI_TESTS_REPLACES_GITHUB_ACTIONS.md)
