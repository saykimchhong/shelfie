<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Shelfie conventions

Read `README.md` first. It covers the structure, import rules, data model, security model and UI conventions. The rules that matter most:

- `src/app/` holds thin routes. Product code lives in `src/features/<area>/`, primitives in `src/components/ui/`, and shared schemas in `src/domain/`.
- `src/server/*` is `server-only`. `src/lib/firebase/client.ts` is `client-only`. Feature barrels export components only.
- Firestore rules are the access control. When a schema in `src/domain/` changes, update `firestore.rules` to match.
- Styles: SCSS modules starting with `@use "styles" as *;`, tokens only, no borders, mobile first. Use CSS for entrance animation and `motion/react` for interaction.
- Motion: animate only `transform`/`opacity` (use the `lift()` / `shadow-layer()` mixins for hover shadows), tier reduced motion per component, and follow `.claude/skills/60fps-animation` and `accessible-animation`.
- Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` before handing work back. Pure logic gets a `*.test.ts` next to it.
