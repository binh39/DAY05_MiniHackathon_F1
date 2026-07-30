# Module 1 Evaluation — Lecture-02-Process.pdf

## Run information

- Input: `inputs/Lecture-02-Process.pdf`
- Size: 4,081,380 bytes
- Pages: 45
- SHA-256:
  `8f10c9cf13bee629a5a0b50218d5cb53982378de4174d431770abcc2ac3eca67`
- Model: `gemini-3.5-flash`
- Location: `global`
- Successful uncached run: `2026-07-30T05-07-19-767Z`
- Cache verification run: `2026-07-30T05-10-01-421Z`

## Structural results

| Metric | Result |
|---|---:|
| Page records | 45/45 |
| Sources | 50 |
| Sections | 4 |
| Pages without source | 0 |
| Duplicate source IDs | 0 |
| Sources unused by page records | 0 |
| Sources unused by sections | 0 |
| Missing page images | 0 |
| Missing thumbnails | 0 |

Source types:

| Type | Count |
|---|---:|
| TEXT | 28 |
| DIAGRAM | 11 |
| IMAGE | 6 |
| CODE | 5 |

Reported confidence:

- Minimum: 0.85
- Median: 0.95
- Sources below 0.80: 0

Model confidence is self-reported and must not be treated as calibrated
probability.

## Section assessment

| Section | Pages | Assessment |
|---|---:|---|
| Khái niệm cơ bản về Tiến trình | 1–19 | Correctly covers introductory concepts, process state and PCB |
| Lập lịch Tiến trình và Chuyển ngữ cảnh | 20–25 | Boundary matches the agenda transition on page 20 |
| Các thao tác trên Tiến trình | 26–35 | Boundary matches the agenda transition on page 26 |
| Thực hành và Minh họa Mã nguồn C | 36–45 | Correctly groups the fork/code examples |

The four section boundaries match the visible structure of the lecture deck.
The generated title, “Nguyên lý hệ điều hành - Tiến trình”, is more specific
than the generic cover title and is supported by the document content.

## Warning assessment

- Global warnings: none.
- Page 11: small text in a system-monitor screenshot.
- Page 12: small text in a screenshot.

The page 11 warning was manually checked against the rendered page and is
appropriate. No warning was generated for the code screenshot on page 36;
the code is sufficiently legible at the rendered resolution.

## Rendering and cache

- Full page PNGs: 45.
- Thumbnail PNGs: 45.
- First successful Gemini call: approximately 65.9 seconds.
- Total uncached pipeline attempt including page rendering: approximately
  84 seconds.
- Cached Module 1 rerun: approximately 2.8 seconds.
- The cached rerun reported both `Document analysis cache hit` and
  `Page asset cache hit`.

## Validation behavior

The first baseline run was rejected because Gemini referenced `p16_e2`,
`p18_e2`, and `p29_e2` while the registry used zero-padded IDs. Module 1 now
canonicalizes equivalent IDs such as `p16_e2 → p16_e02` before consistency
validation. Unknown IDs are still rejected.

## Known limitations

1. Most pages are represented by one large source element. This is sufficient
   for Module 2 planning but not yet precise enough for complex crop/highlight
   behavior in Module 4/5A.
2. Bounding boxes and element-level reading order are not implemented.
3. PDF.js emitted two non-fatal font-function warnings during rendering.
4. Retry is implemented for provider/schema/consistency failures, but provider
   timeout and rate-limit behavior still need a mocked automated test.
5. MIME validation must be added at the future HTTP upload boundary.

## Verdict

Module 1 is ready to provide page-level input to Module 2 for this representative
45-page lecture. Before visual crop/highlight work, add bounding boxes or a
layout extraction provider for complex pages.
