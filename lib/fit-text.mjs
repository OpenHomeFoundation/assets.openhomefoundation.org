import * as opentypeModule from "opentype.js";

const opentype = opentypeModule.parse ? opentypeModule : opentypeModule.default;

const ELLIPSIS = "…";
const TRAILING_PUNCTUATION = /[\s.,;:!?–—-]+$/;

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
    // At most maxLines lines of maxWidth can ever be shown, so cap the input
    // and each word (assuming glyphs are at least 0.15em wide) to keep
    // measuring cheap. Anything cut here would overflow and be truncated anyway.
    const lineChars = Math.ceil(maxWidth / (minFontSize * 0.15));
    const words = text.slice(0, lineChars * maxLines).split(/\s+/).filter(Boolean)
      .map((word) => word.slice(0, lineChars));
    // Small safety margin so rounding in the renderer never causes an extra wrap
    const width = maxWidth * 0.98;

    const fitsAt = (fontSize) => (str) => {
      const s = uppercase ? str.toUpperCase() : str;
      return font.getAdvanceWidth(s, fontSize, { kerning: true })
        + letterSpacing * fontSize * [...s].length <= width;
    };

    for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize--) {
      if (wrapsWithin(words, fitsAt(fontSize), maxLines)) {
        return { fontSize, text, truncated: false };
      }
    }

    return {
      fontSize: minFontSize,
      text: truncate(words, fitsAt(minFontSize), maxLines),
      truncated: true,
    };
  };
}

// Greedy word wrap, matching how the renderer breaks lines. Stops as soon as
// the line budget is exceeded or a single word is wider than the line.
function wrapsWithin(words, fits, maxLines) {
  let lines = 1;
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (!fits(word) || ++lines > maxLines) return false;
    current = word;
  }
  return true;
}

// Fill up to maxLines in a single pass, then end the last line with an
// ellipsis, dropping words (or characters, for a word wider than the line)
// until it fits. Returns "" if not even the ellipsis fits.
function truncate(words, fits, maxLines) {
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (fits(candidate)) {
      current = candidate;
      continue;
    }
    if (current && lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
      if (fits(word)) continue;
    } else if (!current) {
      current = word;
    }
    break;
  }

  const withEllipsis = (s) => s.replace(TRAILING_PUNCTUATION, "") + ELLIPSIS;

  let last = current;
  while (last.includes(" ") && !fits(withEllipsis(last))) {
    last = last.slice(0, last.lastIndexOf(" "));
  }
  if (!fits(withEllipsis(last))) {
    // A single word wider than the line: binary search the longest prefix that fits
    const chars = [...last];
    let lo = 0;
    let hi = chars.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(withEllipsis(chars.slice(0, mid).join("")))) lo = mid;
      else hi = mid - 1;
    }
    last = chars.slice(0, lo).join("");
    if (!last && !fits(ELLIPSIS)) return lines.join(" ");
  }

  return [...lines, withEllipsis(last)].join(" ");
}

function toArrayBuffer(data) {
  if (data instanceof ArrayBuffer) return data;
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}
