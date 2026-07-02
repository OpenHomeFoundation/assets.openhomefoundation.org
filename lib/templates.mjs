import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const templatesDir = join(process.cwd(), "templates");

// Load all template configs at startup
const templates = new Map();

for (const dir of readdirSync(templatesDir)) {
  const configPath = join(templatesDir, dir, "config.json");
  try {
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    config._dir = dir;
    templates.set(dir, config);
  } catch {
    // skip invalid template dirs
  }
}

function matchPath(pattern, path) {
  if (pattern === "*") return true;
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  return regex.test(path);
}

function matchDomain(pattern, hostname) {
  if (pattern === "*") return true;
  // Regex patterns are wrapped in slashes: "/deploy-preview-\\d+--.*\\.netlify\\.app/"
  if (pattern.startsWith("/") && pattern.endsWith("/")) {
    const regex = new RegExp("^" + pattern.slice(1, -1) + "$");
    return regex.test(hostname);
  }
  return hostname === pattern || hostname === `www.${pattern}`;
}

export function listTemplates() {
  const result = [];
  for (const [dir, config] of templates) {
    result.push({
      id: dir,
      domain: config.domain,
      layouts: config.routes.map((r) => r.layout),
    });
  }
  return result;
}

export function isDomainAllowed(targetUrl) {
  let url;
  try { url = new URL(targetUrl); } catch { return false; }
  for (const [, config] of templates) {
    const domains = Array.isArray(config.domain) ? config.domain : [config.domain];
    if (domains.length === 1 && domains[0] === "*") continue;
    if (domains.some((d) => matchDomain(d, url.hostname))) return true;
  }
  return false;
}

export function resolveTemplateById(templateId, layoutName) {
  const config = templates.get(templateId) || templates.get("default");
  return {
    templateDir: config._dir,
    layoutName: layoutName || "default",
    config,
  };
}

export function resolveTemplate(targetUrl) {
  let url;
  try {
    url = new URL(targetUrl);
  } catch {
    return { templateDir: "default", layoutName: "default", config: templates.get("default") };
  }

  let matched = null;
  for (const [, config] of templates) {
    const domains = Array.isArray(config.domain) ? config.domain : [config.domain];
    if (domains.length === 1 && domains[0] === "*") continue;
    if (domains.some((d) => matchDomain(d, url.hostname))) {
      matched = config;
      break;
    }
  }

  if (!matched) {
    matched = templates.get("default");
  }

  let layoutName = "default";
  for (const route of matched.routes) {
    if (matchPath(route.path, url.pathname)) {
      layoutName = route.layout;
      break;
    }
  }

  return {
    templateDir: matched._dir,
    layoutName,
    config: matched,
  };
}


/**
 * Extract all <meta> tags into a flat map.
 * Keys are the name or property attribute, values are the content attribute.
 */
export function parseMeta(root) {
  const meta = {};
  for (const el of root.querySelectorAll("meta")) {
    const key = el.getAttribute("property") || el.getAttribute("name");
    const content = el.getAttribute("content");
    if (key && content) {
      meta[key] = content;
    }
  }
  // Also grab <title>
  const titleEl = root.querySelector("title");
  if (titleEl) {
    meta._title = titleEl.text;
  }
  return meta;
}

export async function loadLayout(templateDir, layoutName) {
  const layoutPath = join(templatesDir, templateDir, "layouts", `${layoutName}.mjs`);
  try {
    const mod = await import(layoutPath);
    return mod.default;
  } catch {
    if (layoutName !== "default") {
      return loadLayout(templateDir, "default");
    }
    if (templateDir !== "default") {
      return loadLayout("default", "default");
    }
    throw new Error(`No layout found for ${templateDir}/${layoutName}`);
  }
}

export function loadAssets(templateDir) {
  const config = templates.get(templateDir) || templates.get("default");
  const assets = {};

  const assetsDir = join(templatesDir, templateDir, "assets");
  try {
    for (const file of readdirSync(assetsDir)) {
      if (file.startsWith(".")) continue;
      const data = readFileSync(join(assetsDir, file));
      const ext = file.split(".").pop();
      const mime =
        ext === "png" ? "image/png" :
          ext === "svg" ? "image/svg+xml" :
            ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
              "application/octet-stream";
      const name = file.replace(/\.[^.]+$/, "");
      assets[name] = `data:${mime};base64,${data.toString("base64")}`;
    }
  } catch {
    // no assets dir
  }

  if (config.remoteAssets) {
    assets._remote = config.remoteAssets;
  }

  return assets;
}

export function loadFallbackImage(templateDir) {
  const config = templates.get(templateDir);
  if (!config || !config.fallbackImage) return null;
  const filePath = join(templatesDir, templateDir, "assets", config.fallbackImage);
  try {
    const data = readFileSync(filePath);
    const ext = config.fallbackImage.split(".").pop().toLowerCase();
    const mime =
      ext === "webp" ? "image/webp" :
        ext === "png" ? "image/png" :
          ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
            ext === "svg" ? "image/svg+xml" :
              "application/octet-stream";
    return { data, mime };
  } catch {
    return null;
  }
}

export async function fetchRemoteAssets(assets) {
  if (!assets._remote) return assets;
  const resolved = { ...assets };
  delete resolved._remote;

  for (const [name, url] of Object.entries(assets._remote)) {
    try {
      const res = await fetch(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = url.split(".").pop().split("?")[0];
      const mime =
        ext === "png" ? "image/png" :
          ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
            ext === "svg" ? "image/svg+xml" :
              ext === "webp" ? "image/webp" :
                "image/png";
      resolved[name] = `data:${mime};base64,${buffer.toString("base64")}`;
    } catch {
      // skip failed fetches
    }
  }
  return resolved;
}
