# Shelfie

**Film your shelf. Get a store.** A small seller records one walk-through video of their shop, saying prices out loud. Gemini turns it into a product list with prices and Khmer/Sinhala/Tamil/Thai labels. The seller checks it, and gets a shareable store at `shelfie.app/<shop>`. Customers order through WhatsApp or LINE. Shelfie never handles payments.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` | Generate route types + `tsc` |
| `npm run lint` | ESLint |
| `npm run deploy:rules` | Push `firestore.rules` + indexes to Firebase |

### One-time Firebase setup

1. **Authentication → Sign-in method → Google → Enable.**
2. **Firestore Database → Create database** in production mode. A region near our users, e.g. `asia-southeast1` (Singapore).
3. **Deploy the rules:** `npx firebase-tools login`, then `npm run deploy:rules -- --project <project-id>`. Until you do, Firestore denies everything, and creating a store shows a "rules aren't deployed" message.
4. **Authentication → Settings → Authorized domains:** add the deployed domain (localhost is already there).
5. **Gemini:** create a key at <https://aistudio.google.com/apikey> and put it in `GEMINI_API_KEY`.

No service-account key is needed anywhere. See [Security model](#security-model).

## Mock first, real AI later

The whole seller flow (film → check → photos → store) runs today without any AI cost. Each AI or storage piece sits behind one function, so going live means changing one place:

| Piece | Today | Go live by | Where |
| --- | --- | --- | --- |
| Video → products | `SHELFIE_AI=mock`: sample products for the store's language and currency, after a 2s delay | `SHELFIE_AI=gemini` + `GEMINI_API_KEY` | `src/server/extraction/` |
| Default product photo | Frame grabbed from the seller's own video, in the browser (free) | (already real) | `src/features/media/video.ts` |
| "AI photo" | Local canvas "studio shot" of that frame | Call Gemini image editing from `generateProductPhoto()` | `src/features/media/generate.ts` |
| Photo storage | Small WebP stored inline in the product doc (no Firebase Storage or Blaze plan) | Upload with `firebase/storage` in `saveProductImage()` | `src/features/media/storage.ts` |

The review screen shows a **Mock AI** badge when results come from the mock.

## Templates and colors

A store's look is `theme: { template, accent }`:

- **Templates:** `grid` (most shops), `list` (many small items) and `showcase` (a few special items).
- **Accent:** any hex color. `src/lib/palette.ts` derives the button, tint and text shades and keeps text readable (WCAG AA) in light and dark mode.

Review every combination with sample shops in each language at **`/templates`**. Sellers change theirs at `/dashboard/edit`, with a live phone preview.

## How it works

```
Seller (browser)                         Server (Next.js)                     Google
────────────────                         ────────────────                     ──────
Google sign-in ───────────────────────────────────────────────────────────▶ Firebase Auth
Film video ──▶ POST /api/extract ──▶ verify ID token ──▶ video + prompt ──▶ Gemini
           ◀── products JSON ◀────────────────────────────────────────────
Review & edit ──▶ write directly to Firestore (rules check ownership) ───▶ Firestore
              ──▶ refreshStorefront() server action ──▶ expire cache tag

Customer ──▶ /<slug> ──▶ static shell + cached store (firestore/lite, public reads only)
         ──▶ cart ──▶ wa.me / line.me link with the order pre-filled
```

## Project structure

```
src/
  app/                  Routes only: thin files that compose features
    page.tsx            Landing
    templates/          Public template gallery (review every layout × color × language)
    [shop]/page.tsx     Public storefront (partial prerender + per-slug cache)
    (seller)/           Route group: the only place Firebase Auth loads
      login/            Google sign-in
      dashboard/        Overview, capture/ (film → check → photos), edit/ (look + details)
    api/extract/        Video → products (mock or Gemini)
  components/
    ui/                 Design-system primitives (Button, Surface, Stack, Text, Sheet…). No business logic.
    motion/             Reveal / Stagger (CSS entrances) + MotionProvider
    theme/              ThemeScope: re-brands everything inside it from one accent color
    brand/              Logo
  features/             One folder per product area; owns its components + client data hooks
    auth/               AuthProvider, AuthGate, GoogleSignInButton
    seller/             Dashboard, store editor, product editor, Firestore hooks (data.ts)
    capture/            Record/upload → review list → photo step
    media/              Browser-only: video frames, photo compression, AI photos, photo storage
    theme/              ThemePicker (layout + color) and PhonePreview
    storefront/         Public store view in 3 templates, cart, order bar
  domain/               Zod schemas + types (store, product, theme, extraction) + sample shops
  lib/                  Pure helpers (env, format, palette, contact links, site URLs) + Firebase client
  server/               server-only: token verification, extraction providers, cached reads, actions
  styles/               Tokens, mixins, globals
