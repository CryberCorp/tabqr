# TabQR — site web

Site statique public de TabQR : le générateur de QR codes (33 langues, installable comme application, utilisable hors ligne) et les pages de confidentialité de l’extension Chrome. Le code de l’extension est dans un dépôt séparé.

Les tâches en attente sont dans [TODO.md](TODO.md).

## Organisation

```text
src/                          Sources du site : tout ce qui se modifie
  index.html                  Modèle de toutes les pages de langue
  assets/
    css/app.css               Styles et mise en page responsive du générateur
    css/page.css              Styles des pages annexes (politiques), avec leur pied de page
    js/app.js                 Génération QR, contrôles, préférences, installation de l’app
    js/language.js            Choix de la langue (chargé dans <head>, avant l’affichage)
    js/translations.js        Textes des 33 langues + règles typographiques (source : le site publie
                              un petit fichier par langue, assets/js/i18n/<langue>.js)
    js/vendor/                Bibliothèque QR tierce, embarquée telle quelle
    fonts/  icons/  images/   Police, icônes de l’app installée, logos
  articles/                   Guides en Markdown : articles/<langue>/<adresse>.md (+ _template.md)
  pages/                      Pages en Markdown (politique de confidentialité…) : pages/<langue>/<nom>.md (+ _template.md)
  privacy-policy/en/, fr/     Anciennes adresses de la politique, conservées comme redirections
  manifest.webmanifest        Description de l’application installable (PWA)
  sw.js                       Service worker (hors ligne) ; sa liste de fichiers est générée
  google96bb0ab2759d810e.html Vérification Google Search Console : ne pas supprimer ni renommer
scripts/
  build.mjs                   Génère le site publié : src/ → dist/
  content.mjs                 Transforme les guides et les pages Markdown en pages HTML (appelé par build.mjs)
  serve.mjs                   Aperçu local de dist/
  watch.mjs                   Régénère dist/ à chaque modification de src/
.github/workflows/deploy.yml  Génère et publie le site à chaque push sur main
.vscode/settings.json         Live Server sert dist/ (et non le modèle de src/)
dist/                         Site généré : jamais versionné, jamais modifié à la main
package.json                  Commandes npm et unique dépendance : marked (lecture du Markdown)
```

Prérequis : Node.js 20 ou plus récent. Une fois après chaque clonage du dépôt : `npm install`.

## Commandes

```powershell
npm run dev      # aperçu sur http://localhost:8080/, régénéré à chaque modification de src/
npm run watch    # régénère dist/ à chaque modification de src/ (à utiliser avec Live Server)
npm run build    # génère dist/ une fois
npm run serve    # sert le dernier dist/ généré
```

**Toujours prévisualiser `dist/`, jamais `src/index.html`** : ce fichier n’est que le modèle, sans la liste des langues ni les balises SEO. Avec l’extension VS Code **Live Server**, le réglage du projet (`.vscode/settings.json`) sert déjà `dist/` : lancer `npm run watch` dans un terminal, puis **Go Live**.

`npm run build` produit dans `dist/` :

- une page par langue à partir de `src/index.html` et `src/assets/js/translations.js` : anglais à la racine, puis `fr/`, `de/`, `ja/`, `pt-br/`… ;
- `sitemap.xml` ;
- `sw.js` avec la liste des fichiers hors ligne et une version de cache calculée sur leur contenu ;
- les `?v=` des fichiers CSS et JS, calculés eux aussi sur leur contenu : les navigateurs ne gardent jamais une ancienne version ;
- une copie de tous les autres fichiers de `src/`.

## Modifier le site

1. Modifier les sources dans `src/` :
   - mise en page ou nouveaux éléments : `src/index.html` (les textes visibles portent un attribut `data-i18n="clé"`) ;
   - textes : `src/assets/js/translations.js`, une entrée par langue ; une clé absente d’une langue s’affiche en anglais ;
   - styles et comportement : `src/assets/css/app.css`, `src/assets/js/app.js`.
2. `npm run dev`, puis vérifier dans le navigateur : la page anglaise et quelques langues (dont l’arabe, écrit de droite à gauche), la génération du QR, le copier/coller, les exports PNG/WebP/JPEG/SVG, l’affichage mobile.
3. `git diff --check`, `git status`, commit, push : le site se publie seul (voir plus bas).

### Ajouter un guide (article)

