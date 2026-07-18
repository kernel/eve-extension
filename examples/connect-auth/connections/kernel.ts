// Example: authenticate the Kernel MCP connection through Vercel Connect
// instead of a static KERNEL_API_KEY.
//
// Drop this file into a consuming agent at
// `agent/extensions/kernel/connections/kernel.ts` — mounting the extension as a
// directory overrides its built-in connection with this one (see the eve
// "Overrides" docs). Connect brokers and refreshes the OAuth token for the
// Kernel preset connector, so no key touches your app, env, or the model.
//
// Prerequisite: authorize the Kernel connector once in Vercel Connect
// (dashboard → Connectors → "Browse all" → Kernel, or via `vercel connect`),
// then reference it by its connector id below.
import { defineMcpClientConnection } from "eve/connections";
import { getToken } from "@vercel/connect";

// Vercel Connect names the Kernel connector `mcp.onkernel.com/<connector-name>`
// (the MCP host plus your connector instance's name). Find yours in the Connect
// dashboard → Connectors → Kernel, and paste it here.
const KERNEL_CONNECTOR = "mcp.onkernel.com/<your-connector>";

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description:
    "Kernel cloud browser. Create and manage browser sessions, run Playwright code against a live page, and drive it with mouse/keyboard/screenshot computer controls.",
  auth: {
    // Connect issues and refreshes the token out of band. `subject: { type:
    // "app" }` uses the deployment's own identity; switch to `{ type: "user",
    // id }` to broker a token per end user.
    getToken: async () => ({
      token: await getToken(KERNEL_CONNECTOR, {
        subject: { type: "app" },
        scopes: ["*"],
      }),
    }),
  },
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
