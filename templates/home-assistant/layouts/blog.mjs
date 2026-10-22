export default function render({ meta, site, config, assets, width, height, fitText }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const subtitle = meta["og:description"] || meta.description || meta.subtitle || "";

  const isWide = width > 1100;
  const contentWidth = width - 120;
  const fittedTitle = fitText(title, {
    maxWidth: contentWidth,
    maxLines: 3,
    maxFontSize: isWide ? 56 : 40,
    minFontSize: isWide ? 40 : 32,
    fontWeight: 700,
  });
  const fittedSubtitle = fitText(subtitle, {
    maxWidth: contentWidth,
    maxLines: 2,
    maxFontSize: isWide ? 28 : 20,
    minFontSize: isWide ? 22 : 18,
  });

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
              fontSize: `${fittedTitle.fontSize}px`,
              fontWeight: 700,
              lineHeight: 1.2,
            },
            children: fittedTitle.text,
          },
        },
        subtitle
          ? {
              type: "div",
              props: {
                style: {
                  fontSize: `${fittedSubtitle.fontSize}px`,
                  color: config.colors.subtitle,
                  marginTop: "16px",
                },
                children: fittedSubtitle.text,
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
