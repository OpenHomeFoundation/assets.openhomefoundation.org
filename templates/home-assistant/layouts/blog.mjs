export default function render({ title, subtitle, colors, width, assets }) {
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
        backgroundColor: colors.background,
        color: colors.text,
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
              color: colors.subtitle,
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
            children: title || "Untitled",
          },
        },
        subtitle
          ? {
              type: "div",
              props: {
                style: {
                  fontSize: width > 1100 ? "28px" : "20px",
                  color: colors.subtitle,
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
