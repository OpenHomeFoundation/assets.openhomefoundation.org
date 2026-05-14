export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const category = meta["og:image:category"] || meta.category || "";
  const author = meta["og:image:author"] || meta.author || "";

  // Strip title suffix like " – Open Home Foundation"
  const cleanTitle = config.stripTitleSuffix
    ? title.replace(/\s*[–|—\-]\s*[^–|—\-]+$/, "").trim()
    : title;

  const isOg = width > height;
  const isResearch = category.toLowerCase() === "research";
  const backgroundKey = isResearch
    ? (isOg ? "background-research-og" : "background-research-social")
    : (isOg ? "background-og" : "background-social");
  const background = assets[backgroundKey];
  const logo = isResearch ? assets.logo_on_light : assets.logo;
  const textColor = isResearch ? config.colors.text_on_light : config.colors.text;

  const styles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    color: textColor,
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
        logo
          ? {
            type: "img",
            props: {
              src: logo,
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
                      fontSize: "30px",
                      fontWeight: 600,
                      fontFamily: "Figtree",
                      textTransform: "uppercase",
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
                    // -2% letter spacing in figma
                    letterSpacing: "-0.016em",
                    maxWidth: "100%",
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
                      color: textColor,
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
