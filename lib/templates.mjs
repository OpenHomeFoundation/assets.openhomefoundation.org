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
  // Convert glob pattern to regex: /blog/* -> /blog/.*
  const regex = new RegExp(
    "^" + pattern.replace(/\*/g, ".*") + "$"
  );
  return regex.test(path);
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

  // Find matching template by domain
  let matched = null;
  for (const [, config] of templates) {
    if (config.domain === "*") continue;
    if (url.hostname === config.domain || url.hostname === `www.${config.domain}`) {
      matched = config;
      break;
    }
  }

  if (!matched) {
    matched = templates.get("default");
  }

  // Find matching route
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

export async function loadLayout(templateDir, layoutName) {
  const layoutPath = join(templatesDir, templateDir, "layouts", `${layoutName}.mjs`);
  try {
    const mod = await import(layoutPath);
    return mod.default;
  } catch {
    // Fallback to template's default, then global default
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
  const assetsDir = join(templatesDir, templateDir, "assets");
  const assets = {};
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
  return assets;
}
