# Desktop GIFs 0.1.3: request-handling patch and HTTP 400 investigation

Investigated October 15, 2026. Published by Lee-the-hacker; local code fixes credited to https://github.com/Lee-Organization/.

## Observed behavior

On Microsoft Edge, ordinary text comments work, while GIF submissions fail across different GIFs, including submissions with accompanying text and GIF-only comments. The reported endpoint is:

```text
POST https://www.youtube.com/youtubei/v1/comment/create_comment?prettyPrint=false
```

The supplied response is:

```json
{
  "error": {
    "code": 400,
    "message": "Request contains an invalid argument.",
    "errors": [{
      "message": "Request contains an invalid argument.",
      "domain": "global",
      "reason": "badRequest"
    }],
    "status": "INVALID_ARGUMENT"
  }
}
```

This response confirms rejection, but it does not identify the invalid field or the backend validation rule. The user supplied the live error; the investigation did not submit an authenticated test comment.

## Request flow

The content script selects a Tenor ID, arms a one-time marker, appends that marker to YouTube's comment box and clicks YouTube's own submit button. The main-world fetch wrapper intercepts the generated comment request, removes the marker, adds `tenorId`, and sends modified JSON. It deletes `commentText` for GIF-only submissions and retains accompanying text otherwise.

`main.js:114` in original version 0.1.3 is the sending location. A browser can construct and send a request that the server rejects. The HTTP 400 response does not establish that `new Request()` itself threw or is defective.

## Confirmed defect 1: RequestInit overrides

Original `readBody(input, init)` reads only the Request's original headers/body when `input` is a Request. It ignores overriding headers and body in `init`. The sending branch also constructs its replacement from `input` without applying the other original `init` options.

The patched copy first normalizes the effective request using a clone of the caller's Request plus `init`. Inspection reads another clone. Rewriting is based on the normalized request, preserving effective method, headers, credentials, redirect/cache options and other standard request properties. Streamed ordinary bodies are forwarded using the normalized request, rather than trying to reuse a consumed `init.body` stream.

The regression fixture gives the original Request one body and supplies a different body through `init`. The original code forwards the old body, causing the test to fail. The patch uses the overriding body and passes. This establishes a real implementation bug; it does not establish that the user's particular server rejection used this argument combination.

## Confirmed defect 2: misleading GIF-specific errors

The original handler converts generic `INVALID_ARGUMENT` into an instruction to try a different GIF. That response alone does not identify a GIF rating problem or invalid Tenor ID.

The patch reports the HTTP/API rejection accurately and does not infer that the chosen GIF is unsuitable. It does not add speculative attachment fields or claim to know a replacement server contract.

## Confirmed defect 3: unconfirmed results reported as success

The original JSON-parsing catch block uses `response.ok` as the posting result. Consequently an unreadable HTTP 200 response can be presented as successful posting without the expected `actionResult` confirmation.

The patch requires explicit success confirmation. An unreadable response is marked uncertain. Network failures also avoid guaranteeing that nothing was posted, since a connection can fail after server processing.

## Upstream comparison and unresolved cause

The maintainer currently reports that desktop GIF submissions have been failing since October 14, 2026, with no established working fix. See the [upstream README](https://github.com/rayytor/desktop_gifs#desktop-gifs) and [issue #93](https://github.com/rayytor/desktop_gifs/issues/93).

The symptoms support a compatibility or acceptance failure in the GIF submission path. They do not establish intentional blocking, an account/region restriction, an invalid attachment representation, or invalidated validation metadata as the specific cause.

The [current upstream main.js](https://github.com/rayytor/desktop_gifs/blob/main/extension/src/main.js) already handles several request overrides and unreadable confirmations differently from the installed older copy. The submitted patch is specifically for 0.1.3. It should not be applied blindly over current upstream or presented as a new solution to all current defects.

The extension uses an internal youtubei endpoint. Google's [documented comment insertion API](https://developers.google.com/youtube/v3/docs/comments/insert) is a different interface and does not document this extension's `tenorId` write format. Its documentation cannot establish the correct replacement payload for this endpoint.

## Recommended next investigation

1. Obtain an authorized successful GIF submission from a supported interface, if one is available.
2. Compare the attachment representation, accompanying text and relevant client context with the extension's request.
3. Test whether any request validation metadata depends on the modified body; this is a hypothesis, not an established cause.
4. Verify a candidate fix with an explicitly authorized live posting test, then confirm the comment persists and does not duplicate.
5. If no successful reference request is available, keep the backend compatibility issue unresolved rather than treating mocked success responses as proof of restoration.

No automatic retries or client spoofing were added in this local patch. The existing `tenorId` payload shape is unchanged.

## Tests and limitations

Run `node test-transport.cjs` with Node.js 22 or later. Checked: ordinary text passthrough; RequestInit body/header overrides; credentials/cache/redirect preservation; caller Request remaining unconsumed; gzip rewriting; generic HTTP 400 handling; unreadable HTTP 200 handling; network uncertainty; one-shot marker validation; duplicate-hook prevention; streaming ordinary bodies.

The suite uses mocked network responses only. No real comment was posted. No account tokens, cookies or authorization headers are included in this repository. The local patch improves implementation correctness and diagnostics; successful GIF posting remains unverified.

