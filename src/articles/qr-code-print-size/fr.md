---
title: Quelle taille pour imprimer un QR code ?
description: Les règles de taille, de distance et de marge qui gardent un QR code imprimé facile à scanner, avec un tableau de référence.
date: 2026-10-18
slug: taille-impression-qr-code
---

Un QR code trop petit, trop dense ou imprimé sans marge est la première cause d’échec au scan. Bonne nouvelle : trois règles simples couvrent presque tous les cas.

## La règle du 10 pour 1

En pratique, **la distance de scan ne doit pas dépasser dix fois la largeur du QR code**. Divisez la distance à laquelle les gens scanneront par 10 pour obtenir la largeur minimale.

| Distance de scan | Largeur minimale du QR code |
| --- | --- |
| 25 cm (carte de visite, étiquette) | 2,5 cm |
| 50 cm (chevalet de table, menu) | 5 cm |
| 1 m (comptoir, vitrine) | 10 cm |
| 2 m (affiche) | 20 cm |
| 5 m (banderole) | 50 cm |

Pour tout ce qui se tient en main, ne descendez pas sous **2 × 2 cm** : un code plus petit est difficile à cadrer avec l’appareil photo d’un téléphone.

## Moins de contenu, des carrés plus gros

Un QR code gagne en densité, pas en taille, quand on ajoute du contenu : une adresse longue produit des carrés plus nombreux et plus petits. À taille imprimée égale, un lien court se scanne plus facilement et de plus loin. Dès que possible, utilisez une adresse courte et retirez les paramètres de suivi inutiles.

## Gardez la marge blanche

Les lecteurs ont besoin d’une bordure claire et vide autour du code pour le repérer. La norme des QR codes demande une marge de **quatre carrés** de chaque côté. Ne la coupez pas, et ne collez pas de texte ou d’image contre le code.

Les QR codes créés avec [TabQR](/fr/) incluent déjà cette marge.

## Contraste et couleurs

- Utilisez un **code foncé sur fond clair**. Beaucoup d’applications lisent les codes inversés, mais pas toutes.
- Gardez un contraste fort : noir, bleu marine ou vert foncé sur blanc fonctionnent ; jaune ou gris clair, non.
- Évitez les supports brillants ou courbés qui renvoient la lumière sur le code.

## Choisissez le bon fichier

- **SVG** pour l’impression : il reste net à toutes les tailles, de la carte de visite à la banderole.
- **PNG** pour les écrans et les documents : TabQR l’exporte en 1080 × 1080 px, suffisant pour la plupart des usages.

## Testez avant d’imprimer

> Imprimez un exemplaire à la taille finale et scannez-le avec deux ou trois téléphones différents, à la vraie distance et sous le vrai éclairage.

Cela prend une minute et évite de réimprimer tout un lot.

[Créez votre QR code avec TabQR](/fr/), gratuitement et directement dans votre navigateur.
