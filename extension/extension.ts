import { defineExtension } from "eve/extension";
import { z } from "zod";

// The Kernel extension packages a single MCP connection (see connections/browser.ts)
// and a browsing skill. Mounting it gives an agent Kernel's whole cloud-browser
// toolset, surfaced under the mount namespace (e.g. `kernel__browser__<tool>`),
// plus the read -> act -> observe loop as a skill:
//
//   // agent/extensions/kernel.ts
//   import kernel from "@onkernel/eve-extension";
//   export default kernel({ apiKey: process.env.KERNEL_API_KEY });
export default defineExtension({
  config: z.object({
    // Kernel API key, sent as the bearer token for the MCP connection. Get one
    // at https://dashboard.onkernel.com/api-keys. Optional: when omitted the
    // connection falls back to the KERNEL_API_KEY environment variable.
    apiKey: z.string().optional(),
    mcpUrl: z.string().default("https://mcp.onkernel.com/mcp"),
  }),
});
