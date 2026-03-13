import { createServer } from "http";
import { ImageResponse } from "@vercel/og";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, parseMeta, loadAssets, fetchRemoteAssets, listTemplates } from "./lib/templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fonts = [
  { name: "Figtree", data: readFileSync(join(__dirname, "fonts/Figtree-Regular.ttf")), weight: 400, style: "normal" },
  { name: "Figtree", data: readFileSync(join(__dirname, "fonts/Figtree-Bold.ttf")), weight: 700, style: "normal" },
  { name: "Instrument Sans", data: readFileSync(join(__dirname, "fonts/InstrumentSans-Regular.ttf")), weight: 400, style: "normal" },
];

const SIZES = {
  og: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

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
      const pageRes = await fetch(targetUrl);
      const finalUrl = pageRes.url || targetUrl;
      const html = await pageRes.text();
      const site = parse(html);
      const meta = parseMeta(site);

      // If source has an og:image and we're not ignoring it, proxy it
      if (meta["og:image"] && !ignoreOg) {
        const ogImageUrl = new URL(meta["og:image"], finalUrl).href;
        const imgRes = await fetch(ogImageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        res.writeHead(200, {
          "Content-Type": imgRes.headers.get("content-type") || "image/png",
          "Cache-Control": "public, max-age=3600",
        });
        res.end(buffer);
        return;
      }

      const size = SIZES[url.searchParams.get("size")] || SIZES.og;
      const { templateDir, layoutName, config } = resolveTemplate(finalUrl);
      const layout = await loadLayout(templateDir, layoutName);
      const assets = await fetchRemoteAssets(loadAssets(templateDir));

      const element = layout({ meta, site, config, assets, ...size });
      const response = new ImageResponse(element, { ...size, fonts });
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
    const size = url.searchParams.get("size") || "og";
    const templateId = url.searchParams.get("templateId") || "";
    const layoutOverride = url.searchParams.get("layout") || "";
    const templateUrl = url.searchParams.get("template") || "";
    const { width, height } = SIZES[size] || SIZES.og;

    // Pass all query params as meta so layouts can use whatever they need
    const meta = Object.fromEntries(url.searchParams.entries());

    const { templateDir, layoutName, config } = templateId
      ? resolveTemplateById(templateId, layoutOverride)
      : resolveTemplate(templateUrl);
    const layout = await loadLayout(templateDir, layoutName);
    const assets = await fetchRemoteAssets(loadAssets(templateDir));

    const element = layout({ meta, site: null, config, assets, width, height });
    const response = new ImageResponse(element, { width, height, fonts });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    });
    res.end(buffer);
    return;
  }

  // Serve static files from project root
  const filePath = join(__dirname, url.pathname);
  if (url.pathname.endsWith(".html") && existsSync(filePath)) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(readFileSync(filePath, "utf-8"));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(5050, () => console.log("Preview at http://localhost:5050"));
