---
title: How big should a printed QR code be?
description: The size, distance and margin rules that keep a printed QR code easy to scan, with a quick reference table.
date: 2026-10-18
---

A QR code that is too small, too dense or printed without margins is the most common reason a scan fails. The good news: three simple rules cover almost every case.

## The 10:1 rule

As a rule of thumb, **the scanning distance should be at most ten times the width of the QR code**. Divide the distance at which people will scan by 10 to get the minimum width.

| Scanning distance | Minimum QR code width |
| --- | --- |
| 25 cm (business card, label) | 2.5 cm |
| 50 cm (table tent, menu) | 5 cm |
| 1 m (counter, shop window) | 10 cm |
| 2 m (poster) | 20 cm |
| 5 m (banner) | 50 cm |

For anything held in the hand, do not go below **2 × 2 cm**: smaller codes are hard to frame with a phone camera.

## Shorter content, bigger squares

A QR code grows in density, not in size, when you add content: a long address produces more, smaller squares. At the same printed size, a short link scans more easily and from further away. When you can, use a short address and remove tracking parameters you do not need.

## Keep the white margin

Scanners need a light, empty border around the code to find it. The QR code standard asks for a margin of **four squares** on every side. Do not crop it, and do not place text or images right against the code.

QR codes created with [TabQR](/) already include this margin.

## Contrast and colors

- Use a **dark code on a light background**. Many apps read inverted codes, but not all of them.
- Keep a strong contrast: black, navy or dark green on white works; yellow or light gray does not.
- Avoid printing on glossy or curved surfaces that reflect light onto the code.

## Choose the right file

- **SVG** for print: it stays sharp at any size, from a business card to a banner.
- **PNG** for screens and documents: TabQR exports it at 1080 × 1080 px, enough for most uses.

## Test before you print

> Print one copy at the final size and scan it with two or three different phones, from the real distance and under the real lighting.

It takes one minute and avoids reprinting a whole batch.

[Create your QR code with TabQR](/), free and right in your browser.