1. Copier `src/articles/_template.md` dans `src/articles/<langue>/` (`en`, `fr`, `de`…). Le nom du fichier devient l’adresse : `src/articles/fr/mon-guide.md` → `/fr/articles/mon-guide/` (minuscules, mots séparés par des tirets).
2. Remplir l’en-tête :
   - `title` et `description` (environ 150 caractères, affichée dans Google et dans la liste des guides) ;
   - `date` (et plus tard `updated`) au format `AAAA-MM-JJ` ;
   - `translationKey` : la même clé pour toutes les traductions d’un même guide, qui sont alors reliées entre elles (boutons de langue, `hreflang`) ;
   - `draft: true` tant que le guide n’est pas prêt (il n’est pas publié).
3. Écrire en Markdown : titres `##` et `###`, listes, **gras**, liens, tableaux, citations `>`, images. Les liens et images qui commencent par `/` partent de la racine du site : `[le générateur](/fr/)`, `![Texte](/assets/images/articles/photo.png)` (images dans `src/assets/images/articles/`).
4. `npm run dev` et vérifier `/articles/` ou `/fr/articles/`, puis commit et push.

Tout le reste est automatique : page du guide (fil d’Ariane, date, temps de lecture, données structurées `Article`), liste des guides de la langue, sitemap, et lien **Guides** du menu « Plus » (vers les guides de la langue de la page, sinon vers les guides anglais). Les textes de l’interface des guides sont dans `translations.js` (clés `guides…`, `readingTime`, `createQr`…), déjà traduits dans les 33 langues.

### Ajouter ou modifier une page (politique, mentions légales…)

Même principe que les guides, dans `src/pages/<langue>/` (modèle : `src/pages/_template.md`) :

- `title` et `description` ; `updated` (affichée « Dernière mise à jour ») ; `note` (petit texte en bas de page, liens Markdown acceptés) ; `translationKey` pour relier les traductions ; `draft: true` pour ne pas publier.
- Adresse par défaut : `/<langue>/<nom>/` (`/<nom>/` en anglais). Pour garder une adresse précise, ajouter `path` : c’est le cas de la politique anglaise (`path: privacy-policy/`), dont l’adresse est enregistrée dans le Chrome Web Store. La version française suit l’adresse par défaut : `/fr/privacy-policy/`.
- Pour modifier la politique de confidentialité : éditer `src/pages/en/privacy-policy.md` et `src/pages/fr/privacy-policy.md`, et mettre à jour `updated` dans les deux.

Deux fichiers qui produiraient la même adresse arrêtent la génération avec un message clair.

### Ajouter ou retirer une langue

1. Ajouter (ou retirer) son entrée dans `src/assets/js/translations.js`, avec son code (`it`, `pt-BR`…) et toutes les clés de `en`.
2. Pour une langue écrite de droite à gauche, vérifier qu’elle figure dans `rtlLanguages` (`scripts/build.mjs`).
3. Pour la typographie, ajouter si besoin ses mots courts dans `shortWords` (`translations.js`).
4. `npm run dev`.

Le menu des langues du pied de page, les balises `hreflang` et le sitemap se mettent à jour seuls.

## Langues et référencement (SEO)

- **Une adresse par langue**, avec un contenu entièrement traduit (titre, description, textes, libellés d’accessibilité) : Google indexe chaque version séparément, sans les considérer comme des doublons.
- **Canonical vers soi-même** sur chaque page, et **`hreflang` réciproques** vers les 33 langues plus `x-default` (la page anglaise), dans le `<head>` et dans `sitemap.xml`.
- **Liens de langue explorables** : le menu des langues du pied de page est fait de vrais liens `<a hreflang>`, que les visiteurs comme les moteurs de recherche peuvent suivre. Le choix d’un visiteur y est mémorisé.
- **Pas de redirection selon la langue supposée** (règle Google pour les sites multilingues) : la racine ne redirige que si le visiteur a lui-même choisi une langue. Sinon, un bandeau rédigé dans la langue de son navigateur lui propose sa version. Les pages de langue ne redirigent jamais.
- **Plans du site** : `sitemap.xml` (pour les moteurs de recherche, avec la date `lastmod` des guides et des pages) et une page **Plan du site** lisible dans chaque langue (`/sitemap/`, `/fr/sitemap/`…), accessible depuis le menu « Plus ». Les deux sont régénérés à chaque publication.
- **Open Graph** (partage sur les réseaux sociaux) et **données structurées** `WebApplication` sur chaque page.

### Google Search Console

- Propriété de type « préfixe d’URL » (`https://crybercorp.github.io/tabqr/`), vérifiée par le fichier `src/google96bb0ab2759d810e.html`. Une propriété « domaine » demande l’accès DNS du domaine, impossible sur `github.io` ; elle deviendra possible avec un nom de domaine personnalisé.
- Le sitemap se déclare dans **Sitemaps** : `sitemap.xml`. Il ne peut pas être annoncé par un `robots.txt`, qui devrait se trouver à la racine du domaine `crybercorp.github.io`, hors de ce dépôt.

