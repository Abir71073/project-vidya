# WhatsApp channel — working backend stub, not a live integration

This project includes a backend implementation of a "solve a doubt over
WhatsApp" flow: an Express route shaped exactly like a real **WhatsApp Cloud
API** webhook, reusing the exact same `solveDoubt()` pipeline the web app's
Doubt Solver uses. It is **not connected to a real WhatsApp Business account,
phone number, or Meta API** — no message sent through it ever reaches a real
phone.

## Try it

```bash
npm run dev
```

Then open **`http://localhost:3000/whatsapp-demo`** — a small chat-style page
that lets you type a doubt or attach a photo of one, "sends" it through the
same webhook code path a real WhatsApp message would take, and renders the
reply as chat bubbles (including a playable voice-note-style audio reply).

You can also hit the webhook directly with a real WhatsApp Cloud API-shaped
payload:

```bash
curl -X POST http://localhost:3000/api/whatsapp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "0",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "display_phone_number": "15550001111", "phone_number_id": "1234567890" },
          "contacts": [{ "profile": { "name": "Test User" }, "wa_id": "919999999999" }],
          "messages": [{
            "from": "919999999999",
            "id": "wamid.TEST1",
            "timestamp": "1735142400",
            "type": "text",
            "text": { "body": "Solve for x: 2x + 5 = 15" }
          }]
        }
      }]
    }]
  }'
```

The response's `wouldSend` field is exactly the message payload(s) a live
integration would have POSTed to WhatsApp's Send Message API — a text
message with the worked explanation, and (when TTS is available) an audio
message pointing at a generated voice note.

## Website entry point

A floating WhatsApp button (bottom-right on every page, see
`src/components/WhatsAppButton.tsx`) opens a **wa.me deep link** —
`https://wa.me/<number>?text=<starter message>` — which simply opens the
visitor's own WhatsApp app with a chat pre-loaded to that number and an
optional pre-filled message. It never sends anything itself; the visitor
still has to hit Send.

**This is intentionally not wired to a live number by default.** There is no
Meta-approved WhatsApp Business number (or even a Cloud API sandbox test
number) connected to this project's webhook yet, so until you set
`VITE_WHATSAPP_NUMBER` in `.env` (see `.env.example`), the button renders
visibly disabled (grey, "not connected yet" tooltip) instead of linking to a
number nobody is listening on. Set that env var — even to a free sandbox test
number from the checklist below — and restart the dev server to make it live.

Multilingual support carries through this channel the same way it does the
`POST /api/whatsapp-webhook` route itself: a Hindi or Bengali message gets a
Hindi or Bengali reply, via lightweight Unicode-script detection on the
incoming text feeding into the exact same `language` pass-through
`solveDoubt()` already uses to lock the website's Gemini responses into the
header's ENG/HIN/BEN selection (see `detectLanguage()` in
`server/whatsapp/handleWebhook.ts`). There's no language picker in WhatsApp
itself, so detection is the only option; an image-only message can't be
detected before OCR runs, so it falls back to English.

## What's real vs. stubbed

**Real:**
- The `GET /api/whatsapp-webhook` verification handshake matches the real
  Meta handshake shape (`hub.mode` / `hub.verify_token` / `hub.challenge`).
- The `POST /api/whatsapp-webhook` payload parsing matches the real WhatsApp
  Cloud API webhook shape (`entry[].changes[].value.messages[]`).
- The doubt-solving itself is the real pipeline — same Gemini vision/reasoning
  call, same symbolic answer verification, same code as `/api/solve-doubt`.
  Nothing here is mocked or hardcoded.
- The outbound reply is shaped exactly like a real WhatsApp Send Message API
  payload (`messaging_product`, `to`, `type`, `text`/`audio`).
- Reply language is auto-detected from the incoming message's script and
  locked in via the same mechanism the website uses.

**Stubbed (see `server/whatsapp/handleWebhook.ts` and
`server/whatsapp/README.md` for the code-level detail):**
- **Incoming media download.** A real WhatsApp image message only carries a
  `media id`; a live integration must call Meta's Graph API to fetch the
  actual image bytes with an access token. This stub skips that round trip —
  it expects the image bytes inline as base64 in the payload.
