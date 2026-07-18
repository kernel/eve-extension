# @onkernel/eve-extension

A [Vercel eve](https://vercel.com/eve) extension that gives an agent a [Kernel](https://www.kernel.sh) cloud browser. Mount it and Kernel's browser toolset — session management, Playwright execution, human-like computer controls — plus a `browse` skill show up under your mount (e.g. `kernel__browser__manage_browsers`). No browser tool code to write or maintain.

The tools aren't reimplemented here. The extension packages a single MCP connection to **[Kernel's hosted MCP server](https://github.com/onkernel/kernel-mcp-server)**; eve discovers the tools at runtime.

Authenticate through **[Vercel Connect](https://vercel.com/connect)** (no API key, per-user consent — the recommended setup below) or a **static Kernel API key** ([bottom section](#authenticate-with-an-api-key-instead)).

## Setup

Authenticate through Vercel Connect — no key touches your app, env, or the model, and each user authenticates as themselves (one-time consent, cached after). *Prefer a single shared key with no connector setup? Jump to [Authenticate with an API key](#authenticate-with-an-api-key-instead).*

**1. Install** the extension and `@vercel/connect`:

```bash
npm install @onkernel/eve-extension @vercel/connect
```

**2. Create and attach the Kernel connector** in Vercel Connect — name it `eve-extension` so the snippet below works unedited:

```bash
vercel connect create mcp.onkernel.com --name eve-extension
vercel connect attach mcp.onkernel.com/eve-extension
```

(or add it from the dashboard → Connectors → "Browse all" → Kernel). Confirm the UID with `vercel connect list`.

**3. Mount the extension** as a **directory** and override its connection to use Connect. The connection file must be named `browser.ts` to shadow the extension's own `browser` connection (eve keys connections by basename):

```ts
// agent/extensions/kernel/extension.ts
export { default } from "@onkernel/eve-extension";
```

```ts
// agent/extensions/kernel/connections/browser.ts
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description: "Kernel cloud browser.",
  auth: connect("mcp.onkernel.com/eve-extension"), // user principal — interactive consent
  tools: { allow: ["manage_browsers", "execute_playwright_code", "computer_action", "browser_curl", "manage_auth_connections", "manage_credentials"] },
});
```

**4. Run it:**

```bash
npx eve dev     # or: npx eve deploy
```

Leave `KERNEL_API_KEY` unset. The first time a user drives the browser, eve surfaces a Connect consent prompt; they approve once, and it's cached from then on (persists across threads and sessions).

> Use the **string form** (`connect("…")`) — it's a `user` principal, the interactive path that drives consent. Don't use `principalType: "app"` unless the connector is pre-installed with a standing app-level grant; app mode is non-interactive and fails terminally (`app_not_installed`) with no consent step.

## What you get

Once mounted, the agent has (namespaced under your mount, e.g. `kernel__browser__*` — discover exact names via `connection_search`):

- **`manage_browsers`** — create, list, get, delete browser sessions. Returns a `session_id` and a `live_view_url` you can watch or take over.
- **`execute_playwright_code`** — run Playwright against the live page to read, navigate, click, or type.
- **`computer_action`** — human-like mouse, keyboard, and screenshot controls for the same session.
- **`browser_curl`** — send HTTP requests through the browser session's network stack.
- **`manage_auth_connections`** + **`manage_credentials`** — Kernel's managed auth, so the agent logs into sites through a stored connection or a hosted login flow instead of typing credentials into the page.
- the **`browse`** skill — the loop the model follows to drive the browser end-to-end.

The `browse` skill runs autonomously but is human-in-the-loop friendly: it surfaces the live-view URL for take-over, hands off for sign-ins / ambiguous choices / sensitive actions, and defaults to Kernel managed auth for authenticated sites.

## Auth models

| Model | How | Consent behavior |
| --- | --- | --- |
| **Per-user via Vercel Connect** (recommended — the setup above; each person authenticates as themselves, pairs with Kernel's per-user managed auth) | `connect("mcp.onkernel.com/<name>")` | Each user consents **once, ever**; the grant persists across threads/sessions. No key in your app or env. |
| **Shared API key** ([bottom section](#authenticate-with-an-api-key-instead)) | Static `KERNEL_API_KEY` | One key for everyone, no prompts, no connector setup. |
| **Shared via Connect** (no per-user prompt, no key) | App principal — `connect({ connector, principalType: "app" })` | Only works when the connector is **pre-installed with a standing app-level grant**; otherwise fails terminally (`app_not_installed`). |

## Overriding the connection

Mounting as a directory (as in Setup) also lets you customize what the extension ships — widen the tool allowlist, or add an approval gate before irreversible actions. Keep the connection file named `browser.ts` to shadow the extension's connection:

```ts
// agent/extensions/kernel/connections/browser.ts
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";
import { once } from "eve/tools/approval";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description: "Kernel cloud browser.",
  auth: connect("mcp.onkernel.com/eve-extension"),
  tools: {
    allow: [
      "manage_browsers",
      "execute_playwright_code",
      "computer_action",
      "browser_curl",
      "manage_auth_connections",
      "manage_credentials",
      "manage_profiles", // e.g. add profiles/proxies as your agent needs them
      "manage_proxies",
    ],
  },
  approval: once(), // ask once per session before the agent controls the browser
});
```

## Prerequisites

- **Node 24+**
- **eve `>= 0.25`** in the consuming agent — extensions need it. Older eve silently ignores `agent/extensions/` (you'll see a "discover/unsupported-directory" warning and nothing mounts). The extension keeps `eve` as a wildcard peer, so the consumer's installed eve is the one that runs.
- A **Kernel account** — a Vercel Connect Kernel connector (above) or a Kernel API key (below).
- **`@vercel/connect` `>= 0.4.0`** for the Connect path (provides the `@vercel/connect/eve` `connect()` helper).

## Authenticate with an API key instead

The simplest path — one shared credential, no connector setup. Good for a single-tenant or personal agent.

**1. Install** the extension:

```bash
npm install @onkernel/eve-extension
```

**2. Get a Kernel API key** at [dashboard.onkernel.com/api-keys](https://dashboard.onkernel.com/api-keys) and set it in the agent's environment:

```bash
# local dev — in the agent's .env.local
KERNEL_API_KEY=sk_...

# deploying to Vercel
npx vercel env add KERNEL_API_KEY
```

**3. Mount the extension** — a single file, no override needed:

```ts
// agent/extensions/kernel.ts — reads KERNEL_API_KEY from the environment
export { default } from "@onkernel/eve-extension";
```

**4. Run:** `npx eve dev` / `npx eve deploy`.

Prefer to pass the key explicitly instead of via env? `import kernel from "@onkernel/eve-extension"; export default kernel({ apiKey: process.env.KERNEL_API_KEY });`

### Configuration

`kernel({ ... })` accepts:

| Option   | Default                        | Purpose                                                                                      |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `apiKey` | `KERNEL_API_KEY` env var       | Kernel API key, sent as the bearer token for the MCP connection. Read lazily at request time. |
| `mcpUrl` | `https://mcp.onkernel.com/mcp` | Override the Kernel MCP endpoint.                                                            |

The key is read at request time — from `apiKey` if you pass it, otherwise from `KERNEL_API_KEY` — so mounting never fails at discovery when the env isn't populated yet.

## Develop

```bash
npm install
npm run typecheck
npm run build        # eve extension build — transpiles entry points + type decls
```

## License

MIT