firestore.rules         The real access control
```

**Import rules**

- `app/` imports from `features/`, which import from `components/`, `domain/` and `lib/`. Nothing imports from `app/`.
- `server/*` is `server-only` and `lib/firebase/client.ts` is `client-only`. The build fails if one ends up on the wrong side.
- Feature `index.ts` barrels export **components only**. Client code imports hooks from the file directly (`@/features/seller/data`). Re-exporting hooks would pull client-only code into Server Component pages.

## Data model

```
stores/{slug}                       slug = document id = public URL
  ownerId, name, tagline?, description? (≤500, line breaks kept), logoUrl?,
  currency (USD|KHR|LKR|THB), labelLanguage (en|km|si|ta|th),
  contact { whatsapp?, line? }, theme? { template (grid|list|showcase), accent (#rrggbb) },
  paymentQrUrl?, published, createdAt, updatedAt

stores/{slug}/products/{id}
  name, localName?, price (number | null = "Ask"), category?, inStock,
  imageUrl?, position, createdAt, updatedAt
```

The schemas live in `src/domain/`. If you add a required field, update `validStore` / `validProduct` in `firestore.rules` too. The same goes for `RESERVED_SLUGS` in `src/domain/slug.ts`.

## Security model

- **Firestore rules are the boundary.** Anyone can read a store and its products once `published == true`. Only the owner (`ownerId == auth.uid`) can read drafts or write anything.
- **The server reads as the public.** `server/storefront.ts` uses `firebase/firestore/lite` without credentials, so the rules apply to it too. It cannot leak a draft store even by mistake.
- **API routes and server actions verify the Firebase ID token** (`server/auth.ts`). This only needs the project ID.
- `<AuthGate>` is a UX redirect, not a security check.

## UI conventions

The goal is **less text, more signal**. Color, icons and motion carry the meaning.

- **No borders.** Separate things with surface tint (`--surface-1/2`), spacing and soft shadows (`@include elevation(1–3)`).
- **Tokens only.** Use `var(--brand)`, `var(--space-4)`, `var(--radius-lg)` and so on. Raw hex is reserved for third-party brand colors such as the WhatsApp green. Every module starts with `@use "styles" as *;` to get the mixins and breakpoints.
- **Light and dark** come for free from the tokens. Check both.
- **Mobile first:** `@include up(md) { … }`. Sellers and buyers are mostly on phones.
- **Icons over words** (lucide-react), one short sentence at most in empty states, and visual pickers (`Segmented`) over dropdowns.
- **Motion:** entrances use CSS (`<Reveal>`, `<Stagger>`), so pages work before JavaScript loads on slow phones. `motion/react` is for interaction: layout, presence and gestures. `<ScrollStagger>` reveals long lists as they enter the screen: an IntersectionObserver flips a data attribute, and a short CSS animation always plays to the end, never stuck half-way.
- **Entrance fill mode is `backwards`, never `both`.** A finished `both` animation keeps control of `transform`, which freezes hover lifts and press feedback.
- **60fps rule:** only `transform` and `opacity` may animate.
  - Never transition `box-shadow`, `filter`, sizes or `background-position`.
  - Hover shadows: use `@include lift()` / `shadow-layer()`. The bigger shadow is drawn once and fades in.
  - Rings: draw them on a pseudo-element and fade its opacity.
  - Don't put `backdrop-filter` over moving content.
  - Check in DevTools → Performance: animations should show no per-frame Layout or Paint. The landing page measures about 61 fps with 0 Layout and 0 Paint.
- **Reduced motion is tiered:**
  - Stop large movement and decorative loops.
  - Turn slides into short fades.
  - Keep loaders and feedback.

  Each component handles its own case (`@include reduced-motion`). There's no global kill switch.
- **Animation skills:** the `iart-ai/web-animation-skills` pack (60fps, accessible animation, micro-interactions…) is installed per machine into `.claude/`, which git ignores. Restore it with `npx skills experimental_install`, which reads the tracked `skills-lock.json`.
- **Layout with `<Stack>`/`<Container>`** instead of one-off margins.

## Deploy (Firebase App Hosting, from the console)

App Hosting builds the app from GitHub on every push to `main`. No Firebase keys are needed in the repo or the console: App Hosting injects the web app config at build time, and `next.config.ts` maps it in. Run settings and the AI switch live in `apphosting.yaml`.

1. Push the repo to GitHub.
2. In the Firebase console, open **Build → App Hosting → Get started**. **The Blaze plan is required.** With `minInstances: 0`, idle time costs nothing.
3. Pick the region closest to our users (Asia). Connect GitHub and choose the repo. Use root directory `/`, live branch `main`, and turn on automatic rollouts.
4. **Associate the existing Firebase web app**, the one from `.env.local`. This is what provides the config. Pick Node runtime **nodejs22** or newer.
5. Click **Finish and deploy**. The first rollout takes a few minutes, and the URL looks like `https://<backend>--<project>.<region>.hosted.app`.
6. After the first rollout:
   - Add that domain under **Authentication → Settings → Authorized domains**, or Google sign-in will fail.
   - Set `NEXT_PUBLIC_SITE_URL` to the URL, in `apphosting.yaml` or the backend's Environment settings, and push.
   - Deploy the rules with `npm run deploy:rules -- --project <project-id>`.

**Check before pushing:** `NEXT_PRIVATE_STANDALONE=true npm run build`, then copy `.next/static` into `.next/standalone/.next/` and run `node .next/standalone/server.js`. That's the same server App Hosting runs.

**Known limits:**

- **Next.js 16** isn't on App Hosting's official support list yet (it lists 13.5–15.2). Its adapter accepts any version and our standalone build runs, but if a rollout fails at the build step, check the build log first.
- **Uploads go through Cloud Run, capped at 32 MB.** Mock mode never uploads the video (frames are taken in the browser). Real AI mode accepts videos up to 30 MB. For longer videos, upload straight from the browser to Gemini through a resumable upload URL created by the server.
- **`maxInstances: 1`** keeps the in-memory storefront cache consistent. Add a shared cache (`use cache: remote`) before scaling out.
- **Inline photos** make store pages heavy. A store with 6 photos is about 0.5 MB of HTML. Switch `saveProductImage()` to Firebase Storage before real traffic.

## Notes on this Next.js version (16.4)

- **Cache Components is on.** Anything that reads request data (`params`, `searchParams`, cookies) must sit inside `<Suspense>`. Use `'use cache'` + `cacheTag` for shared data.
- **Error boundaries receive `retry`,** not `reset`.
- The bundled docs in `node_modules/next/dist/docs/` match this exact version. Check them before relying on memory (see `AGENTS.md`).
