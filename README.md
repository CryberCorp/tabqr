# TabQR — site web

Ce dépôt contient le site statique public de TabQR : le générateur QR web et les pages de confidentialité. Il ne contient pas le code source de l’extension Chrome, qui est géré séparément.

## Pages publiées

- Application web : <https://crybercorp.github.io/tabqr/>
- Politique de confidentialité en anglais : <https://crybercorp.github.io/tabqr/privacy-policy/>
- Politique de confidentialité en français : <https://crybercorp.github.io/tabqr/privacy-policy/fr/>

L’URL anglaise de la politique est actuellement enregistrée dans le Chrome Web Store. **Ne pas déplacer ni renommer `privacy-policy/`** avant d’avoir mis à jour cette URL dans la fiche de l’extension.

## Structure du dépôt

```text
index.html                      Application web et navigation
app.css                         Styles et mise en page responsive
app.js                          Génération QR, contrôles et traductions EN/FR
assets/
  chrome-web-store.svg          Icône du futur lien vers la fiche Chrome Web Store
  fonts/Doto-Black.ttf          Police des titres TabQR
  scripts/qrcode-generator.js   Générateur QR embarqué localement
  tabqr-icon.svg                Logo TabQR
privacy-policy/
  index.html                    Politique anglaise (URL principale)
  fr/index.html                 Politique française
  en/index.html                 Ancien chemin anglais, conservé comme redirection
.nojekyll                       Publie les fichiers statiques sans traitement Jekyll
```

Le site est autonome : il n’a pas d’étape de compilation ni de dépendance à installer. Le générateur QR et les ressources nécessaires sont servis depuis ce dépôt ; le contenu saisi est traité dans le navigateur.

## Modifier et prévisualiser

1. Modifier le fichier concerné. Les textes EN/FR de l’application se trouvent dans les dictionnaires au début de `app.js`. La phrase d’introduction lie automatiquement certains mots courts à ceux qui suivent pour éviter qu’ils restent seuls en fin de ligne ; `text-wrap: pretty` améliore aussi la composition selon la largeur disponible.
2. Prévisualiser le site à la racine du dépôt avec un serveur statique (par exemple l’extension **Live Server** de VS Code, ou `python -m http.server 8000`).
3. Vérifier les deux langues, la génération du QR, le collage/copiage, les exports PNG/WebP/JPEG/SVG et l’affichage mobile. Pour PC et tablette, vérifier notamment que la composition reste centrée et tient sans défilement aux tailles d’écran usuelles.
4. Exécuter `node --check app.js`, puis `git diff --check`.
5. Vérifier `git status` et ne sélectionner que les fichiers prévus pour la modification.

Si le CSS ou le JavaScript reste en cache après une modification, augmenter le numéro de version dans les URL de ressources de `index.html` (par exemple passer `app.css?v=7` à `app.css?v=8`) afin de forcer le navigateur à récupérer le nouveau fichier.

## Publier sur GitHub Pages

GitHub Pages est configuré pour publier la branche `main` depuis la racine de ce dépôt. Un push accepté sur `main` lance la publication ; aucune commande de build locale ou action manuelle de déploiement n’est requise.

```powershell
git status
git add index.html app.css app.js README.md
git diff --cached --check
git commit -m "Describe the site update"
git push origin main
```

Adapter la liste de `git add` aux seuls fichiers modifiés et voulus : éviter `git add .` si d’autres changements locaux sont présents. Après le push, vérifier l’état du déploiement dans **GitHub → CryberCorp/tabqr → Settings → Pages** ou dans la section des déploiements du dépôt, puis ouvrir les URL publiées et contrôler les ressources principales. Un changement de contenu peut mettre un court délai à apparaître dans le navigateur à cause du cache.

La source Pages doit rester `main` et `/` (racine). Ne pas basculer ce dépôt en privé : le site Pages public et la fiche du Chrome Web Store en dépendent.

## Fiche Chrome Web Store

Le pied de page contient :

- un lien vers la politique de confidentialité de l’extension ;
- une icône Chrome Web Store et une mention « Coming soon / Bientôt », sans lien inactif.

Quand la fiche de l’extension sera publiée, remplacer le bloc `.store-placeholder` dans `index.html` par un lien `<a>` vers son URL officielle. Garder ce lien distinct du lien de confidentialité.

## Dépôt de l’extension

Le code de l’extension et sa publication dans le Chrome Web Store suivent leur propre cycle dans un dépôt séparé. Ne pas copier ici les sources privées de l’extension, ses clés, jetons ou fichiers de publication. Les changements du site n’impliquent pas une nouvelle version de l’extension ; inversement, une mise à jour de l’extension ne déplace pas automatiquement les pages de confidentialité.
