import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, parseMeta, loadAssets, fetchRemoteAssets, listTemplates } from "../../lib/templates.mjs";

const fontsDir = join(process.cwd(), "fonts");

const fonts = [
  { name: "Figtree", data: readFileSync(join(fontsDir, "Figtree-Regular.ttf")), weight: 400, style: "normal" },
  { name: "Figtree", data: readFileSync(join(fontsDir, "Figtree-Bold.ttf")), weight: 700, style: "normal" },
  { name: "Instrument Sans", data: readFileSync(join(fontsDir, "InstrumentSans-Regular.ttf")), weight: 400, style: "normal" },
];

const SIZES = {
  og: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

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
  const templateId = params.get("templateId") || "";
  const layoutOverride = params.get("layout") || "";
  const ignoreOg = params.get("ignoreOg") === "1";

  let meta = {};
  let site = null;
  let finalUrl = targetUrl;

  if (targetUrl) {
    try {
      const pageRes = await fetch(targetUrl);
      finalUrl = pageRes.url || targetUrl;
      const html = await pageRes.text();
      site = parse(html);
      meta = parseMeta(site);

      // If source has an og:image and we're not ignoring it, proxy it
      if (meta["og:image"] && !ignoreOg) {
        const ogImageUrl = new URL(meta["og:image"], finalUrl).href;
        const imgRes = await fetch(ogImageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        return new Response(buffer, {
          headers: {
            "Content-Type": imgRes.headers.get("content-type") || "image/png",
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      }
    } catch (err) {
      return new Response(`Failed to fetch URL: ${err.message}`, { status: 500 });
    }
  } else {
    // Pass all query params as meta so layouts can use whatever they need
    meta = Object.fromEntries(params.entries());
  }

  const templateUrl = finalUrl || params.get("template") || "";
  const { templateDir, layoutName, config } = templateId
    ? resolveTemplateById(templateId, layoutOverride)
    : resolveTemplate(templateUrl);

  const layout = await loadLayout(templateDir, layoutName);
  const assets = await fetchRemoteAssets(loadAssets(templateDir));

  const element = layout({ meta, site, config, assets, width, height });
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
  path: ["/opengraph", "/generate", "/templates"],
};
