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

auth: connect("mcp.onkernel.com/eve-extension"),
```

Use the **string form** — it's a `user` principal, which is the interactive path: when there's no token yet, eve drives the consent flow (surfaces the authorization URL, the user approves, and the token is minted and cached). This is the form to use.

> **Avoid `principalType: "app"` unless the connector is pre-installed with a standing app-level grant.** The app principal is *non-interactive* — it has no consent flow, so if Vercel Connect has no existing credential it fails terminally (`app_not_installed`, non-retryable) with "authorization not available in this context." App mode is only for connectors already authorized at the app level; for a normal agent, use the user (string) form above.

## Setup

1. Add `@vercel/connect` (>= 0.4.0 for the `@vercel/connect/eve` `connect()` helper) to the consuming agent.
2. Create the Kernel connector in Vercel Connect, **named `eve-extension`** so the code above works unedited: `vercel connect create mcp.onkernel.com --name eve-extension` (or add it from the dashboard → Connectors → "Browse all" → Kernel and name it `eve-extension`). Its UID is then `mcp.onkernel.com/eve-extension`.
3. Attach it to the consuming Vercel project so app-principal tokens resolve on the deployment: `vercel connect attach mcp.onkernel.com/eve-extension`.
4. Grant consent once. The first authorization surfaces a consent URL; `connect()` drives this interactively for a `user` principal. Approve, and subsequent mints succeed. Verify with `vercel connect token mcp.onkernel.com/eve-extension`.
5. Mount the extension as a directory with the override above. Leave `KERNEL_API_KEY` unset.

## Auth models: per-user consent vs. shared credential

Pick based on whether each end user should act as themselves or share one credential:

| Model | How | Consent behavior |
| --- | --- | --- |
| **Per-user** (each person authenticates as themselves — pairs naturally with Kernel's per-user managed auth / browser sessions) | `connect("mcp.onkernel.com/eve-extension")` — the string/`user` form above | Each user consents **once, ever**. Vercel Connect holds the grant per subject, so it persists across threads and sessions — no re-prompt. A new person gets a one-time consent prompt on their first browser use, then they're set. |
| **Shared, pre-authorized** (no per-user prompt) | App principal — `connect({ connector, principalType: "app" })` — but the connector must be **pre-installed with a standing app-level grant** | No prompts, but app mode is non-interactive: without a pre-existing grant it fails terminally (`app_not_installed`). Only use when the connector is already installed at the app level. |
| **Shared, simplest** | Static `KERNEL_API_KEY` (the extension's default connection) | No Connect, no prompts — one key for everyone. |

For a **team agent** where nobody should be prompted, use a shared model (API key, or a pre-installed app connector). For an agent where **each user acts as themselves**, the per-user `connect()` form is exactly right.

## Lower-level alternative: `getToken`

If you'd rather mint the token yourself, set `auth: { getToken }` and fetch a Connect-brokered token with `getToken` from `@vercel/connect`. `connect()` above is preferred — it handles consent and refresh — but this is the escape hatch when you need to shape the token call directly:

```ts
import { getToken } from "@vercel/connect";

auth: {
  getToken: async () => ({
    token: await getToken("mcp.onkernel.com/eve-extension", {
      subject: { type: "app" },
      scopes: ["*"],
    }),
  }),
}
```

## Connector id

The connector UID is `mcp.onkernel.com/<name>` — the MCP host plus the name you gave the connector in **your** Vercel workspace. This guide standardizes on `eve-extension` so the snippets are copy-paste, but the name is yours to choose. If you named it something else, run `vercel connect list`, copy your UID, and use that string in `connect(...)` instead.
