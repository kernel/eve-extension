# @onkernel/eve-extension

A [Vercel eve](https://vercel.com/eve) extension that gives an agent a [Kernel](https://www.kernel.sh) cloud browser. Mount it and Kernel's browser toolset — session management, Playwright execution, human-like computer controls — plus a `browse` skill show up under your mount (e.g. `kernel__browser__manage_browsers`). No browser tool code to write or maintain.

The tools aren't reimplemented here. The extension packages a single MCP connection to **[Kernel's hosted MCP server](https://github.com/onkernel/kernel-mcp-server)**; eve discovers the tools at runtime.

Authenticate through **[Vercel Connect](https://vercel.com/connect)** (no API key, per-user consent — the recommended setup below) or a **static Kernel API key** ([bottom section](#authenticate-with-an-api-key-instead)). Either way it's a one-line mount — you pick auth in the mount config, no connection override required.

## Setup

Authenticate through Vercel Connect — no key touches your app, env, or the model, and each user authenticates as themselves (one-time consent, cached after). *Prefer a single shared key with no connector setup? Jump to [Authenticate with an API key](#authenticate-with-an-api-key-instead).*

**1. Install** the extension:

```bash
npm install @onkernel/eve-extension
```

**2. Create and attach the Kernel connector** in Vercel Connect — name it `eve-extension` so the snippet below works unedited:

```bash
vercel connect create mcp.onkernel.com --name eve-extension
vercel connect attach mcp.onkernel.com/eve-extension
```

(or add it from the dashboard → Connectors → "Browse all" → Kernel). Confirm the UID with `vercel connect list`.

**3. Mount the extension** — one line, passing the connector UID:

```ts
// agent/extensions/kernel.ts
import kernel from "@onkernel/eve-extension";

export default kernel({ connect: "mcp.onkernel.com/eve-extension" });
```

**4. Run it:**

```bash
npx eve dev     # or: npx eve deploy
```

Leave `KERNEL_API_KEY` unset. The first time a user drives the browser, eve surfaces a Connect consent prompt; they approve once, and it's cached from then on (persists across threads and sessions). Each user authenticates as themselves — a good fit for Kernel's per-user managed auth.

## What you get

Once mounted, the agent has (namespaced under your mount, e.g. `kernel__browser__*` — discover exact names via `connection_search`):

- **`manage_browsers`** — create, list, get, delete browser sessions. Returns a `session_id` and a `live_view_url` you can watch or take over.
- **`execute_playwright_code`** — run Playwright against the live page to read, navigate, click, or type.
- **`computer_action`** — human-like mouse, keyboard, and screenshot controls for the same session.
- **`browser_curl`** — send HTTP requests through the browser session's network stack.
- **`manage_auth_connections`** + **`manage_credentials`** — Kernel's managed auth, so the agent logs into sites through a stored connection or a hosted login flow instead of typing credentials into the page.
- **`manage_profiles`** — create and reuse browser profiles (persistent cookies, logins, storage).
- **`manage_proxies`** — create and attach proxies (datacenter, ISP, residential, mobile) with geo-targeting.
- the **`browse`** skill — the loop the model follows to drive the browser end-to-end.

Heavier tools — shell exec (`exec_command`), app management, and browser pools (`manage_browser_pools`) — are left out of the default allowlist to keep an autonomous agent's blast radius small; add any of them via a [connection override](#overriding-the-connection).

The `browse` skill runs autonomously but is human-in-the-loop friendly: it surfaces the live-view URL for take-over, hands off for sign-ins / ambiguous choices / sensitive actions, and defaults to Kernel managed auth for authenticated sites.

## Auth models

Both are one-line mounts — no override needed:

| Model | Mount | Consent behavior |
| --- | --- | --- |
| **Per-user via Vercel Connect** (recommended; each person authenticates as themselves) | `kernel({ connect: "mcp.onkernel.com/<name>" })` | Each user consents **once, ever**; the grant persists across threads/sessions. No key in your app or env. |
| **Shared API key** ([bottom section](#authenticate-with-an-api-key-instead)) | `kernel({ apiKey })` or set `KERNEL_API_KEY` | One key for everyone, no prompts, no connector setup. |

## Overriding the connection

You only need this for **advanced** customization — widening the tool allowlist or adding an approval gate before irreversible actions. (Auth is handled by the mount config above; you don't override for that.) Mount as a directory and name the connection file `browser.ts` to shadow the extension's connection:

```
agent/extensions/kernel/
  extension.ts             # export default kernel({ connect: "mcp.onkernel.com/eve-extension" })
  connections/browser.ts   # shadows the extension's "browser" connection
```

```ts
// agent/extensions/kernel/connections/browser.ts
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";
import { once } from "eve/tools/approval";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description: "Kernel cloud browser.",
  auth: connect("mcp.onkernel.com/eve-extension"), // or { getToken: async () => ({ token: process.env.KERNEL_API_KEY! }) }
  tools: {
    allow: [
      "manage_browsers",
      "execute_playwright_code",
      "computer_action",
      "browser_curl",
      "manage_auth_connections",
      "manage_credentials",
      "manage_profiles",
      "manage_proxies",
      "manage_browser_pools", // heavier tools, off by default — add as needed
      "exec_command",
    ],
  },
  approval: once(), // ask once per session before the agent controls the browser
});
```

## Prerequisites

- **Node 24+**
- **eve `>= 0.25`** in the consuming agent — extensions need it. Older eve silently ignores `agent/extensions/` (you'll see a "discover/unsupported-directory" warning and nothing mounts). The extension keeps `eve` as a wildcard peer, so the consumer's installed eve is the one that runs.
- A **Kernel account** — a Vercel Connect Kernel connector (above) or a Kernel API key (below).
- `@vercel/connect` ships as a dependency of this extension (used for the Connect path) — no separate install.

## Authenticate with an API key instead

Another option: one shared credential, no connector setup. A good fit for a single-tenant or personal agent.

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

**3. Mount the extension** — a single file:

```ts
// agent/extensions/kernel.ts — reads KERNEL_API_KEY from the environment
export { default } from "@onkernel/eve-extension";
```

**4. Run:** `npx eve dev` / `npx eve deploy`.

Prefer to pass the key explicitly instead of via env? `import kernel from "@onkernel/eve-extension"; export default kernel({ apiKey: process.env.KERNEL_API_KEY });`

### Configuration

`kernel({ ... })` accepts:

| Option    | Default                        | Purpose                                                                                              |
| --------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `connect` | —                              | Vercel Connect connector UID — brokers a per-user token (no API key). |
| `apiKey`  | `KERNEL_API_KEY` env var       | Kernel API key bearer token. Used when `connect` is not set; read lazily at request time.            |
| `mcpUrl`  | `https://mcp.onkernel.com/mcp` | Override the Kernel MCP endpoint.                                                                    |

When `connect` is set it takes precedence; otherwise the key is read from `apiKey`, else `KERNEL_API_KEY`.

## Develop

```bash
npm install
npm run typecheck
npm run build        # eve extension build — transpiles entry points + type decls
```

## License

MIT
