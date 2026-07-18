# @onkernel/eve-extension

A [Vercel eve](https://vercel.com/eve) extension that gives an agent a [Kernel](https://www.kernel.sh) cloud browser. Mount it in one line and Kernel's whole browser toolset — session management, Playwright execution, and human-like computer controls — shows up as namespaced tools (e.g. `kernel__browser__manage_browsers`), plus a `browse` skill with the read → act → observe loop. No browser tool code to write or maintain.

The tools aren't reimplemented here. The extension packages a single MCP connection to **[Kernel's hosted MCP server](https://github.com/onkernel/kernel-mcp-server)**; eve discovers the tools at runtime.

## Setup

Getting Kernel into an eve agent takes four steps:

**1. Install the package** in your eve agent:

```bash
npm install @onkernel/eve-extension
```

**2. Get a Kernel API key** at [dashboard.onkernel.com/api-keys](https://dashboard.onkernel.com/api-keys), and set it in the agent's environment:

```bash
# local dev — in the agent's .env.local
KERNEL_API_KEY=sk_...

# deploying to Vercel
npx vercel env add KERNEL_API_KEY
```

**3. Mount the extension** — create `agent/extensions/kernel.ts`:

```ts
// agent/extensions/kernel.ts — reads KERNEL_API_KEY from the environment
export { default } from "@onkernel/eve-extension";
```

The file basename (`kernel`) becomes the tool namespace, so tools surface as `kernel__browser__<tool>`.

**4. Run it:**

```bash
npx eve dev     # or: npx eve deploy
```

That's it — the agent now drives a Kernel cloud browser. Ask it something like *"open example.com and tell me the page title"* and it opens a browser, reads the page, and reports back.

> Prefer to pass the key explicitly instead of via env? `import kernel from "@onkernel/eve-extension"; export default kernel({ apiKey: process.env.KERNEL_API_KEY });`

## What you get

Once mounted, the agent has (namespaced under your mount, e.g. `kernel__browser__*` — discover exact names via `connection_search`):

- **`manage_browsers`** — create, list, get, delete browser sessions. Returns a `session_id` and a `live_view_url` you can watch or take over.
- **`execute_playwright_code`** — run Playwright against the live page to read, navigate, click, or type.
- **`computer_action`** — human-like mouse, keyboard, and screenshot controls for the same session.
- **`browser_curl`** — send HTTP requests through the browser session's network stack.
- **`manage_auth_connections`** + **`manage_credentials`** — Kernel's managed auth, so the agent logs into sites through a stored connection or a hosted login flow instead of typing credentials into the page.
- the **`browse`** skill — the loop the model follows to drive the browser end-to-end.

## Auth models: per-user consent vs. shared credential

There are two ways to authenticate to Kernel. Pick based on whether each end user should act as themselves or share one credential:

| Model | How | Consent behavior |
| --- | --- | --- |
| **Shared key** (simplest — the default above) | Static `KERNEL_API_KEY` | One key for everyone, no prompts. |
| **Per-user via Vercel Connect** (each person authenticates as themselves — pairs naturally with Kernel's per-user managed auth) | `connect("mcp.onkernel.com/<name>")` — see below | Each user consents **once, ever**; the grant persists across threads and sessions (no re-prompt). A new person gets a one-time prompt on first use. No key in your app or env. |
| **Shared via Connect** (no per-user prompt, no key) | App principal — `connect({ connector, principalType: "app" })` | Only works when the connector is **pre-installed with a standing app-level grant**; otherwise it fails terminally (`app_not_installed`). |

Most agents want the **shared key** (setup above) or **per-user Connect** (next section).

## Use Vercel Connect (no API key)

[Vercel Connect](https://vercel.com/connect) brokers and refreshes the OAuth token for Kernel, so no key touches your app, env, or the model.

**1. Create the Kernel connector** in Vercel Connect, named `eve-extension` so the snippet below works unedited:

```bash
vercel connect create mcp.onkernel.com --name eve-extension
```

(or add it from the dashboard → Connectors → "Browse all" → Kernel). Its UID is then `mcp.onkernel.com/eve-extension` — confirm with `vercel connect list`.

**2. Attach it** to the consuming Vercel project:

```bash
vercel connect attach mcp.onkernel.com/eve-extension
```

**3. Override the connection** — mount the extension as a **directory** and add the override at `agent/extensions/kernel/`. The connection file must be named `browser.ts` to shadow the extension's own `browser` connection (eve keys connections by basename):

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

Leave `KERNEL_API_KEY` unset. The first time a user drives the browser, eve surfaces a Connect consent prompt; they approve once, and it's cached from then on (persists across threads and sessions).

## Configuration

`kernel({ ... })` accepts:

| Option   | Default                        | Purpose                                                                                      |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `apiKey` | `KERNEL_API_KEY` env var       | Kernel API key, sent as the bearer token for the MCP connection. Read lazily at request time. |
| `mcpUrl` | `https://mcp.onkernel.com/mcp` | Override the Kernel MCP endpoint.                                                            |

The key is read at request time — from `apiKey` if you pass it, otherwise from `KERNEL_API_KEY` — so mounting never fails at discovery when the env isn't populated yet.

## Overriding the connection

Mount as a directory instead of a file to override what the extension ships — for example, to widen the tool allowlist or add an approval gate before irreversible actions. Name the override file `browser.ts` to shadow the extension's connection:

```
agent/extensions/kernel/
  extension.ts             # export { default } from "@onkernel/eve-extension"
  connections/browser.ts   # shadows the extension's "browser" connection
```

```ts
// agent/extensions/kernel/connections/browser.ts
import { defineMcpClientConnection } from "eve/connections";
import { once } from "eve/tools/approval";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description: "Kernel cloud browser.",
  auth: { getToken: async () => ({ token: process.env.KERNEL_API_KEY! }) },
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
- A **Kernel API key** (or a Vercel Connect Kernel connector)
- **eve `>= 0.25`** in the consuming agent — extensions need it. Older eve silently ignores `agent/extensions/` (you'll see a "discover/unsupported-directory" warning and nothing mounts). The extension keeps `eve` as a wildcard peer, so the consumer's installed eve is the one that runs.

## Develop

```bash
npm install
npm run typecheck
npm run build        # eve extension build — transpiles entry points + type decls
```

## License

MIT
