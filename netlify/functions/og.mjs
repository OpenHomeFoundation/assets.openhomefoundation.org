import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, loadAssets, listTemplates } from "../../lib/templates.mjs";

const fontsDir = join(process.cwd(), "fonts");
const fontData = readFileSync(join(fontsDir, "Figtree-Regular.ttf"));
const fontBoldData = readFileSync(join(fontsDir, "Figtree-Bold.ttf"));

const fonts = [
  { name: "Figtree", data: fontData, weight: 400, style: "normal" },
  { name: "Figtree", data: fontBoldData, weight: 700, style: "normal" },
];

const SIZES = {
  og: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

async function fetchMeta(targetUrl) {
  const res = await fetch(targetUrl);
  const html = await res.text();
  const root = parse(html);

  const getMeta = (attr, value) => {
    const el = root.querySelector(`meta[${attr}="${value}"]`);
    return el?.getAttribute("content") || "";
  };

  return {
    ogImage: getMeta("property", "og:image") || "",
    title:
      getMeta("name", "og-image:title") ||
      getMeta("property", "og:title") ||
      root.querySelector("title")?.text ||
      "",
    subtitle:
      getMeta("name", "og-image:subtitle") ||
      getMeta("property", "og:description") ||
      getMeta("name", "description") ||
      "",
  };
}

export default async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/templates") {
    return new Response(JSON.stringify(listTemplates()), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const params = url.searchParams;
  const targetUrl = params.get("url");
  const size = params.get("size") || "og";
  const { width, height } = SIZES[size] || SIZES.og;

  let title, subtitle;

  const ignoreOg = params.get("ignoreOg") === "1";

  if (targetUrl) {
    try {
      const meta = await fetchMeta(targetUrl);

      // If source has an og:image and we're not ignoring it, proxy it
      if (meta.ogImage && !ignoreOg) {
        const imgRes = await fetch(meta.ogImage);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": imgRes.headers.get("content-type") || "image/png",
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      }

      title = meta.title;
      subtitle = meta.subtitle;
    } catch (err) {
      return new Response(`Failed to fetch URL: ${err.message}`, { status: 500 });
    }
  } else {
    title = params.get("title") || "Untitled";
    subtitle = params.get("subtitle") || "";
  }

  // Resolve template based on URL, template ID, or manual params
  const templateId = params.get("templateId") || "";
  const layoutOverride = params.get("layout") || "";
  const templateUrl = targetUrl || params.get("template") || "";
  const { templateDir, layoutName, config } = templateId
    ? resolveTemplateById(templateId, layoutOverride)
    : resolveTemplate(templateUrl);
  const layout = await loadLayout(templateDir, layoutName);
  const assets = loadAssets(templateDir);

  const element = layout({
    title,
    subtitle,
    colors: config.colors,
    width,
    height,
    assets,
  });

  const response = new ImageResponse(element, { width, height, fonts });
  const buffer = Buffer.from(await response.arrayBuffer());

  const cacheControl = targetUrl
    ? "public, s-maxage=86400, stale-while-revalidate=604800"
    : "no-store";

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
      "Netlify-CDN-Cache-Control": targetUrl
        ? "public, s-maxage=86400, stale-while-revalidate=604800"
        : "no-store",
    },
  });
};

export const config = {
  path: ["/og", "/generate", "/templates"],
};
