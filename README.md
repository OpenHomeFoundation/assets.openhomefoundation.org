# OG Image Generator

Dynamic Open Graph image generator for Open Home Foundation projects. Built on [@vercel/og](https://vercel.com/docs/functions/og-image-generation) and deployed as a Netlify function.

## How it works

1. A request comes in with a URL (e.g. `/opengraph?url=https://home-assistant.io/integrations/zha`)
2. The URL's domain is validated against allowed domains defined in template configs (returns 403 if not allowed)
3. The service fetches the page, parses the HTML, and extracts all `<meta>` tags into a flat key-value map
4. The URL's domain and path are matched against template configs to determine which template and layout to use
5. The layout receives `{ meta, site, config, assets, width, height }` and returns a [@vercel/og](https://vercel.com/docs/functions/og-image-generation) image element
6. The image is rendered and returned as a PNG

Layouts own all rendering logic. The service layer is intentionally generic — it knows nothing about specific meta tags like `og:title` or `og:image:installs`. Each layout decides what to extract from `meta` and `site`.

## Endpoints

### `GET /opengraph?url=<url>`

Fetches a page and generates an OG image (1200x630) based on its content. The URL must match an allowed domain from one of the template configs. Always generates a fresh image — existing `og:image` tags on the page are ignored.

| Param | Description |
|-------|-------------|
| `url` | **(required)** The page URL to generate an image for. Must match an allowed domain. |

### `GET /generate?templateId=<id>&title=<title>`

Generates an image from query parameters directly (no URL fetching or domain validation). All query params are passed to the layout as `meta`.

| Param | Description |
|-------|-------------|
| `templateId` | Template to use (e.g. `home-assistant`, `ohf`, `default`) |
| `layout` | Layout override (e.g. `blog`, `integration`) |
| `size` | `og` (1200x630, default), `portrait` (1080x1350), `square` (1080x1080) |
| `title`, `subtitle`, etc. | Passed to the layout as `meta` — layouts decide which params they use |

### `GET /generate-opengraph`

Preview UI for testing OG image generation. Supports manual input and URL-based generation with a debug panel that shows template resolution details.

## Templates

Templates live in `templates/<name>/` and contain:

```
templates/
  home-assistant/
    config.json          # Domain matching, routes, colors, assets
    layouts/
      default.mjs        # Default layout
      blog.mjs           # Blog post layout
      integration.mjs    # Integration page layout
    assets/              # Local images (auto-loaded as base64)
  ohf/
    config.json
    layouts/
      default.mjs
    assets/
      background.jpg
  default/               # Fallback template
    config.json
    layouts/
      default.mjs
```

### config.json

```json
{
  "domain": [
    "home-assistant.io",
    "/deploy-preview-\\d+--home-assistant-docs\\.netlify\\.app/"
  ],
  "colors": {
    "background": "#ffffff",
    "text": "#1D2126",
    "subtitle": "#A1A1A1"
  },
  "remoteAssets": {
    "logo": "https://example.com/logo.png"
  },
  "routes": [
    { "path": "/blog/*", "layout": "blog" },
    { "path": "*", "layout": "default" }
  ]
}
```

- **`domain`** — Array of domains this template handles. Supports plain hostnames (`home-assistant.io`) and regex patterns wrapped in slashes (`/deploy-preview-\d+--.*\.netlify\.app/`). Use `["*"]` for the fallback. Only URLs matching a non-wildcard domain are allowed on the `/opengraph` endpoint.
- **`colors`** — Passed to layouts via `config.colors`.
- **`remoteAssets`** — URLs fetched at render time and passed to layouts as base64 data URIs.
- **`routes`** — Maps URL paths to layouts using glob patterns. First match wins.

### Layouts

Layouts are ES modules that export a default render function:

```js
export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || "Untitled";

  return {
    type: "div",
    props: {
      style: { /* ... */ },
      children: title,
    },
  };
}
```

| Param | Description |
|-------|-------------|
| `meta` | All `<meta>` tags from the page as `{ [property\|name]: content }`. Also includes `_title` from the `<title>` tag. For `/generate`, this is the raw query params. |
| `site` | The parsed HTML document ([node-html-parser](https://github.com/nicchongwb/node-html-parser) root element). `null` for `/generate` requests. |
| `config` | The template's `config.json` contents. |
| `assets` | Local and remote assets as base64 data URIs, keyed by filename (without extension). |
| `width` | Image width in pixels. |
| `height` | Image height in pixels. |

The return value is a [@vercel/og](https://vercel.com/docs/functions/og-image-generation) element (JSX-like object tree using `{ type, props }` syntax).

## Custom meta tags

Pages can provide hints to layouts using custom meta tags. For example, the Home Assistant integration layout uses:

```html
<meta property="og:image:installs" content="26%">
<meta property="og:image:codeowners" content="@balloob, @dmulcahey">
```

These are layout-specific — the service passes all meta tags through without interpretation.

## Development

```bash
pnpm install
pnpm dev
```

Opens a preview server at http://localhost:5050 with the preview UI at `/generate-opengraph`.

## Deployment

Deployed to Netlify as a serverless function. Configuration is in `netlify.toml`.
