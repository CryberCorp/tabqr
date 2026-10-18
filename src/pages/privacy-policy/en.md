---
title: Privacy Policy
description: Privacy policy for TabQR, a Chrome extension for generating QR codes.
path: privacy-policy/
redirectFrom: privacy-policy/en/
updated: 2026-10-16
note: This policy applies to the TabQR Chrome extension. This page is hosted by GitHub Pages; see [GitHub’s privacy statement](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) for information about data processed when visiting the site.
---

TabQR is a Chrome extension that creates QR codes from a web address or text provided by the user. This policy explains what information the extension uses and how it is handled.

## Information handled by the extension

- **Active tab URL:** when you open TabQR, the extension reads the active tab’s URL so it can generate a QR code. It does not scan page content. Text from a page is handled only if you select it and explicitly ask TabQR to create a QR code from it.
- **Text you provide:** text entered in TabQR, or text you select and send to TabQR through the context menu, is used to create the QR code. This text may contain an email address, phone number, or any other information you choose to encode.
- **Preferences:** the QR code color, background color, and selected export format are stored locally in your browser.

## Processing and storage

QR code generation and customization happen locally in your browser. TabQR does not send this information to the developer, and the extension does not use analytics or advertising.

If you use the context menu, the selected text is temporarily stored in the extension’s local storage so it can be passed to the extension window. It is removed as soon as that window retrieves it. If the window cannot open, the text may remain in this storage until it is retrieved the next time or the extension data is cleared.

When you open the enlarged preview, the text, color, and background color are placed in the address of the extension’s internal page so the preview can be restored after a refresh. Your browser may retain this address in its local history. Color and format preferences remain stored locally until they are cleared or the extension is uninstalled.

## Actions you choose

If you choose to copy the content, TabQR places it on your device’s clipboard. If you download a QR code, the file is created on demand in your browser. In the enlarged preview, clicking a link, email address, or phone number may open the corresponding website or application; subsequent handling is governed by the service or application you choose.

## Sharing and transmission

The extension does not transmit QR code content, the tab URL, or selected text to a server or third party. The developer does not collect data through the extension.

## Contact

For questions about this policy or TabQR, contact the publisher through the [CryberCorp GitHub profile](https://github.com/CryberCorp).
