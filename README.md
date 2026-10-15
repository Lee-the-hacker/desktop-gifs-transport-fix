# Desktop GIFs transport fix

A local patch for **Desktop GIFs 0.1.3**, published by [Lee-the-hacker](https://github.com/Lee-the-hacker). The modified code retains this credit:

```text
Fixed by: https://github.com/Lee-Organization/
```

**This does not restore YouTube GIF posting.** It fixes confirmed request-handling and result-reporting bugs in the supplied older version. The latest upstream source already addresses several of those older defects. This repository is a reviewable version-specific patch, not an upstream release or a verified fix for YouTube's rejection.

## Files

- [Detailed investigation and proposed next steps](REPORT.md)
- [Patched main-world source](main.js) — the ZIP includes all extension files
- [Source diff against original 0.1.3](fix.patch)
- [Downloadable extension ZIP](Desktop-GIFs-patched.zip)
- [Regression tests](test-transport.cjs)
- [Patch notes and limitations](PATCH-NOTES.txt)

## Confirmed fixes

- Respect effective `Request` / `RequestInit` body, header and option overrides.
- Inspect a clone; forward ordinary text without rewriting its contents.
- Handle gzip input and remove obsolete encoding/length headers on rewritten JSON.
- Report generic `INVALID_ARGUMENT` without blaming a particular GIF.
- Do not treat unreadable HTTP 200 responses as confirmed posting success.
- Report uncertain network outcomes without claiming that nothing was posted.

## Validation

Requires Node.js 22 or later:

```sh
node test-transport.cjs
```

The regression test reproduces the override defect in the original 0.1.3 source and passes against this patched copy. Other tests cover gzip, ordinary text, request options, generic rejection handling, unreadable responses, streaming bodies, marker blocking and duplicate-hook prevention. All network responses are mocked. No comments were posted to YouTube during these checks.

## Optional local installation

Extract the ZIP and select its `Desktop-GIFs-patched` folder using **Load unpacked** at `edge://extensions` or `chrome://extensions` in Developer mode. For an existing installation, replace files in the already-loaded folder and reload its card to retain that installation's stored favorites. Refresh YouTube afterward. Do not run the old and patched copies together.

Installing this patch does not resolve the known server rejection. It improves transport correctness and diagnostics only.

## Attribution and upstream

Original project: [Desktop GIFs by rayytor](https://github.com/rayytor/desktop_gifs). Original copyright and GPL-3.0 licensing are retained; see [LICENSE](LICENSE).

Local fixes: [Lee-Organization](https://github.com/Lee-Organization/), October 15, 2026. Credit applies to the local transport/error-handling changes, not authorship of the original extension or restoration of GIF posting.

Upstream tracks the desktop posting failure in [issue #93](https://github.com/rayytor/desktop_gifs/issues/93). No upstream issue, comment or pull request was submitted as part of this publication.

