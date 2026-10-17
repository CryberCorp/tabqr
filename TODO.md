# À faire

- [ ] **Avant le prochain push : passer la publication GitHub Pages sur GitHub Actions**
  (**GitHub → CryberCorp/tabqr → Settings → Pages → Source : GitHub Actions**).
  Le site est désormais généré dans `dist/` par le workflow ; sans ce réglage, la page publiée serait vide.
- [ ] **Ajouter le lien du Chrome Web Store** dès que l’extension est publiée :
  renseigner `chromeWebStoreUrl` dans `scripts/build.mjs` (`https://chromewebstore.google.com/detail/…`), puis publier.
  Le bouton **Installer l’extension** (en-tête, ordinateur avec Chrome, Edge ou Brave) et le lien du pied de page apparaîtront alors.
- [ ] **Déclarer le sitemap dans Google Search Console** une fois le site en ligne : menu **Sitemaps** → `sitemap.xml`.
