// Google Analytics (gtag.js), added to the <head> of every published page:
// the generator in each language (scripts/build.mjs) and the Markdown pages
// (scripts/content.mjs). Change the measurement ID here only.

export const googleAnalyticsId = "G-Y4395BRBWM";

export const googleAnalyticsTags = [
  `<script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>`,
  `<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${googleAnalyticsId}');</script>`,
];
