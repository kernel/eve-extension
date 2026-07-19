import { defineExtension } from "eve/extension";
import { z } from "zod";

// The Kernel extension packages a single MCP connection (see connections/browser.ts)
// and a browsing skill. Mounting it gives an agent Kernel's whole cloud-browser
// toolset, surfaced under the mount namespace (e.g. `kernel__browser__<tool>`),
// plus the read -> act -> observe loop as a skill. Pick auth at the mount:
//
//   // Vercel Connect, per-user (recommended) — no API key:
//   export default kernel({ connect: "mcp.onkernel.com/<your-connector>" });
//
//   // Vercel Connect, shared app-level grant (no per-user prompt):
//   export default kernel({ connect: { connector: "mcp.onkernel.com/<name>", principalType: "app" } });
//
//   // Static API key (or omit and set KERNEL_API_KEY in the env):
//   export default kernel({ apiKey: process.env.KERNEL_API_KEY });
export default defineExtension({
  config: z.object({
    // Kernel API key, sent as the bearer token for the MCP connection. Get one
    // at https://dashboard.onkernel.com/api-keys. Optional: when omitted (and
    // `connect` is unset) the connection falls back to the KERNEL_API_KEY env var.
    apiKey: z.string().optional(),
    // Authenticate through Vercel Connect instead of an API key. String = the
    // connector UID, brokered per-user (interactive consent — the default).
    // Object form selects the principal: `principalType: "app"` for a shared,
    // pre-installed app-level grant with no per-user prompt. Requires the
    // optional peer `@vercel/connect`.
    connect: z
      .union([
        z.string(),
        z.object({
          connector: z.string(),
          principalType: z.enum(["user", "app"]).optional(),
        }),
      ])
      .optional(),
    mcpUrl: z.string().default("https://mcp.onkernel.com/mcp"),
  }),
});
