# Development contract snapshot

This is a checksum-pinned **unreleased draft**, copied from the sibling backend checkout at development kickoff. The intended wire version is `1.0.0`; no immutable backend contract release exists yet. It is suitable for local implementation and validation, and must not be described as a released dependency or used to claim release readiness.

`manifest.json` pins the OpenAPI 3.1.2 source, public operation response fixtures, two error fixtures, and shared Markdown fixtures. Run `node scripts/contract-check.mjs` to verify those bytes. TypeScript consumers are generated from this local source with `openapi-typescript`, never from a running API.

Before shipping, replace this development snapshot through an explicit reviewed dependency update with a verified immutable package, its mock/source checksums, compatibility evidence, generated types, and fixture changes. Updating a checksum alone is not contract review.
