# OG Image Generator

Dynamic Open Graph image generator for Open Home Foundation projects. Built on [@vercel/og](https://vercel.com/docs/functions/og-image-generation) and deployed as a Netlify function.

## How it works

1. A request comes in with a URL (e.g. `/og?url=https://home-assistant.io/integrations/zha`)
2. The service fetches the page, parses the HTML, and extracts all `<meta>` tags into a flat key-value map
3. The URL's domain and path are matched against template configs to determine which template and layout to use
4. The layout receives `{ meta, site, config, assets, width, height }` and returns a [@vercel/og](https://vercel.com/docs/functions/og-image-generation) image element
5. The image is rendered and returned as a PNG

Layouts own all rendering logic. The service layer is intentionally generic — it knows nothing about specific meta tags like `og:title` or `og:image:release`. Each layout decides what to extract from `meta` and `site`.

## Endpoints

### `GET /og?url=<url>`

Fetches a page and generates an OG image based on its content. If the page already has an `og:image` meta tag, it proxies that image instead (pass `&ignoreOg=1` to override).

| Param | Description |
|-------|-------------|
| `url` | The page URL to generate an image for |
| `size` | `og` (1200x630, default), `portrait` (1080x1350), `square` (1080x1080) |
| `ignoreOg` | Set to `1` to generate an image even if the page has an existing `og:image` |

### `GET /generate?templateId=<id>&title=<title>`

Generates an image from query parameters directly (no URL fetching). All query params are passed to the layout as `meta`.

| Param | Description |
|-------|-------------|
| `templateId` | Template to use (e.g. `home-assistant`, `ohf`, `default`) |
| `layout` | Layout override (e.g. `blog`, `integration`) |
| `size` | Image size preset (see above) |
| `title`, `subtitle`, etc. | Passed to the layout as `meta` — layouts decide which params they use |

### `GET /templates`

Returns a JSON list of available templates.

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
  "domain": ["home-assistant.io"],
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

- **`domain`** — Array of domains this template handles. Use `["*"]` for the fallback.
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
<meta property="og:image:release" content="2024.1">
<meta property="og:image:installs" content="26%">
<meta property="og:image:codeowners" content="@balloob, @dmulcahey">
```

These are layout-specific — the service passes all meta tags through without interpretation.

## Development

```bash
npm install
npm run dev
```

Opens a preview server at http://localhost:3000 with a form UI for testing.

## Deployment

Deployed to Netlify as a serverless function. Configuration is in `netlify.toml`.
