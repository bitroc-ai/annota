The issue is that the footer and header on the homepage have inconsistent horizontal padding/width.

1.  **Footer**:
    *   Currently uses `container mx-auto px-6`.
    *   This provides a centered container with a max-width (e.g., 1280px at xl) and 24px padding on the sides.

2.  **Header (Homepage)**:
    *   Uses Starlight's default header, which might have different internal padding or max-width constraints compared to the custom `container` class used in the footer.
    *   In Starlight, the header content is usually constrained by `--sl-content-width`.

3.  **Goal**: Align them visually. The standard "container" look usually implies a max-width and centered alignment.

**Plan:**

1.  **Update `docs/src/styles/custom.css`**:
    *   Target the internal container of the Starlight header to match the `container mx-auto px-6` logic.
    *   The Starlight header usually has a `.header` class. We need to ensure its inner content matches the width of the footer.
    *   However, modifying Starlight's internal DOM structure via CSS is tricky. A better approach is often to ensure the *Footer* matches Starlight's layout, OR enforce a standard max-width on the header's inner content.
    *   Starlight uses `--sl-content-width` (typically ~60-70rem or similar). The Tailwind `container` class at `xl` is `1280px` (80rem).
    *   I will adjust the **Footer** to match the Header's layout logic, which is generally safer in Starlight sites, OR force the Header to expand. Given the request "make them consistent", and "homepage" context, usually users want the "wide" container look.
    *   I will inspect `docs/src/components/header.astro` and `custom.css` to force the header content to align with the `container` width.

2.  **Specific Action**:
    *   Update `docs/src/styles/custom.css` to constrain the header content width.
    *   Update `docs/src/lib/components/landing/footer.svelte` to ensure it strictly follows the same width constraints.

**Implementation Details**:
I'll update `docs/src/styles/custom.css` to apply a consistent max-width to the header's content area, matching the footer's `container` class.

*   **Header**: `header.header > :first-child` (or similar internal wrapper) -> `max-width: 1280px; margin: 0 auto; padding-inline: 1.5rem;`
*   **Footer**: Already has `container mx-auto px-6`.

I will apply a CSS fix to `docs/src/styles/custom.css` to align the Starlight header's inner content with the standard container width used in the footer.

**Proposed Changes**:
1.  Modify `docs/src/styles/custom.css` to override Starlight's header layout.
    ```css
    header.header {
      /* Remove default constraints if any */
      max-width: 100% !important;
    }
    
    /* Target the inner wrapper of Starlight's header */
    header.header > div { 
      max-width: 1280px !important; /* Tailwind 'container' at xl */
      margin: 0 auto !important;
      padding-inline: 1.5rem !important; /* px-6 */
      width: 100% !important;
    }
    ```
2.  Verify `docs/src/lib/components/landing/footer.svelte` matches this (it does: `container mx-auto px-6`).

This ensures both snap to the same max-width and have the same horizontal padding.