export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const category = meta["og:image:category"] || meta.category || "";
  const author = meta["og:image:author"] || meta.author || "";

  // Strip title suffix like " – Open Home Foundation"
  const cleanTitle = config.stripTitleSuffix
    ? title.replace(/\s*[–|—\-]\s*[^–|—\-]+$/, "").trim()
    : title;

  const isOg = width > height;
  const background = isOg ? assets["background-og"] : assets["background-social"];

  const styles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    color: config.colors.text,
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: isOg ? "60px" : "70px",
    overflow: "hidden",
  };

  if (background) {
    styles.backgroundImage = `url(${background})`;
  } else {
    styles.backgroundColor = "#1a1a2e";
  }

  return {
    type: "div",
    props: {
      style: styles,
      children: [
        assets.logo
          ? {
              type: "img",
              props: {
                src: assets.logo,
                width: isOg ? 240 : 300,
              },
            }
          : {
              type: "div",
              props: {},
            },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            },
            children: [
              category
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        fontSize: "24px",
                        fontWeight: 700,
                        fontFamily: "Figtree",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        marginBottom: isOg ? "32px" : "48px",
                      },
                      children: category,
                    },
                  }
                : null,
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    fontSize: "78px",
                    fontWeight: 700,
                    fontFamily: "Figtree",
                    lineHeight: 1,
                    maxWidth: "80%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                  children: cleanTitle,
                },
              },
              author
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        fontSize: "28px",
                        fontFamily: "Instrument Sans",
                        fontWeight: 400,
                        color: config.colors.text,
                        marginTop: isOg ? "12px" : "20px",
                      },
                      children: `by ${author}`,
                    },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      ],
    },
  };
}
