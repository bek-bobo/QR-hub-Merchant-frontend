# Frontend Foundations

## Architecture

QRHub Merchant is a React single-page application organized into `app`,
`features`, `shared`, and development-preview modules. Feature modules may use
shared code; shared modules do not depend on feature or development modules.

The UI foundation uses shadcn/Radix components with Tailwind CSS v4 and QRHub
design tokens. TanStack Query's `QueryClient` owns server-state cache lifecycle;
Day 01 uses it only as shared infrastructure and clears it when the synthetic
demo persona changes.

## Runtime and access boundaries

The runtime is fail-closed. Demo code loads only when Vite reports development
mode and `VITE_APP_MODE=demo` is explicitly requested. Every other combination,
including production with that flag, renders the integration-unavailable page.

Frontend capabilities are product-facing abstractions, not copied backend role
or enum names. Anonymous access is denied. Demo access requires both an explicit
demo grant and an `allowDemo` call-site decision. Authenticated access requires
an exact entry in `verifiedAuthorityMap`; that live map is intentionally empty.

The three demo personas and their grants are synthetic review tools. They do
not represent real merchant roles or authority assignments.

## Data and integration limits

The dashboard preview model and seven-row fixture are presentation models, not
backend DTOs. Day 01 implements no token store, live authentication, API client,
response decoder, backend request, or persistence architecture.

The endpoint registry contains inert service-relative descriptors only. Future
live work must use confirmed hosts, envelopes, authority strings, serialization,
and browser transport behavior.

## Seven-day scope

Day 01 establishes the scaffold, design system, runtime/access boundaries,
synthetic dashboard, contract registry, policy tests, and handoff. Days 02–07
remain separate, evidence-driven stages for confirmed authentication and live
contracts, subsequent merchant features, hardening, and final verification.
This document does not authorize or pre-design those stages.
