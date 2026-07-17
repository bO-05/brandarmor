# BrandArmor Design Engineering Audit — v0.5.0

## Scope

This audit applies the decision framework and motion standards from Emil Kowalski’s design-engineering, animation-audit, animation-review, and opportunity-finding skills to BrandArmor’s professional evidence-review workflow.

BrandArmor is a high-attention dashboard, not a consumer marketing surface. The interface should feel calm, reliable, and responsive while leaving evidence and data still enough to inspect.

## Recon

- Stack: Next.js 15, React 19, Tailwind v4, Sonner, Lucide.
- Existing motion: a small hover lift and spinner feedback; no motion library or layout keyframes.
- Product personality: evidence-first, professional, safety-conscious, and intentionally non-accusatory.
- Frequency map: sidebar, workflow navigation, case rows, and score surfaces are high-frequency; demo run, report export, review confirmation, empty states, and provider progress are occasional or rare.

## Applied changes

| Before | After | Why |
| --- | --- | --- |
| Broad hover lift including box-shadow and ungated hover | Fine-pointer-gated hover lift with `transform: translateY(-1px)` and border-color change | Keeps frequent dashboard interaction crisp and avoids false touch hover states. |
| No shared interaction curves or press feedback | Shared strong ease-out token and `.pressable:active { transform: scale(0.97) }` at 160ms | Gives deliberate controls immediate feedback without adding decorative motion. |
| No reduced-motion behavior | Reduced-motion branch keeps feedback but removes movement transforms | Preserves state indication while respecting user motion settings. |
| One opaque long-running demo request | Staged core and judge progress with live status, elapsed time, and a bounded fallback explanation | Motion and progress now explain real work rather than disguising a hang. |
| Horizontally clipped mobile navigation and dense workflow trail | Two-column mobile navigation and compact two-column workflow trail | Removes overflow and makes high-frequency navigation easier to scan. |
| Review suggestion button presented in a saturated danger treatment | Bordered evidence-risk treatment plus explicit confirmation gate | A review recommendation remains serious without visually implying a final decision. |

## Deliberately rejected animation candidates

- Sidebar route transitions: rejected. Primary navigation is high frequency; animated route changes would make routine use feel slower.
- Score bars or evidence charts: rejected. Functional evidence and metrics should not move for decoration.
- Evidence-record stagger on every load: rejected. Reviewers may revisit lists often; decoration would reduce scan speed.
- Pulsing risk badges: rejected. Persistent motion would create urgency without adding evidence.
- Animated review-label confirmation: rejected. The existing explicit confirmation state is clearer and safer than a celebratory transition.

## High-confidence opportunities retained

- Button press feedback: feedback purpose, frequent but near-imperceptible at 160ms.
- Demo stage transition and visible progress: state indication and prevention of a jarring change, occasional use.
- Compact content disclosure expansion: no custom animation until a real interaction test shows that movement improves comprehension.

## Validation checklist

- Verify controls remain usable with `prefers-reduced-motion` enabled.
- Verify keyboard focus rings remain visible across dashboard, demo, listing, report, and review actions.
- Review mobile navigation at 390px and desktop at 1440px.
- Test the demo stage labels while providers are fast, slow, and falling back.
- Do not add motion to evidence scores, table values, high-frequency navigation, or any action initiated from a keyboard shortcut.
