import { createServer } from "http";
import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, loadAssets, listTemplates } from "./lib/templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fontData = readFileSync(join(__dirname, "fonts/Figtree-Regular.ttf"));
const fontBoldData = readFileSync(join(__dirname, "fonts/Figtree-Bold.ttf"));

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

async function generateImage({ title, subtitle, templateUrl, templateId, layoutOverride, width, height }) {
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

  return new ImageResponse(element, { width, height, fonts });
}

const formHTML = readFileSync(join(__dirname, "public/index.html"), "utf-8");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/" || url.pathname === "/form.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(formHTML);
    return;
  }

  if (url.pathname === "/templates") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listTemplates()));
    return;
  }

  if (url.pathname === "/og") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400);
      res.end("Missing ?url= parameter");
      return;
    }
    const ignoreOg = url.searchParams.get("ignoreOg") === "1";
    try {
      const meta = await fetchMeta(targetUrl);

      // If source has an og:image and we're not ignoring it, proxy it
      if (meta.ogImage && !ignoreOg) {
        const imgRes = await fetch(meta.ogImage);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        res.writeHead(200, {
          "Content-Type": imgRes.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=3600",
        });
        res.end(buffer);
        return;
      }

      const size = SIZES[url.searchParams.get("size")] || SIZES.og;
      const response = await generateImage({
        ...meta,
        templateUrl: targetUrl,
        ...size,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      });
      res.end(buffer);
    } catch (err) {
      res.writeHead(500);
      res.end(`Failed to fetch URL: ${err.message}`);
    }
    return;
  }

  if (url.pathname === "/generate") {
    const title = url.searchParams.get("title") || "Untitled";
    const subtitle = url.searchParams.get("subtitle") || "";
    const size = url.searchParams.get("size") || "og";
    const templateId = url.searchParams.get("templateId") || "";
    const layoutOverride = url.searchParams.get("layout") || "";
    const templateUrl = url.searchParams.get("template") || "";
    const { width, height } = SIZES[size] || SIZES.og;

    const response = await generateImage({ title, subtitle, templateUrl, templateId, layoutOverride, width, height });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    });
    res.end(buffer);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(3000, () => console.log("Preview at http://localhost:3000"));
