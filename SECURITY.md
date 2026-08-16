# Security

## Threat model

ListCollab has no accounts. Capability tokens are the authorisation model, so token handling, event scoping, and enumeration resistance are the security-critical surfaces.

Primary threats:

- token guessing or route enumeration against event reads
- cross-event IDOR on items, categories, participants, or assignments
- stored XSS in names, notes, or item text
- privilege escalation from share token to organiser capability
- credential or token leakage through logs, git history, or error responses

## Controls in the shipped app

- every event-scoped route resolves `req.event` from `X-Event-Token`
- admin-only writes require the admin token path in middleware and service checks
- invalid, malformed, and unknown tokens converge on `404 EVENT_NOT_FOUND`
- row ownership is checked before every write to prevent cross-event IDOR
- all request bodies are validated with strict Zod schemas from `@listcollab/shared`
- item text and notes render as text nodes only; `dangerouslySetInnerHTML` is not used
- request logging redacts `X-Event-Token` and cookies
- production errors return generic envelopes with `requestId`
- the web response ships a restrictive CSP with the single exception `style-src 'unsafe-inline'` for MUI emotion styles

## Token capability model

- share token: short URL-safe token used in `/e/:shareToken`
- admin token: long organiser token used only in `/manage#k=...`
- tokens are generated with `crypto.randomBytes`
- equal-length token comparison uses `crypto.timingSafeEqual`
- the admin token is stored only in browser session storage after the manage URL fragment is read and stripped

## Accepted trade-offs

### Plaintext admin tokens in the database

This app intentionally stores admin tokens in plaintext so an organiser link can be recovered after it is lost. Revisit this decision if any of the following changes:

- the app is exposed beyond the trusted homelab and friend-group use case
- the database host stops being private to the Docker network or homelab
- recovery can instead be handled by a user account or one-time reissue flow

The upgrade path is to store `sha256(admin_token)` and surface the token only once at creation.

### Weak participant identity

Participants identify themselves with a display name persisted in local storage for the current event. This is enough for low-stakes coordination but not for auditability or malicious-user resistance. Revisit this decision if:

- users need non-repudiation or moderation
- the app is opened to people outside a trusted group
- organiser workflows require stronger identity binding than display-name claims

## Git-history credential note

Early repository history included committed env files. Those credentials were treated as compromised and rotated during the rebuild. No value that appeared in git history should be reused in production.

## Current deployment posture

- web container bound to localhost only
- reverse proxy expected to enforce HTTPS and HSTS
- CORS restricted to the configured production origin
- database not published to the host or LAN in `docker-compose.prod.yml`
- backup output directed outside the repository