- **Actually sending the reply.** A live integration POSTs `wouldSend`'s
  payloads to `https://graph.facebook.com/v19.0/{phone-number-id}/messages`.
  This stub has no real credentials to call that, so it returns what would
  have been sent instead of sending it.

## How to make this live for demo day (WhatsApp Cloud API sandbox — free)

Full business verification (below) can take days, which doesn't help before
a demo. Meta's Cloud API gives every developer app a **free test number**
that can send/receive real messages with up to **5 verified recipient
numbers**, with no business verification required. This is enough to show
this project actually working end-to-end over real WhatsApp. Verified against
Meta's current [Get Started guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/)
as of writing:

1. Go to the [Meta App Dashboard](https://developers.facebook.com/apps) →
   **Create App** → choose the **"Connect with customers through WhatsApp"**
   use case (this is a personal/dev Meta account, not a business one — no
   business verification happens at this step).
2. In the app's **WhatsApp → API Setup** page, link (or create) a WhatsApp
   Business Account. Meta automatically provisions a **free test phone
   number** here — this is what `VITE_WHATSAPP_NUMBER` should point to.
3. On the same page, click **Generate access token** for a temporary token
   (valid ~24h — regenerate it the morning of the demo).
4. Under the **To** field, click **Manage phone number list** and add up to
   **5 real phone numbers** (yours, teammates', a demo device) — each
   receives a WhatsApp message with a verification code; enter it to
   authorize that number as a test recipient.
5. Sanity-check the sandbox itself with the curl command Meta's API Setup
   page provides (it's pre-filled with your test number ID and token) — you
   should receive a WhatsApp message on one of the 5 numbers.
6. Set this project's `VITE_WHATSAPP_NUMBER` to the test number from step 2
   (digits only, no `+`) and restart `npm run dev` — the site's floating
   button goes live.
7. Expose this server's `/api/whatsapp-webhook` publicly (e.g.
   `ngrok http 3000`), then in **WhatsApp → Configuration** register that
   HTTPS URL as the webhook callback, set a **Verify token** matching this
   project's `WHATSAPP_VERIFY_TOKEN`, and subscribe to the **`messages`**
   field. Meta calls the `GET` handshake immediately — a success here means
   `extractIncomingMessage()`/`handleIncomingDoubt()` in
   `server/whatsapp/handleWebhook.ts` are now reachable from a real
   WhatsApp message.
8. From one of the 5 verified test numbers, send a real WhatsApp message
   (text or a photo of a doubt) to the sandbox number — it should arrive at
   your webhook and a real reply should come back through WhatsApp.

This gets you a real, live, working demo without waiting on Meta's business
approval — but it's still capped at those 5 test numbers and the temporary
token, so it isn't production-ready. For that, see the full checklist below.

## Concrete next steps to go live (full production)

Going from the sandbox above to a production-ready WhatsApp integration
requires, in order:

1. **A Meta Business Platform developer account** and a **WhatsApp Business
   Account**, created via [developers.facebook.com](https://developers.facebook.com/).
   App review/approval for WhatsApp Business API access can take **several
   days**.
2. **A verified business phone number** attached to that WhatsApp Business
   Account (Meta's free test numbers work for development but expire and
   are limited to a handful of recipient numbers).
3. **A permanent System User access token** (not a 24-hour user token) with
   the `whatsapp_business_messaging` permission, stored as a server secret —
   never in source control.
4. **A publicly reachable HTTPS URL** for this webhook (a real deployment,
   or a tunnel like `ngrok` during development), registered in the Meta App
   Dashboard and subscribed to the `messages` webhook field, using a real
   `WHATSAPP_VERIFY_TOKEN` that matches what's configured there.
5. Replace the inline-base64 image shortcut with a real call to the
   **Media API** (`GET /v19.0/{media-id}`) to download incoming images using
   the access token from step 3.
6. Replace `wouldSend`'s return value with a real call to the
   **Send Message API**, including handling the **24-hour customer service
   window** (freeform replies only work within 24h of the user's last
   message; outside that window a pre-approved message template is
   required).
7. Handle WhatsApp's rate limits, delivery-status webhooks, and retries.

None of this is implemented — the code above only reaches step 0 (proving
the doubt-solving logic and message shapes are correct). Each step above is
a real external dependency (Meta approval, a verified phone number, a public
HTTPS endpoint) that can't be simulated locally.
