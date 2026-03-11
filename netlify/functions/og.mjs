import { ImageResponse } from "@vercel/og";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "node-html-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fontData = readFileSync(join(__dirname, "../../fonts/Figtree-Regular.ttf"));
const fontBoldData = readFileSync(join(__dirname, "../../fonts/Figtree-Bold.ttf"));

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

export default async (req) => {
  const url = new URL(req.url);
  const params = url.searchParams;

  const targetUrl = params.get("url");
  const size = params.get("size") || "og";
  const { width, height } = SIZES[size] || SIZES.og;

  let title, subtitle;

  if (targetUrl) {
    try {
      const meta = await fetchMeta(targetUrl);
      title = meta.title;
      subtitle = meta.subtitle;
    } catch (err) {
      return new Response(`Failed to fetch URL: ${err.message}`, { status: 500 });
    }
  } else {
    title = params.get("title") || "Untitled";
    subtitle = params.get("subtitle") || "";
  }

  const response = renderImage({ title, subtitle, width, height });
  const buffer = Buffer.from(await response.arrayBuffer());

  const cacheControl = targetUrl
    ? "public, max-age=3600"
    : "no-store";

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
    },
  });
};

export const config = {
  path: ["/og", "/generate"],
};
