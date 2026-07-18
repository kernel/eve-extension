# @onkernel/eve-extension

A [Vercel eve](https://vercel.com/eve) extension that gives an agent a [Kernel](https://www.kernel.sh) cloud browser. Mount it in one line and Kernel's whole browser toolset — session management, Playwright execution, and human-like computer controls — shows up as `kernel__<tool>`, plus a `browse` skill with the read → act → observe loop. No browser tool code to write or maintain.

The tools aren't reimplemented here. The extension packages a single MCP connection to **[Kernel's hosted MCP server](https://github.com/onkernel/kernel-mcp-server)**; eve discovers the tools at runtime.

## Install

```bash
npm install @onkernel/eve-extension
```

## Mount it

Set `KERNEL_API_KEY` in the agent's environment and add a one-line mount under `agent/extensions/`:

```ts
// agent/extensions/kernel.ts — reads KERNEL_API_KEY from the environment
export { default } from "@onkernel/eve-extension";
```

Prefer to pass the key explicitly? Call the factory instead:

```ts
// agent/extensions/kernel.ts
import kernel from "@onkernel/eve-extension";

export default kernel({ apiKey: process.env.KERNEL_API_KEY });
```

That's it. The agent now has:

- **`kernel__manage_browsers`** — create, list, get, delete browser sessions. Returns a `session_id` and a `live_view_url` you can watch or take over.
- **`kernel__execute_playwright_code`** — run Playwright against the live page to read, navigate, click, or type.
- **`kernel__computer_action`** — human-like mouse, keyboard, and screenshot controls for the same session.
- **`kernel__browser_curl`** — send HTTP requests through the browser session's network stack.
- **`kernel__manage_auth_connections`** + **`kernel__manage_credentials`** — Kernel's managed auth, so the agent logs into sites through a stored connection or a hosted login flow instead of typing credentials into the page.
- the **`browse`** skill — the loop the model follows to drive the browser end-to-end.

Get an API key at [dashboard.onkernel.com/api-keys](https://dashboard.onkernel.com/api-keys).

## Configuration

`kernel({ ... })` accepts:

| Option   | Default                        | Purpose                                                                                      |
| -------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `apiKey` | `KERNEL_API_KEY` env var       | Kernel API key, sent as the bearer token for the MCP connection. Read lazily at request time. |
| `mcpUrl` | `https://mcp.onkernel.com/mcp` | Override the Kernel MCP endpoint.                                                            |

The key is read at request time — from `apiKey` if you pass it, otherwise from the `KERNEL_API_KEY` environment variable — so mounting never fails at discovery when the env isn't populated yet.

## Auth: static key or Vercel Connect

By default the connection uses a static `KERNEL_API_KEY`. Since Kernel is a [Vercel Connect](https://vercel.com/connect) preset connector, you can instead let Connect issue and refresh the OAuth token out of band — so no key touches your app, env, or the model.

Authorize the Kernel connector once in Connect, then override the connection with `connect()` from `@vercel/connect/eve` — it returns a ready-made eve authorization definition that mints the token and drives the one-time consent for you:

```ts
// agent/extensions/kernel/connections/kernel.ts
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description: "Kernel cloud browser.",
  auth: connect("mcp.onkernel.com/eve-extension"), // per-user; pass { connector, principalType: "app" } for a deployment token
  tools: { allow: ["manage_browsers", "execute_playwright_code", "computer_action", "browser_curl", "manage_auth_connections", "manage_credentials"] },
});
```

Name your connector `eve-extension` at create time (`vercel connect create mcp.onkernel.com --name eve-extension`) so the snippet works unedited — the UID is `mcp.onkernel.com/<the name you chose>`, so if you picked a different name, use that (`vercel connect list`). Full walkthrough, per-user vs. app tokens, and the lower-level `getToken` alternative: [`examples/connect-auth/`](./examples/connect-auth/).

## Overriding the connection

Mount as a directory instead of a file to override what the extension ships — for example, to widen the tool allowlist, add an approval gate before irreversible actions, or swap the auth provider:

```
agent/extensions/kernel/
  extension.ts
  connections/kernel.ts
```

```ts
// agent/extensions/kernel/connections/kernel.ts
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
- **eve** in the consuming agent — the extension keeps `eve` as a wildcard peer so the consumer's installed eve is the one that runs

## Develop

```bash
npm install
npm run typecheck
npm run build        # eve extension build — transpiles entry points + type decls
```

## License

MIT
