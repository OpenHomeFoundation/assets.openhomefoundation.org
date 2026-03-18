import { createServer } from "http";
import { ImageResponse } from "@vercel/og";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, parseMeta, loadAssets, fetchRemoteAssets, listTemplates, isDomainAllowed } from "./lib/templates.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fonts = [
  { name: "Figtree", data: readFileSync(join(__dirname, "fonts/Figtree-Regular.ttf")), weight: 400, style: "normal" },
  { name: "Figtree", data: readFileSync(join(__dirname, "fonts/Figtree-SemiBold.ttf")), weight: 600, style: "normal" },
  { name: "Figtree", data: readFileSync(join(__dirname, "fonts/Figtree-Bold.ttf")), weight: 700, style: "normal" },
  { name: "Instrument Sans", data: readFileSync(join(__dirname, "fonts/InstrumentSans-Regular.ttf")), weight: 400, style: "normal" },
];

const SIZES = {
  og: { width: 1200, height: 630 },
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
};

const formHTML = readFileSync(join(__dirname, "public/generate-opengraph/index.html"), "utf-8");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/generate-opengraph" || url.pathname === "/generate-opengraph/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(formHTML);
    return;
  }

  if (url.pathname === "/generate-opengraph/templates") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(listTemplates()));
    return;
  }

  if (url.pathname === "/generate-opengraph/debug") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing ?url= parameter" }));
      return;
    }

    const debug = { inputUrl: targetUrl, steps: [] };
    let finalUrl = targetUrl;
    let meta = {};

    try {
      const pageRes = await fetch(targetUrl);
      finalUrl = pageRes.url || targetUrl;
      debug.finalUrl = finalUrl;
      debug.redirected = finalUrl !== targetUrl;
      if (debug.redirected) {
        debug.steps.push(`Followed redirect: ${targetUrl} → ${finalUrl}`);
      } else {
        debug.steps.push(`No redirect — final URL is same as input`);
      }

      const html = await pageRes.text();
      const site = parse(html);
      meta = parseMeta(site);
      debug.meta = meta;
      debug.steps.push(`Parsed ${Object.keys(meta).length} meta tags from page`);
    } catch (err) {
      debug.error = err.message;
      debug.steps.push(`Failed to fetch URL: ${err.message}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify(debug));
      return;
    }

    let parsedUrl;
    try { parsedUrl = new URL(finalUrl); } catch { parsedUrl = null; }

    const allTemplates = listTemplates();
    debug.availableTemplates = allTemplates.map((t) => ({ id: t.id, domain: t.domain }));

    const { templateDir, layoutName, config } = resolveTemplate(finalUrl);
    const domains = Array.isArray(config.domain) ? config.domain : [config.domain];
    const isWildcard = domains.length === 1 && domains[0] === "*";

    if (isWildcard) {
      debug.steps.push(`No template matched hostname "${parsedUrl?.hostname}" — using default template`);
    } else {
      debug.steps.push(`Hostname "${parsedUrl?.hostname}" matched template "${templateDir}" (domains: ${domains.join(", ")})`);
    }

    debug.matchedTemplate = templateDir;

    const matchedRoute = config.routes.find((r) => {
      if (r.path === "*") return true;
      const regex = new RegExp("^" + r.path.replace(/\*/g, ".*") + "$");
      return regex.test(parsedUrl?.pathname);
    });

    if (matchedRoute) {
      if (matchedRoute.path === "*") {
        debug.steps.push(`No specific route matched pathname "${parsedUrl?.pathname}" — using wildcard route → layout "${layoutName}"`);
      } else {
        debug.steps.push(`Pathname "${parsedUrl?.pathname}" matched route "${matchedRoute.path}" → layout "${layoutName}"`);
      }
    }

    debug.matchedLayout = layoutName;
    debug.allRoutes = config.routes;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(debug));
    return;
  }

  if (url.pathname === "/opengraph") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400);
      res.end("Missing ?url= parameter");
      return;
    }
    if (!isDomainAllowed(targetUrl)) {
      res.writeHead(403);
      res.end("Domain not allowed");
      return;
    }

    try {
      const pageRes = await fetch(targetUrl);
      const finalUrl = pageRes.url || targetUrl;
      const html = await pageRes.text();
      const site = parse(html);
      const meta = parseMeta(site);

      const { width, height } = SIZES.og;
      const { templateDir, layoutName, config } = resolveTemplate(finalUrl);
      const layout = await loadLayout(templateDir, layoutName);
      const assets = await fetchRemoteAssets(loadAssets(templateDir));

      const element = layout({ meta, site, config, assets, width, height });
      const response = new ImageResponse(element, { width, height, fonts });
      const buffer = Buffer.from(await response.arrayBuffer());
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
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
