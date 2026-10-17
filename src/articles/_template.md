---
title: Article title, as people would search for it
description: One or two sentences (about 150 characters) shown in Google and in the list of guides.
date: 2026-01-31
translationKey: short-english-key-shared-by-all-translations
draft: true
---

<!--
How to add an article:
1. Copy this file into src/articles/<language>/ (en, fr, de…), e.g. src/articles/fr/mon-article.md.
   The file name becomes the address: /fr/articles/mon-article/ — lowercase, words joined by "-".
2. Fill in the front matter above. Remove "draft: true" when the article is ready.
   Translations of the same article share the same translationKey.
3. Write in Markdown below. Links and images starting with "/" point to the site root:
   [the generator](/) · [le générateur](/fr/) · ![Alt text](/assets/images/articles/example.png)
   Put images in src/assets/images/articles/.
4. npm run dev, check http://localhost:8080/articles/ (or /fr/articles/), then commit and push.
Files starting with "_" (like this one) are never published.
-->

Introduction: answer the question in the first two sentences.

## A section title

Text, **bold**, [a link](/), lists:

- First point
- Second point

| Column | Column |
| --- | --- |
| Cell | Cell |

> A highlighted tip.
