# WhatsApp channel — local stand-in, not a live integration

`POST /api/whatsapp-webhook` (and its `GET` verification handshake) are shaped
exactly like a real **WhatsApp Cloud API** webhook, and reuse the same
`solveDoubt()` pipeline as the web app. They let you exercise the "solve a
doubt over WhatsApp" flow end-to-end locally, without any WhatsApp account.

They are **not** wired up to the real WhatsApp network. Two things are stubbed:

1. **Incoming media.** A real WhatsApp image message only carries a `media id`;
   the server must fetch the actual bytes from Meta's Graph API
   (`GET /v19.0/{media-id}`, using a permanent access token) before it can do
   anything with the image. This stub skips that round trip: if the incoming
   payload's `image` object includes a `base64` field, that's used directly.
   A live integration must replace this with the real media-download call.

2. **Outgoing replies.** A real integration sends the reply by POSTing to
   `https://graph.facebook.com/v19.0/{phone-number-id}/messages` with the
   business's access token. This stub can't call that (no credentials), so
   it instead returns the exact message payload(s) that call *would* have
   sent, under `wouldSend` in the HTTP response — a text message with the
   explanation, and an audio message pointing at a generated voice-note
   narrating it (reusing the video pipeline's TTS).

## What a production version needs, on top of this code

- A **Meta developer account** and a **WhatsApp Business Account**, with the
  app added to the Meta App Dashboard.
- A **verified business phone number** connected to that WhatsApp Business
  Account (Meta's test numbers work for development, but expire).
- A **permanent access token** (System User token, not a 24-hour user token)
  with `whatsapp_business_messaging` permission, stored as a server secret.
- **Webhook registration**: this route's URL must be publicly reachable over
  HTTPS (e.g. via a real deployment or a tunnel like ngrok during dev) and
  registered in the Meta App Dashboard, subscribed to the `messages` field.
- A real **`WHATSAPP_VERIFY_TOKEN`** env var matching what's configured in the
  dashboard, so the `GET` handshake below actually authenticates Meta's setup
  request instead of just demonstrating the shape of it.
- Calling the **Media API** to download incoming images/audio using the media
  id + access token, instead of this stub's inline-base64 shortcut.
- Calling the **Send Message API** to actually deliver `wouldSend`'s payloads,
  including handling the **24-hour customer service window** (freeform replies
  only work within 24h of the user's last message; outside that window you
  must use a pre-approved message template).
- Handling **rate limits**, delivery-status webhooks, and retries.
