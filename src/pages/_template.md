---
title: Page title
description: One or two sentences (about 150 characters) shown in Google.
updated: 2026-01-31
draft: true
---

<!--
How to add a page (legal notice, terms, about…):
1. Create a folder in src/pages/ named after the page, e.g. src/pages/legal-notice/
   (lowercase, words joined by "-"). This name is the default address: /legal-notice/, /fr/legal-notice/.
2. Copy this file into it once per language, named after the language: en.md, fr.md…
   All files of the folder are translations of the same page.
3. Fill in the front matter. "slug: mentions-legales" gives a language its own address,
   "path: legal/fr/" sets a full address. "updated" is shown as "Last updated", "note" as a
   small text at the bottom (Markdown links allowed), "redirectFrom: old/address/" forwards an
   old address to this page. Remove "draft: true" when ready.
4. Write in Markdown below. Links starting with "/" point to the site root: [le générateur](/fr/).
5. npm run dev, check the page, then commit and push.
Files and folders starting with "_" (like this one) are never published.
-->

Introduction.

## A section title

Text, **bold**, [a link](/), lists:

- First point
- Second point
