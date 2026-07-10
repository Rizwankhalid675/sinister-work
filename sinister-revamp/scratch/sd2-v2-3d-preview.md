# Sinister Diesel V2 3D Preview

Companion documentation for [`sd2-v2-3d-preview.html`](./sd2-v2-3d-preview.html).

## Status and purpose

This file is a standalone creative prototype for the high-intensity, “full showpiece” 3D direction. It demonstrates motion and depth ideas before they are adapted to the production V2 system.

- It is a scratch preview, not a Miva template.
- It is not loaded by the storefront and must not be deployed as-is.
- Its sample products, prices, categories, statistics, links, and menu content are placeholders.
- The base `--sd2-*` values are copied from `css/sd2-global.css`; the 3D tokens and utilities are implementation drafts.
- Production work must continue to follow `V2_CONSTITUTION.md` and the canonical component rules in `V2_STRUCTURE.md`.

## Viewing the preview

Open `scratch/sd2-v2-3d-preview.html` in a modern browser. The page can run directly from the filesystem; no build step or local server is required. Google Fonts require a network connection, but the interaction demo still functions if they do not load.

For the complete experience, use a fine-pointer device such as a mouse or trackpad. Touch/coarse-pointer devices intentionally receive a static presentation.

## Experience inventory

| Area | Demonstrated behavior |
| --- | --- |
| Hero | Layered perspective scene, scroll parallax, pointer-following spotlight, animated grid/scan/glow, and a rotating CSS part rig |
| Product cards | Pointer tilt, Z-axis lift, glare tracking, and staggered entrance |
| Statistics | One-time count-up animation when the section enters the viewport |
| Category tiles | Pointer tilt, glare, depth-separated background and label |
| Mega-menu demo | Button-controlled panel with a perspective reveal |
| Page sections | Intersection-observer reveal and stagger effects |

## Draft design vocabulary

The preview proposes the following additions for later review, not automatic adoption:

- Depth tokens: `--sd2-perspective`, `--sd2-perspective-near`, `--sd2-tilt-max`, and `--sd2-lift-z`.
- Scene primitives: `.sd2-3d-scene` and `.sd2-3d-layer`.
- Interactive surfaces: `.sd2-3d-tilt` and `.sd2-3d-glare`.
- Entrance motion: `.sd2-reveal` and `.sd2-stagger`.
- Declarative JS hooks: `data-v2-tilt`, `data-v2-parallax`, `data-v2-depth`, `data-v2-spotlight`, and `data-v2-count-to`.

`data-v2-depth` is a signed numeric layer depth. Positive values move a layer toward the viewer; negative values place it behind the scene plane.

## JavaScript modules

The inline script is organized as small self-initializing modules:

1. **Tilt and glare** calculates pointer position, writes rotation/glare CSS properties, and batches visual updates with `requestAnimationFrame`.
2. **Parallax and reveal** observes reveal elements and updates scene layers during scroll and resize.
3. **Hero spotlight** maps pointer position to the hero spotlight coordinates.
4. **Count-up** animates each statistic once when it becomes visible.
5. **Mega-menu demo** toggles the preview panel; it is only a visual affordance and is not the production navigation controller.

Modules fail closed when their root hook is absent. Tilt-enabled elements are marked through `dataset` to avoid duplicate initialization.

## Accessibility and input behavior

- `prefers-reduced-motion: reduce` removes 3D transforms, parallax, animated decoration, stagger/reveal movement, glare, and nonessential transitions.
- Count-up values resolve immediately when reduced motion is enabled.
- Tilt and spotlight modules do not initialize for coarse pointers, leaving touch users with stable content.
- Scroll and pointer work is scheduled with `requestAnimationFrame`; scroll listeners are passive.
- The mega-menu button works with keyboard activation, but this preview does not implement production menu semantics such as `aria-expanded`, focus management, Escape handling, or outside-click dismissal.

## Production porting rules

Do not copy the entire HTML, `<style>`, or `<script>` blocks into a live Miva template. Port only approved primitives through the established component architecture:

1. Review and approve the proposed tokens against the existing global design system.
2. Move accepted shared CSS into `css/sd2-global.css`; do not fork existing token values.
3. Move accepted behavior into guarded modules in `js/sd2-v2-components.js`.
4. Apply hooks to canonical Miva partials and templates instead of duplicating product cards, menus, or other components.
5. Replace all placeholder copy, links, prices, statistics, and media with confirmed Miva or production content.
6. Keep reduced-motion and coarse-pointer branches with every ported effect.
7. Stage the work on inactive/copied test pages and review it before any live assignment.

## QA checklist

- Verify desktop behavior with mouse and keyboard at common laptop and wide-screen sizes.
- Verify touch behavior on phone and tablet; no tilt or pointer spotlight should be required to understand or use the page.
- Enable the operating system’s Reduce Motion setting and confirm that all content is immediately visible and stable.
- Confirm that keyboard focus remains visible and that interactive elements have production-ready names and states after porting.
- Check Chrome, Edge, Firefox, and Safari for perspective, `transform-style`, glare blending, and animation differences.
- Profile scroll and pointer performance on mid-range hardware before raising the effect intensity.
- Test without `IntersectionObserver`; reveal content and counters must remain available.
- Confirm production values and destinations for every statistic, CTA, product, category, and menu link.

## Known prototype limitations

- The four-face hero rig is an abstract CSS stand-in, not production product media.
- Placeholder `href="#"` links are intentionally nonfunctional.
- The mega-menu demo lacks full navigation accessibility and application state handling.
- Inline CSS and JavaScript are acceptable for this isolated scratch artifact only.
- The “showpiece” intensity is an exploration baseline; production motion should be tuned per component and performance budget.
