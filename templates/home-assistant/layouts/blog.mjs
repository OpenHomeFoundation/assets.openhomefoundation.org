export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const subtitle = meta["og:description"] || meta.description || meta.subtitle || "";

  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "60px",
        width: "100%",
        height: "100%",
        backgroundColor: config.colors.background,
        color: config.colors.text,
        fontFamily: "Figtree",
      },
      children: [
        {
          type: "div",
          props: {
            style: {
              fontSize: width > 1100 ? "20px" : "16px",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "16px",
              color: config.colors.subtitle,
            },
            children: "Blog",
          },
        },
        {
          type: "div",
          props: {
            style: {
              fontSize: width > 1100 ? "56px" : "40px",
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
                  fontSize: width > 1100 ? "28px" : "20px",
                  color: config.colors.subtitle,
                  marginTop: "16px",
                },
                children: subtitle,
              },
            }
          : null,
        assets.logo
          ? {
              type: "img",
              props: {
                src: assets.logo,
                width: 48,
                height: 48,
                style: { marginTop: "auto" },
              },
            }
          : null,
      ].filter(Boolean),
    },
  };
}
