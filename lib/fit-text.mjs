import * as opentypeModule from "opentype.js";

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;

const ELLIPSIS = "…";

/**
 * Create a text fitter bound to the fonts used for rendering.
 *
 * `fonts` is the same array passed to ImageResponse:
 * [{ name, data, weight, style }]
 */
export function createTextFitter(fonts) {
  const parsed = fonts.map((f) => ({
    name: f.name,
    weight: f.weight,
    font: opentype.parse(toArrayBuffer(f.data)),
  }));

  function findFont(fontFamily, fontWeight) {
    const family = parsed.filter((f) => f.name === fontFamily);
    const candidates = family.length ? family : parsed;
    // Closest weight wins, like the renderer does
    return candidates.reduce((best, f) =>
      Math.abs(f.weight - fontWeight) < Math.abs(best.weight - fontWeight) ? f : best
    ).font;
  }

  function measure(font, text, fontSize, letterSpacing) {
    return font.getAdvanceWidth(text, fontSize, { kerning: true })
      + letterSpacing * fontSize * [...text].length;
  }

  // Greedy word wrap, matching how the renderer breaks lines.
  // Returns the lines, or null if a single word is wider than maxWidth.
  function wrap(font, words, fontSize, letterSpacing, maxWidth) {
    const lines = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measure(font, candidate, fontSize, letterSpacing) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (measure(font, word, fontSize, letterSpacing) > maxWidth) return null;
      lines.push(current);
      current = word;
    }
    if (current) lines.push(current);
    return lines;
  }

  /**
   * Find the largest font size (between minFontSize and maxFontSize) at which
   * `text` wraps into at most `maxLines` lines of `maxWidth` pixels.
   *
   * If the text doesn't fit even at minFontSize, it is truncated with an
   * ellipsis so it never grows past maxLines.
   *
   * Returns { fontSize, text, truncated } — use fontSize and text in the layout.
   */
  return function fitText(text, {
    maxWidth,
    maxLines,
    maxFontSize,
    minFontSize = maxFontSize,
    fontFamily = "Figtree",
    fontWeight = 400,
    letterSpacing = 0, // in em, same as the CSS value
    uppercase = false,
  }) {
    if (!text) return { fontSize: maxFontSize, text, truncated: false };

    const font = findFont(fontFamily, fontWeight);
    const measured = uppercase ? text.toUpperCase() : text;
    const words = measured.split(/\s+/).filter(Boolean);
    // Small safety margin so rounding in the renderer never causes an extra wrap
    const width = maxWidth * 0.98;

    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
      const lines = wrap(font, words, fontSize, letterSpacing, width);
      if (lines && lines.length <= maxLines) return { fontSize, text, truncated: false };
    }

    // Still too long at the smallest size: drop words until it fits
    const originalWords = text.split(/\s+/).filter(Boolean);
    for (let count = originalWords.length - 1; count > 0; count--) {
      const truncated = originalWords.slice(0, count).join(" ").replace(/[\s.,;:!?–—-]+$/, "") + ELLIPSIS;
      const truncatedWords = (uppercase ? truncated.toUpperCase() : truncated).split(/\s+/);
      const lines = wrap(font, truncatedWords, minFontSize, letterSpacing, width);
      if (lines && lines.length <= maxLines) return { fontSize: minFontSize, text: truncated, truncated: true };
    }

    return { fontSize: minFontSize, text: originalWords[0] || text, truncated: true };
  };
}

function toArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}
