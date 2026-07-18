// Example: authenticate the Kernel MCP connection through Vercel Connect
// instead of a static KERNEL_API_KEY.
//
// Drop this file into a consuming agent at
// `agent/extensions/kernel/connections/browser.ts` — the filename must be
// `browser` to shadow the extension's own `browser` connection (eve keys
// connections by file basename; a differently-named file would add a *new*
// connection and the `browse` skill would keep using the default one). Mounting
// the extension as a directory overrides its built-in connection with this one
// (see the eve "Overrides" docs). Connect brokers and refreshes the OAuth token
// for the Kernel connector, so no key touches your app, env, or the model.
//
// Prerequisite: create/authorize the Kernel connector in Vercel Connect. Name it
// `eve-extension` so this file works as-is:
//   vercel connect create mcp.onkernel.com --name eve-extension
// (or add it from the dashboard → Connectors → "Browse all" → Kernel).
import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";

// Connector UID `mcp.onkernel.com/<name>`. This matches the `eve-extension` name
// from the create command above; if you named yours differently, change it to
// match (`vercel connect list` shows your UID).
const KERNEL_CONNECTOR = "mcp.onkernel.com/eve-extension";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description:
    "Kernel cloud browser. Create and manage browser sessions, run Playwright code against a live page, and drive it with mouse/keyboard/screenshot computer controls.",
  // `connect()` returns a ready-made eve authorization definition: it handles
  // token minting and the one-time interactive consent for you. The string form
  // is per-user (interactive); pass an options object with `principalType: "app"`
  // for a deployment-identity token instead.
  auth: connect(KERNEL_CONNECTOR),
  tools: {
    allow: [
      "manage_browsers",
      "execute_playwright_code",
      "computer_action",
      "browser_curl",
      "manage_auth_connections",
      "manage_credentials",
    ],
  },
});
