# Auth via Vercel Connect (no API key)

Authenticate the Kernel MCP connection through [Vercel Connect](https://vercel.com/connect) instead of a static `KERNEL_API_KEY`. Kernel is a Connect **preset connector**, so Connect handles the OAuth to Kernel's MCP server and refreshes the token out of band — no key in your app, env, or model context.

## How it works

The extension's default connection reads `KERNEL_API_KEY`. To use Connect instead, mount the extension as a **directory** and override the connection — eve composes the override file under the mount namespace and it wins on the name collision:

```
agent/extensions/kernel/
  connections/kernel.ts   # the override in this example
```

Copy [`connections/kernel.ts`](./connections/kernel.ts) into that path. It swaps the connection's `getToken` to pull a Connect-brokered token:

```ts
import { getToken } from "@vercel/connect";

auth: {
  getToken: async () => ({
    token: await getToken("mcp.onkernel.com/<your-connector>", {
      subject: { type: "app" },
      scopes: ["*"],
    }),
  }),
}
```

## Setup

1. Add `@vercel/connect` (>= 0.3.2) to the consuming agent.
2. Authorize the Kernel connector once in Vercel Connect — dashboard → Connectors → "Browse all" → Kernel, or via `vercel connect`.
3. Mount the extension as a directory with the override above. Leave `KERNEL_API_KEY` unset.

## Two things to confirm

Connect shipped the Kernel preset recently, so pin these against your workspace before relying on it:

- **Connector id.** The id is `mcp.onkernel.com/<connector-name>` — the MCP host plus your connector instance's name (e.g. `mcp.onkernel.com/chestnut-tree`). Copy yours from the Connect dashboard → Connectors → Kernel.
- **eve auth shape.** eve's `defineMcpClientConnection` takes `auth: { getToken }`, which the `getToken(...)` form above satisfies directly. `@vercel/connect` also ships `connectAuthProvider(connector, params)` (from `@vercel/connect/mcp`) which returns an MCP-spec `OAuthClientProvider` — if a future eve accepts an OAuth provider object directly, that's the more idiomatic wiring, but it pulls in `@ai-sdk/mcp` as a peer dep. The `getToken` form needs neither.

## Per-user vs. app tokens

`subject: { type: "app" }` brokers a token for the deployment's own identity — good for a single-tenant agent. For a multi-user agent, broker a token per end user with `subject: { type: "user", id: <userId> }`.
