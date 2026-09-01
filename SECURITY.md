# Security & access control — prototype scope

This is a hackathon prototype (SIH26101). Role-based access control exists in a
lightweight form appropriate for a demo; the items below are **explicitly NOT
implemented** here, only architected for.

## What's implemented

- **Role-based view gating.** Each learner profile (`server/competency/types.ts`,
  `LearnerProfile.role`) carries `'employee' | 'administrator'`. The Admin
  Dashboard nav item is hidden for non-administrators (`src/components/Layout.tsx`),
  and the `/api/dashboard/admin` route itself independently re-checks the
  requester's stored role server-side (`server.ts`) before returning org-wide
  data — so the check isn't just a hidden nav item a user could route around.
- **No real authentication.** There is no login, password, or session token —
  see `server/competency/store.ts`'s header comment. "Switching profile" in
  Learner Profile is a simulated login: pick any profile from a local JSON file
  and the app trusts it completely. `/api/dashboard/admin`'s role check trusts
  a **client-supplied** `requesterId` — it verifies that profile's stored role,
  but nothing stops a request from claiming to be any learner ID at all.

## What a production deployment needs (NOT implemented here)

1. **Real Single Sign-On.** Officials would authenticate via a real government
   identity provider (e.g. iGOT Karmayogi's own SSO, or a SAML/OIDC integration
   with the relevant department's identity system) — not a locally-stored,
   unauthenticated profile record anyone can create or switch into.
2. **Server-side session/token verification.** Every request (not just
   `/api/dashboard/admin`) would need to verify a signed session token or JWT
   against the authenticated identity from SSO, rather than trusting a
   client-supplied learner/requester ID as this prototype does throughout.
3. **Government cybersecurity & data-privacy compliance.** Real deployment
   would need to meet applicable government infosec standards (e.g. CERT-In
   guidelines, empanelled cloud hosting such as MeghRaj) and data-protection
   obligations under India's Digital Personal Data Protection Act, 2023 —
   including proper handling of officials' personal data (the same DPDP Act
   principles the platform teaches as a competency area in `server/competency/taxonomy.ts`
   should apply to the platform's own data, which this prototype does not
   implement: no encryption-at-rest, no audit logging, no data retention policy).
4. **Secure API exchange.** All API calls here run over plain local HTTP with
   no authentication headers, rate limiting, or request signing. A production
   integration with real iGOT Karmayogi / NSSTA APIs (see `WHATSAPP.md`'s
   sibling honesty note in `server/competency/catalogue.ts`) would need proper
   OAuth2/API-key exchange, TLS, and scoped permissions per integration.
5. **Per-user data isolation.** All learner data lives in shared flat JSON
   files (`generated/mospi/*.json`) readable/writable by any request — a real
   deployment needs a real database with row-level access control tied to the
   authenticated identity from #1/#2, not a single shared file every request
   can read and write.

None of the above is simulated or partially implemented — the prototype simply
stops at role-flag gating, exactly as the problem statement allows for a
hackathon submission ("basic role-based access control... a simple role flag on
the profile is sufficient for a prototype").