## Application installable et hors ligne (PWA)

- Le bouton **Installer l’app** de l’en-tête choisit la meilleure méthode :
  - navigateurs avec invite d’installation native (Chrome, Edge, Samsung Internet, Opera, Brave… sur Android et ordinateur) : l’invite s’ouvre directement, en un clic ;
  - ailleurs (iPhone et iPad, où Apple ne fournit aucune API d’installation, quel que soit le navigateur ; Safari sur Mac ; Firefox) : une fenêtre explique les étapes. L’appareil est détecté automatiquement, et des onglets (iPhone · iPad, Android, Mac, Windows · Linux · ChromeOS) permettent d’en choisir un autre ;
  - navigateurs intégrés aux applications (Instagram, Facebook, TikTok…), qui ne peuvent pas installer : la fenêtre demande d’ouvrir la page dans le vrai navigateur ;
  - application déjà installée : le bouton est masqué.
- Les étapes affichées sont dans `translations.js` (clés `install…`). Les libellés des menus des navigateurs y sont traduits au plus près ; à revoir si un navigateur les renomme.
- Après la première visite, toutes les pages et ressources fonctionnent sans connexion. Chaque génération change la version du cache si un fichier a changé ; les visiteurs reçoivent la mise à jour à leur visite suivante.
- Les icônes PNG de `src/assets/icons/` reprennent `src/assets/images/tabqr-icon.svg`. Si le logo change, les régénérer aux mêmes tailles (192, 512, 512 « maskable » avec marge, 180 pour iOS).

## Performances et cache

- GitHub Pages fixe la durée de cache des fichiers à 10 minutes, sans réglage possible. PageSpeed le signale (« durées de mise en cache efficaces », non noté) : c’est une limite de l’hébergement, pas du site.
- Les visites suivantes ne dépendent pas de ce cache : les `?v=` changent dès qu’un fichier change, et le service worker sert les fichiers depuis l’appareil.
- Chaque page ne charge que les traductions de sa langue (environ 5 Kio compressés au lieu de 42 pour les 33 langues).
- Pour des durées de cache longues, il faudrait un hébergement qui permet de régler les en-têtes HTTP (par exemple Cloudflare Pages, gratuit).

## Publier sur GitHub Pages

Le workflow `.github/workflows/deploy.yml` génère `dist/` et le publie sur GitHub Pages à chaque push sur `main` (ou à la demande depuis l’onglet **Actions**). Réglage GitHub requis : **Settings → Pages → Source : GitHub Actions** (déjà fait). Les fichiers générés ne sont jamais commités : la racine du dépôt ne contient que les sources.

```powershell
npm run dev          # vérifier en local
git status
git add <fichiers modifiés dans src/, scripts/…>
git diff --cached --check
git commit -m "Describe the site update"
git push origin main
```

Suivre la publication dans l’onglet **Actions** du dépôt, puis ouvrir les URL publiées. Ne pas basculer le dépôt en privé : le site public et la fiche du Chrome Web Store en dépendent.

Adresses publiées :

- Application : <https://crybercorp.github.io/tabqr/> (anglais), `…/fr/`, `…/de/`, etc.
- Sitemap : <https://crybercorp.github.io/tabqr/sitemap.xml>
- Politique de confidentialité : <https://crybercorp.github.io/tabqr/privacy-policy/> (anglais) et <https://crybercorp.github.io/tabqr/fr/privacy-policy/> (français)

L’URL anglaise de la politique est enregistrée dans le Chrome Web Store. **Ne pas modifier le champ `path` de `src/pages/en/privacy-policy.md`** avant d’avoir mis à jour cette URL dans la fiche de l’extension.

## Fiche Chrome Web Store

Fiche publiée : <https://chromewebstore.google.com/detail/dgdhlgaeapcpdpjjaalelakkoclmapoj>. Son adresse se renseigne à un seul endroit : `chromeWebStoreUrl` en haut de `scripts/build.mjs`. Tant qu’elle est vide, le bouton de l’en-tête et le lien du pied de page restent masqués. Une fois l’adresse saisie et le site publié, le lien du pied de page apparaît dans toutes les langues, et le bouton **Installer l’extension** apparaît à côté de **Installer l’app**, uniquement sur ordinateur avec Google Chrome, Microsoft Edge ou Brave : ces navigateurs installent les extensions du Chrome Web Store en un ou deux clics. Opera (module supplémentaire requis), Safari, Firefox et les mobiles ne le voient pas.

## Dépôt de l’extension

Le code de l’extension et sa publication dans le Chrome Web Store suivent leur propre cycle dans un dépôt séparé. Ne pas copier ici ses sources privées, clés, jetons ou fichiers de publication.
