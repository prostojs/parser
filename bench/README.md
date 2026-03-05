# Benchmarks

Performance comparison between `@prostojs/parser` (xml-json example) and `fast-xml-parser`.

## Reproducing Results

```sh
# From the repo root
pnpm install
cd bench
pnpm bench
```

This runs `tsx bench.ts` which uses [mitata](https://github.com/evanwashere/mitata) for benchmarking.

## Methodology

- **Tool**: mitata microbenchmark library (statistical, warmup-included, with p75/p99 reporting)
- **Parser config**: Both parsers are configured identically — no attribute prefix, trimValues off, CDATA and comments preserved, entity decoding enabled
- **What is measured**: Full parse of an XML string to a JSON object. No I/O — pure in-memory parsing
- **Documents**: Four synthetic XML documents of increasing size and complexity:
  - **Small** (~169 chars) — a simple `<note>` with 4 child elements
  - **Medium** (~18 KB) — 50 `<book>` elements with attributes, nested tags, and entities
  - **Large** (~200 KB) — 200 `<product>` elements with CDATA, comments, namespaces, deeply nested pricing/specs/tags
  - **Deeply nested** (~32 KB) — 4 nesting levels (10 x 5 x 3 leaves), each with 3 attributes

## Context

`@prostojs/parser` is a **general-purpose** parser toolkit — the same `Node` / `parse()` API can be used for any token-based format (XML, JSON, config files, DSLs, etc.). It is not hand-optimized for XML.

`fast-xml-parser` is a mature, dedicated XML parser with years of XML-specific optimizations.

Given this, being within 4-36% of a dedicated parser is a good result for a general-purpose toolkit. The gap is smallest on large flat documents (1.04x) and largest on deeply nested structures (1.36x).
