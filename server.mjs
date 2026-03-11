import { createServer } from "http";
import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "node-html-parser";

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
    const el =
      root.querySelector(`meta[${attr}="${value}"]`);
    return el?.getAttribute("content") || "";
  };

  return {
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

function renderImage({ title, subtitle, width, height }) {
  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a2e",
          color: "#ffffff",
          fontFamily: "Figtree",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: width > 1100 ? "64px" : "48px",
                fontWeight: 700,
                lineHeight: 1.2,
              },
              children: title || "Untitled",
            },
          },
          subtitle
            ? {
                type: "div",
                props: {
                  style: {
                    fontSize: width > 1100 ? "32px" : "24px",
                    color: "#a0a0c0",
                    marginTop: "20px",
                  },
                  children: subtitle,
                },
              }
            : null,
        ].filter(Boolean),
      },
    },
    { width, height, fonts }
  );
}

const formHTML = readFileSync(join(__dirname, "form.html"), "utf-8");

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/" || url.pathname === "/form.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(formHTML);
    return;
  }

  // Main OG endpoint: /og?url=https://example.com
  if (url.pathname === "/og") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      res.writeHead(400);
      res.end("Missing ?url= parameter");
      return;
    }
    try {
      const meta = await fetchMeta(targetUrl);
      const size = SIZES[url.searchParams.get("size")] || SIZES.og;
      const response = renderImage({ ...meta, ...size });
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

  // Form preview endpoint: /generate?title=...&subtitle=...&size=og
  if (url.pathname === "/generate") {
    const title = url.searchParams.get("title") || "Untitled";
    const subtitle = url.searchParams.get("subtitle") || "";
    const size = url.searchParams.get("size") || "og";
    const { width, height } = SIZES[size] || SIZES.og;

    const response = renderImage({ title, subtitle, width, height });
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
