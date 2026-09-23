/**
 * Which set of colours the dark theme uses.
 *
 * "space" is the current one, near-black with blue, matching the sign-in
 * page. "classic" is the palette the site had before, neutral greys with a
 * green accent, kept for whoever preferred it. Light mode is the same either
 * way, so this sits beside the light/dark choice rather than replacing it.
 *
 * Read and written straight to the document and to localStorage rather than
 * through a context: one attribute on <html>, which the stylesheet does the
 * rest with.
 */
export type Palette = "space" | "classic";

export const PALETTE_STORAGE_KEY = "42insight:palette";

export const readPalette = (): Palette => {
  if (typeof window === "undefined") return "space";
  try {
    return window.localStorage.getItem(PALETTE_STORAGE_KEY) === "classic"
      ? "classic"
      : "space";
  } catch {
    // Private browsing, or storage refused.
    return "space";
  }
};

export const applyPalette = (palette: Palette): void => {
  if (typeof document === "undefined") return;

  if (palette === "classic") {
    document.documentElement.setAttribute("data-palette", "classic");
  } else {
    document.documentElement.removeAttribute("data-palette");
  }

  try {
    window.localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  } catch {
    // Not remembering it is a smaller failure than not honouring it.
  }
};
