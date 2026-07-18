# Auth via Vercel Connect (no API key)

Authenticate the Kernel MCP connection through [Vercel Connect](https://vercel.com/connect) instead of a static `KERNEL_API_KEY`. Kernel is a Connect **preset connector**, so Connect handles the OAuth to Kernel's MCP server and refreshes the token out of band — no key in your app, env, or model context.

## How it works

The extension's default connection reads `KERNEL_API_KEY`. To use Connect instead, mount the extension as a **directory** and override the connection — eve composes the override file under the mount namespace and it wins on the name collision:

```
agent/extensions/kernel/
  connections/kernel.ts   # the override in this example
```

Copy [`connections/kernel.ts`](./connections/kernel.ts) into that path. It sets the connection's `auth` to `connect()` from `@vercel/connect/eve`, which returns a ready-made eve authorization definition — it mints the token and drives the one-time interactive consent for you:

```ts
import { connect } from "@vercel/connect/eve";

auth: connect("mcp.onkernel.com/<your-connector>"),
```

The string form brokers a per-user token (interactive). For a deployment-identity token instead, pass the options form:

```ts
auth: connect({
  connector: "mcp.onkernel.com/<your-connector>",
  principalType: "app",
  tokenParams: { scopes: ["*"] },
}),
```

## Setup

1. Add `@vercel/connect` (>= 0.4.0 for the `@vercel/connect/eve` `connect()` helper) to the consuming agent.
2. Create/authorize the Kernel connector in Vercel Connect — dashboard → Connectors → "Browse all" → Kernel, or `vercel connect create mcp.onkernel.com --name <name>`. Note the UID (`mcp.onkernel.com/<name>`).
3. Attach it to the consuming Vercel project so app-principal tokens resolve on the deployment: `vercel connect attach mcp.onkernel.com/<name>`.
4. Grant consent once. The first authorization surfaces a consent URL; `connect()` drives this interactively for a `user` principal. Approve, and subsequent mints succeed. Verify with `vercel connect token mcp.onkernel.com/<name>`.
5. Mount the extension as a directory with the override above. Leave `KERNEL_API_KEY` unset.

## Lower-level alternative: `getToken`

If you'd rather mint the token yourself, set `auth: { getToken }` and fetch a Connect-brokered token with `getToken` from `@vercel/connect`. `connect()` above is preferred — it handles consent and refresh — but this is the escape hatch when you need to shape the token call directly:

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

## Connector id

The id is `mcp.onkernel.com/<connector-name>` — the MCP host plus your connector instance's name (e.g. `mcp.onkernel.com/eve-extension`). Copy yours from the Connect dashboard → Connectors → Kernel, or `vercel connect list`.
