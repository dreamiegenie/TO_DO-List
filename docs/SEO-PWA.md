# My To-Dos ♡ — SEO, installation, and offline use

Production homepage: **https://dreamie-todos.vercel.app/**

## What changed

- Quick Note uses React state and saves each change to `localStorage.quickNote`. Existing plain-text and JSON-string notes are read without rewriting them on startup.
- Clicking a task's text opens a small inline editor. Save or Enter applies the edit; Cancel or Escape keeps the original text. Task dates, categories, completion state, and other saved fields are retained.
- The page has a descriptive title, description, canonical URL, Open Graph and Twitter/X cards, a public sitemap, and permissive crawling metadata.
- The existing sleeping cat supplies the favicon, Apple touch icon, install icons, and social preview. The five existing font families are self-hosted so the same fonts work offline.
- A production service worker caches the app, fonts, artwork, and install icons. After the first successful online visit and cache installation, the app can reload offline. Tasks, categories, notes, theme controls, and the open-page Focus Timer work without a connection.
- Updates show **Reload app** and **Later**. They do not force another open tab to reload. An accepted update temporarily checkpoints this tab's unsaved task/category drafts, search/view, and running timer in session storage, restores them after reload, and consumes the checkpoint once. Saved tasks and notes remain in local storage.

The original layout, custom SVG controls, colours, and font families are preserved. The viewport still allows pinch zoom. Quick Note and the new edit input use a 16px font on mobile.

## Install and use offline

1. Open the production homepage online and allow the initial cache to finish. The app reports **Ready to use offline ♡**.
2. On Android, use the browser's **Install app** or **Add to Home screen** option when offered.
3. On iPhone/iPad, open the site in Safari, choose **Share → Add to Home Screen**, and enable **Open as Web App** if Safari offers that option.
4. Open the app again without a connection. Edits save locally; removing a task moves it to Deleted Tasks, where it can be restored.

An uncached first visit still needs an internet connection. The timer runs while the application is open; mobile operating systems may pause an app in the background. Browser tabs and an installed iOS app may have separate storage depending on the platform, so check existing data before changing how you open the app. Installation and updates never intentionally clear local storage.

## Vercel

The requested short domain already responds at `dreamie-todos.vercel.app`. No domain removal or redirect is included in this change.

If the project is connected to GitHub, deploy the updated `main` branch. Otherwise import or redeploy this repository in Vercel with:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 24.x |

`vercel.json` makes the HTML, manifest, and service-worker entry revalidate and serves the manifest with the correct content type. No environment variables or server database are needed. Check the deployed homepage, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/sw.js`, and `/social-preview.png` after deployment. The service worker is enabled in production builds, not the development server.

For a future domain change, add the new domain in **Project → Settings → Domains**, verify its HTTPS homepage and all assets first, and only then consider redirects. Update the canonical URL, social metadata, structured data, robots sitemap URL, and sitemap together. Local storage belongs to an origin; changing domains does not transfer tasks or notes automatically.

## Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) and add a **URL-prefix** property for `https://dreamie-todos.vercel.app/`.
2. Choose the HTML tag or HTML file verification method. Google supplies a token/file unique to your account. For a tag, add it inside the `<head>` in `index.html`; for a file, place the exact downloaded file in `public/`.
3. Deploy that verification change, then return to Search Console and select **Verify**. Keep the verification tag/file in future deployments.
4. Under **Sitemaps**, submit `sitemap.xml`.
5. Inspect `https://dreamie-todos.vercel.app/`, run **Test live URL**, and request indexing.

The page allows indexing, but Google decides whether and when to index it. Your private tasks and notes stay in the browser; they are not included in the sitemap or sharing preview.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/Widgets.jsx` | Controlled, persistent Quick Note |
| `src/App.jsx`, `src/TaskSection.jsx` | Inline task editing and PWA status integration |
| `src/PWAStatus.jsx`, `src/updateSession.js`, `src/SideBar.jsx`, `src/FocusTimer.jsx` | Offline/update notices and safe restoration across accepted updates |
| `index.html` | SEO, social cards, favicon/touch icon links, theme colour |
| `public/favicon.svg`, `public/icons/`, `public/social-preview.svg`, `public/social-preview.png` | Existing cat artwork adapted for branding |
| `public/robots.txt`, `public/sitemap.xml` | Public crawler and sitemap files |
| `src/fonts.css`, `src/index.css`, `public/fonts/` | Existing fonts available offline, with source and license notices |
| `src/useTheme.js` | Browser theme colour follows light/dark mode |
| `vite.config.js`, `package.json`, `package-lock.json`, `vercel.json` | Manifest, service worker, dependency, and deployment headers |

## Verification

Production builds and ESLint pass. Chromium and WebKit checks cover cached reloads, offline task add/edit/complete/delete/restore, note persistence, existing task metadata and unrelated local storage, all five font families, artwork, icons, and manifest/SEO output. Chromium reports no manifest or installability errors.

Light and dark layouts were checked at 320, 375, 390, 430, 1024, and 1440px without horizontal overflow. Both browser engines also passed two-tab update tests, including unsaved drafts, typing during activation, timer progress, and avoiding forced reloads in the other tab.

WebKit's automated offline switch produced a browser-internal navigation error. A separate test stopped the origin server: cached pages loaded through the service worker, uncached requests failed, and the complete offline suite passed. These are automated browser tests; physical Android/iOS installation and iOS airplane-mode testing still need a device check.

## Useful references

- [PWA update prompts](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html)
- [Vite projects on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Search Console verification](https://support.google.com/webmasters/answer/9008080)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Add a website to the iPhone Home Screen](https://support.apple.com/en-mide/guide/iphone/iphea86e5236/27/ios/27)
