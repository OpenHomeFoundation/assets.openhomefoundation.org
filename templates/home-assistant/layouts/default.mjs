export default function render({ meta, site, config, assets, width, height, fitText }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const subtitle = meta["og:description"] || meta.description || meta.subtitle || "";

  const isWide = width > 1100;
  const contentWidth = width - 120;
  const fittedTitle = fitText(title, {
    maxWidth: contentWidth,
    maxLines: 3,
    maxFontSize: isWide ? 64 : 48,
    minFontSize: isWide ? 44 : 36,
    fontWeight: 700,
  });
  const fittedSubtitle = fitText(subtitle, {
    maxWidth: contentWidth,
    maxLines: 3,
    maxFontSize: isWide ? 32 : 24,
    minFontSize: isWide ? 24 : 20,
  });

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
                      marginTop: "20px",
                    },
                    children: fittedSubtitle.text,
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
