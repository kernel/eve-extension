# eve Extension Package

This package is an eve extension — a reusable package of tools, connections,
skills, hooks, and instruction fragments that a consuming agent mounts under
`agent/extensions/`.

Before writing code, read the Extensions guide from the installed eve package
docs. In most installs, those docs are at `node_modules/eve/docs/extensions.md`.
In workspaces or local package installs, resolve the installed `eve` package
location first and read its `docs/extensions.md`. If package docs are
unavailable, use https://eve.dev/docs/extensions as a fallback.

## Authoring

- Declare the extension in `extension/extension.ts` with `defineExtension` from
  `eve/extension`. Config is optional; read bound values via the handle's
  `.config` in tools and hooks.
- Add contributions under `extension/` the same way as in an agent:
  `tools/`, `connections/`, `skills/`, `hooks/`, and optional instruction
  fragments. Names come from file paths; the mount supplies the namespace, so
  name tools for what they do (`search`, not `crm_search`).
- An extension cannot declare `agent.ts`, `sandbox`, `schedules`, or nested
  `extensions/` — those belong to the consuming agent.

## Build and publish

`eve extension build` (wired to `build`/`prepare`) transforms the complete
agent-shaped source tree into `dist/extension/`, emits type declarations and a
compatibility manifest, and fills the package `exports` map. Ship `dist/` only.
Keep `eve` as a required peer (floored at the minimum version the extension
needs — currently `>=0.25`) so the consumer's eve is the one that runs; eve
validates extension compatibility from the generated manifest.

## Releasing

Releases are automated by `.github/workflows/release.yml`, which fires on any
`v*` tag push and publishes to npm over OIDC trusted publishing (no npm token).

To cut a release:

1. Bump `version` in `package.json` and merge it to `main`.
2. Tag the release commit on `main` and push the tag:

   ```bash
   git tag v0.1.0            # must equal the package.json version, with a leading v
   git push origin v0.1.0
   ```

The workflow then verifies the tag is on `main` and that the tag matches
`package.json` `version`, builds, typechecks, packs, runs an ESM-import smoke
test, and publishes with `npm publish --access public`. It uses Node 24 and
`npm@^11.5.1` (required for trusted publishing). No secrets are involved.

### One-time bootstrap (already done)

OIDC trusted publishing can't perform a package's *first* publish. That was done
once, manually, by a maintainer with `@onkernel` publish rights:

```bash
npm version 0.0.1 --no-git-tag-version
npm publish --access public --tag bootstrap   # creates the package; latest still moves to the first real release
git checkout package.json package-lock.json
```

Then on npmjs.com → the package → **Settings → Trusted Publisher → GitHub
Actions**: organization `kernel`, repository `eve-extension`, workflow
`release.yml`, allowed action `npm publish`. After that, every release is just
the tag push above.
