export default function render({ title, author, site, colors, assets }) {
  const styles = {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    width: "100%",
    height: "100%",
    color: colors.text,
    backgroundSize: "cover",
    backgroundPosition: "center",
    padding: "60px",
    overflow: "hidden",
  };

  if (assets.background) {
    styles.backgroundImage = `url(${assets.background})`;
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
                height: 38,
                style: { marginBottom: "56px" },
              },
            }
          : null,
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              fontSize: "80px",
              fontWeight: 700,
              fontFamily: "Figtree",
              lineHeight: 1.2,
              maxWidth: "80%",
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
            children: title || "Untitled",
          },
        },
        author
          ? {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  fontSize: "32px",
                  fontFamily: "Instrument Sans",
                  fontWeight: 400,
                  marginTop: "18px",
                },
                children: `by ${author}`,
              },
            }
          : null,
      ].filter(Boolean),
    },
  };
}
