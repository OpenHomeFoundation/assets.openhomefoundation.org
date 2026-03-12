export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const subtitle = meta["og:description"] || meta.description || meta.subtitle || "";

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        padding: "60px",
        width: "100%",
        height: "100%",
        backgroundColor: config.colors.background,
        color: config.colors.text,
        fontFamily: "Figtree",
      },
      children: [
        assets.logo
          ? {
            type: "img",
            props: {
              src: assets.logo,
              height: 40,
              style: { objectFit: "contain", objectPosition: "left" },
            },
          }
          : null,
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
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
                  children: title,
                },
              },
              subtitle
                ? {
                  type: "div",
                  props: {
                    style: {
                      fontSize: width > 1100 ? "32px" : "24px",
                      color: config.colors.subtitle,
                      marginTop: "20px",
                    },
                    children: subtitle,
                  },
                }
                : null,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}
