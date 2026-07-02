export default function render({ meta, site, config, assets, width, height }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";

  const title1 = meta["og:image:title1"] || meta.title1 || "";
  const title2 = meta["og:image:title2"] || meta.title2 || "";
  const hasSplitTitle = title1 || title2;

  const isOg = width > height;
  const isPortrait = height > width;
  const backgroundKey = isOg
    ? "background-og"
    : isPortrait
      ? "background-social-vertical"
      : "background-social";
  const background = assets[backgroundKey];

  const titleNode = hasSplitTitle
    ? {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          fontFamily: "Figtree",
          fontSize: "90px",
          lineHeight: 1.05,
          textTransform: "uppercase",
        },
        children: [
          title1
            ? {
              type: "div",
              props: {
                style: { display: "flex", fontWeight: 300 },
                children: title1,
              },
            }
            : null,
          title2
            ? {
              type: "div",
              props: {
                style: { display: "flex", fontWeight: 600 },
                children: title2,
              },
            }
            : null,
        ].filter(Boolean),
      },
    }
    : {
      type: "div",
      props: {
        style: {
          fontSize: isOg ? "64px" : "56px",
          fontWeight: 700,
          lineHeight: 1.1,
        },
        children: title,
      },
    };

  const styles = {
    display: "flex",
    flexDirection: "column",
    padding: isOg ? "60px" : "70px",
    paddingBottom: "66px",
    width: "100%",
    height: "100%",
    backgroundColor: config.colors.background,
    color: config.colors.text,
    fontFamily: "Figtree",
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  if (background) {
    styles.backgroundImage = `url(${background})`;
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
              height: isOg ? 44 : 52,
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
              marginLeft: `${120 - (isOg ? 60 : 70)}px`,
              maxWidth: "90%",
            },
            children: [
              titleNode,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}
