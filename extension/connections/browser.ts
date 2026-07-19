import { defineMcpClientConnection } from "eve/connections";
import { connect } from "@vercel/connect/eve";
import extension from "../extension";

// Kernel's hosted MCP server exposes the whole cloud-browser toolset — session
// management, Playwright execution, and human-like computer controls — so this
// extension ships no browser tools of its own. eve discovers the tools at runtime
// and surfaces them to the model as `<mount>__browser__<tool>` via `connection_search`.
//
// Auth is chosen from the mount config, so both modes are a one-line mount — no
// connection override needed:
//   - `connect` set  -> broker the token through Vercel Connect (no API key),
//                        per-user (interactive consent).
//   - otherwise       -> static Kernel API key (config.apiKey, else KERNEL_API_KEY env).
function auth() {
  const cfg = extension.config;
  if (cfg.connect) return connect(cfg.connect);
  return {
    getToken: async () => {
      const token = cfg.apiKey ?? process.env.KERNEL_API_KEY;
      if (!token) {
        throw new Error(
          "@onkernel/eve-extension: no Kernel credentials — set `connect`, `apiKey`, or the KERNEL_API_KEY env var.",
        );
      }
      return { token };
    },
  };
}

export default defineMcpClientConnection({
  url: "https://mcp.onkernel.com/mcp",
  description:
    "Kernel cloud browser. Create and manage browser sessions, run Playwright code against a live page, and drive it with mouse/keyboard/screenshot computer controls.",
  auth: auth(),
  // The tools needed to open a browser, drive it end-to-end, log into sites via
  // Kernel's managed auth, and configure profiles/proxies. Kernel's MCP exposes
  // more — widen this by overriding the connection, e.g.:
  //
  //   allow: [...defaults, "browser_curl", "manage_credentials", "exec_command"]
  //
  // Leaving credential storage and out-of-browser HTTP off by default keeps an
  // autonomous agent's blast radius small on a shared API key.
  tools: {
    allow: [
      "manage_browsers",
      "execute_playwright_code",
      "computer_action",
      "manage_auth_connections",
      "manage_profiles",
      "manage_proxies",
    ],
  },
  // No approval gate — the agent runs autonomously. Consumers can override this
  // connection to add e.g. `approval: once()` (from "eve/tools/approval") or a
  // custom policy that inspects the tool input before irreversible actions.
});
