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
//   // Static API key (or omit and set KERNEL_API_KEY in the env):
//   export default kernel({ apiKey: process.env.KERNEL_API_KEY });
export default defineExtension({
  config: z.object({
    // Kernel API key, sent as the bearer token for the MCP connection. Get one
    // at https://dashboard.onkernel.com/api-keys. Optional: when omitted (and
    // `connect` is unset) the connection falls back to the KERNEL_API_KEY env var.
    apiKey: z.string().optional(),
    // Authenticate through Vercel Connect instead of an API key: pass the
    // connector UID, brokered per-user (interactive consent). Uses `@vercel/connect`.
    connect: z.string().optional(),
  }),
});
