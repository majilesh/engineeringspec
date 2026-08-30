# EngineeringSpec brand guide

**Status:** public mark-first identity for the 0.1 release candidate<br>
**Project home:** https://github.com/majilesh/engineeringspec<br>
**Site:** https://engineeringspec.org

## Positioning

> **Change authority for AI coding agents.**<br>
> Reviewed authority before code. Final-diff verification after.

EngineeringSpec records bounded repository change authority in a reviewed contract on the trusted Git base, exposes that authority to agents before implementation, and compares the complete final Git state with it afterward.

It complements prompts, repository context, testing, and review. It does not claim to analyse a whole architecture, detect every duplicate component, generate designs, implement changes, execute declared verifiers, or prove correctness, security, quality, productivity, or safety.

## Identity

- Primary: hexagonal document/check/rails mark plus outlined EngineeringSpec wordmark.
- Use the horizontal lockup in navigation and README headers.
- Use the mark alone for favicons and avatars.
- Never recolour, rotate, stretch, shadow, or reconstruct the mark.
- Do not use a mascot, AI-generated lockup, or wombat as the default public or GitHub identity.
- Keep the project under `majilesh/engineeringspec` until a separately reviewed migration is justified.

## Colour

| Token | Hex | Role |
|---|---|---|
| Forest | `#1E3A2F` | Primary identity, headings, dark surfaces, primary actions |
| Moss | `#4F6B5A` | Supporting text and fills |
| Sage | `#A7B3A9` | Quiet dividers and muted elements |
| Stone | `#D6D8D1` | Borders and disabled states |
| Cloud | `#F4F6F4` | Default canvas |
| Ink | `#12211B` | Body text on light surfaces |
| Paper | `#FFFFFF` | Card and maximum-contrast surface |
| Signal Mint | `#62D6C2` | Verification cue on Forest and other dark surfaces |
| Signal Mint Dark | `#1F6F62` | Accessible verification cue on Cloud or Paper |

Mint is a controlled verification and interaction signal. It is not a second primary brand colour, must not recolour the logo, and must not automatically mean generic success.

Verified contrast examples: Ink on Cloud 15.36:1, Forest on Cloud 11.36:1, Mint on Forest 7.0:1, and Mint Dark on Cloud 5.51:1.

## Typography

- **Sora 600–800:** display, product name, and headings.
- **Inter 400–700:** body, navigation, labels, and interface text.
- **System monospace:** code and identifiers.
- Website fonts are local WOFF2 subsets with `font-display: swap`; no third-party font request is required.

## Voice

Use precise, calm, engineering-led language. Explain the control boundary before product mechanics. Keep release-candidate and evidence limitations visible. Never invent customers, traction, adoption, enterprise maturity, Hacker News performance, star growth, or causal impact.

Preferred explanation:

> Prompts express intent. Context informs implementation. Trusted checks assess the result. Authority records what the agent was allowed to change.

## Icons

The 512px maskable icon is an opaque, full-bleed Forest tile with the mark inside the safe region and no baked rounded rectangle. Keep transparent 32px and 48px favicons as primary small exports; 16px is compatibility fallback only.
