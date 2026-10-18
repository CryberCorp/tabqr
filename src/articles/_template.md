---
title: Article title, as people would search for it
description: One or two sentences (about 150 characters) shown in Google and in the list of guides.
date: 2026-01-31
draft: true
---

<!--
How to add a guide:
1. Create a folder in src/articles/ named after the guide, e.g. src/articles/qr-code-colors/
   (lowercase, words joined by "-"). This name is the address: /articles/qr-code-colors/.
2. Copy this file into it once per language, named after the language: en.md, fr.md, de.md…
   All files of the folder are translations of the same guide (language buttons, hreflang).
3. Fill in the front matter above. Add "slug: couleurs-qr-code" to give a language its own
   address (/fr/articles/couleurs-qr-code/). Remove "draft: true" when the guide is ready.
4. Write in Markdown below. Links and images starting with "/" point to the site root:
   [the generator](/) · [le générateur](/fr/) · ![Alt text](/assets/images/articles/example.png)
   Put images in src/assets/images/articles/.
5. npm run dev, check http://localhost:8080/articles/ (or /fr/articles/), then commit and push.
Files and folders starting with "_" (like this one) are never published.
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
