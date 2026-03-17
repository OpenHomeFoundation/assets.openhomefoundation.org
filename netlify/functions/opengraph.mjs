import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "node-html-parser";
import { resolveTemplate, resolveTemplateById, loadLayout, parseMeta, loadAssets, fetchRemoteAssets, listTemplates, isDomainAllowed } from "../../lib/templates.mjs";

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

  if (url.pathname === "/generate-opengraph/templates") {
    return new Response(JSON.stringify(listTemplates()), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/generate-opengraph/debug") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      return Response.json({ error: "Missing ?url= parameter" }, { status: 400 });
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
      return Response.json(debug, { status: 500 });
    }

    let parsedUrl;
    try { parsedUrl = new URL(finalUrl); } catch { parsedUrl = null; }

    // Template matching
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

    // Route matching
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

    return Response.json(debug, {
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

  // /opengraph requires a URL that matches an allowed domain
  if (url.pathname === "/opengraph") {
    if (!targetUrl) {
      return new Response("Missing ?url= parameter", { status: 400 });
    }
    if (!isDomainAllowed(targetUrl)) {
      return new Response("Domain not allowed", { status: 403 });
    }
  }

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
  path: ["/opengraph", "/generate", "/generate-opengraph/*"],
};
