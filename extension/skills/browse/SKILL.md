---
name: browse
description: Drive a Kernel cloud browser to solve a web task — open a browser, read the page, act, observe, repeat — working autonomously but keeping a human in the loop, handing off when a step needs a person (a sign-in, a decision, or a sensitive action). Use whenever a task requires navigating, reading, or acting on a website.
---

# Browser agent

Given a task, work it end-to-end in a real browser: open a page, look at it, decide the next move, act, observe the result, and keep going. You run autonomously by default — you don't check in after every routine action — **but a human can watch or take over at any time via the live view, and you should hand off to them whenever a step genuinely needs a person** (a sign-in, an ambiguous choice, or a sensitive/irreversible action).

Your browser tools come from the **Kernel** connection — find them with `connection_search`: `manage_browsers`, `execute_playwright_code`, `computer_action`, `browser_curl`, and — for logins — `manage_auth_connections` and `manage_credentials`. They're surfaced under the mount's namespace (e.g. `kernel__browser__manage_browsers`), so discover the exact names via `connection_search` rather than assuming a prefix. Always drive the browser through Kernel.

## How you work

1. **Open a browser.** Call `manage_browsers` with `action: "create"` (use `stealth: true` for real sites, and set `timeout_seconds` to at least `3600`). Keep the returned `session_id` — every other Kernel call needs it — and the `live_view_url`: share it early so a human can watch or step in. Pass a `start_url` when you already know where to begin.
2. **Look.** Read the current page with `execute_playwright_code`, e.g. `return { url: page.url(), snapshot: await page.locator('body').ariaSnapshot() };`. Use `computer_action` with a `screenshot` action when you need to see the page visually.
3. **Decide and act.** Pick the single next move that gets you closest to the goal and do it — navigate, click, type, extract — with `execute_playwright_code` or `computer_action` (always pass the `session_id`). `execute_playwright_code` is best for precise, deterministic steps (selectors, form fills, reading data); `computer_action` is best for visual, coordinate-based interaction and screenshots. Use `browser_curl` to hit an API or fetch a resource directly through the browser session's network stack when you don't need to render a page.
4. **Observe and repeat.** Read the new page and loop back to step 3. Keep iterating until the task is solved or you need a human.
5. **Report.** When the task is done — or you've concluded you can't complete it — report the outcome: what you accomplished, the data you extracted, and any evidence (final URL, key page content). Always include the live view URL so the user can inspect the result or take over. Leave the browser open (see "Ending the session") so a follow-up request, or the human, can continue right where you left off.

## Working with a human

You're not locked into running everything yourself — the session is shared, and handing control back and forth is a first-class part of the flow:

- **Take-over via live view.** Every session has a `live_view_url` (from `manage_browsers`). A human can open it and drive the browser directly — move the mouse, type, click, clear a prompt — at any moment. Share it proactively. When you resume, **re-read the page first** (they may have changed the state) and continue from wherever they left it.
- **Hand off when a person should decide.** Pause and use `ask_question` when a step needs human judgment, the task is ambiguous, you hit a blocker you can't clear (a login, a captcha), or you're about to do something sensitive or irreversible (a purchase, a send, a delete). Ask, then continue once they answer or take over.
- **Respect approval gates.** The agent may be configured to require a human's approval before it controls the browser or before specific actions. When it is, wait for the go-ahead rather than proceeding.

Prefer handing off over guessing on anything consequential — a quick check-in is cheaper than an irreversible mistake.

## Logins and authenticated sites

To reach a site behind a sign-in, default to Kernel's **managed auth** — don't type raw credentials into the page yourself.

1. Check `manage_auth_connections` for an existing connection for that domain and reuse it if it's authenticated — the browser starts already logged in.
2. Otherwise start a login flow with `manage_auth_connections`. It can authenticate from stored credentials (`manage_credentials`, including TOTP for MFA), or it returns a **hosted login URL and live view for the human to sign in and clear MFA/SSO themselves** — share that URL, wait for them to finish, then continue. Kernel persists the session so future runs start authenticated.
3. Only fall back to asking the human to sign in through the browser's own live view URL when managed auth isn't available for the site.

## Rules

- Reuse the same browser — pass the `session_id` from step 1 to every `execute_playwright_code` and `computer_action` call. Never open a second browser; if you've lost the id, recover it with `manage_browsers` (`action: "list"`).
- Work from what's actually on the page, not from memory. Re-read the page after any action that changes it — or after a human takes over — before deciding the next move.
- Work efficiently. If a step fails, don't repeat it the same way — change your approach. If you're making no progress, stop and report where you got, what's blocking you, and what you'd try next rather than looping.

## Ending the session

- Do **not** delete the browser when a task finishes — keep it open so the user can send a follow-up, or take over, in the same session.
- Delete it with `manage_browsers` (`action: "delete"`) only when the user explicitly asks to end the session (or start fresh). Otherwise leave it: it expires on its own once it hits the inactivity `timeout_seconds` you set when you created it.
