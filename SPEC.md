# EngineeringSpec 0.1 Draft Specification

This document is normative together with `schemas/engineering-spec-0.1.schema.json` and the conformance fixtures. The key words MUST, MUST NOT, SHOULD, and MAY are interpreted as requirements.

## Purpose and representations

An EngineeringSpec is a versioned change contract linking source intent, targets, authoritative technical contracts, constraints, proof obligations, rollout controls, and evidence. Markdown with YAML frontmatter and named YAML code blocks is the authoring representation. Canonical JSON is the machine representation.

Processors MUST use a CommonMark-compatible AST, preserve prose, retain diagnostic source locations, reject duplicate recognized blocks, and preserve unknown namespaced blocks named `engineering-x-<organization>-<name>`. They MUST NOT execute content during parsing or validation.

## Document

Recognized names are `ENGINEERING_SPEC.md`, `*.engineering-spec.md`, and `*.engineeringspec.md`. Frontmatter fields and normalized model members are defined by the JSON Schema. Version 0.1 requires source refs, targets, verification, and at least one contracts or constraints block. Every recognized block occurs at most once.

IDs are case-sensitive, document-wide unique, and match `^[A-Z][A-Z0-9]*-[A-Za-z0-9][A-Za-z0-9._-]*$`. Standard prefixes are `ES-`, `SRC-`, `TARGET-`, `DEC-`, `CONTRACT-`, `CON-`, `VER-`, `EVIDENCE-`, and `EXC-`. External ProductSpec IDs are exempt.

All local paths MUST be relative, MUST NOT be drive-qualified or absolute, and MUST NOT escape the repository root. Technical definitions are referenced through mature formats rather than embedded mini-languages.

## Verification and security

A verifier's `proves` array identifies source or engineering obligations. Command runners use an argv array, default to network denial, and remain inert. Human review uses manual or reference runners. AI evaluations reference a definition or external runner.

Input limits are 2 MiB per file, 512 KiB per structured block, YAML depth 50, and 10,000 items per block. YAML object construction, executable tags, unsafe prototype keys, and expansion attacks are rejected.

## ProductSpec profile

The optional `{name: productspec, version: "0.1"}` profile resolves local ProductSpec documents offline and checks revisions, SHA-256 digests, and `AC-*`, `EVAL-*`, and `SM-*` item IDs. Unavailable sources warn by default and error under strict external validation. Product requirements are not copied into the normalized model.

## Canonicalization and compatibility

Authoring snake_case keys map to camelCase. Canonical JSON sorts object keys, preserves array order, normalizes prose line endings, adds defined safety defaults, excludes source locations unless requested, and never adds timestamps. SHA-256 digests cover canonical JSON bytes.

Before 1.0, patches fix implementations, minors add compatible fields or behavior, and breaking draft changes are prominent. Unsupported format versions are rejected; package versions never act as document revisions.
