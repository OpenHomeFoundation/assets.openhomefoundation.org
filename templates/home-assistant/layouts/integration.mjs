export default function render({ title, subtitle, colors, width, assets }) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
        width: "100%",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.text,
        fontFamily: "Figtree",
        textAlign: "center",
      },
      children: [
        assets.logo
          ? {
              type: "img",
              props: {
                src: assets.logo,
                width: 64,
                height: 64,
                style: { marginBottom: "24px" },
              },
            }
          : null,
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
        {
          type: "div",
          props: {
            style: {
              fontSize: width > 1100 ? "20px" : "16px",
              color: colors.subtitle,
              marginTop: "auto",
            },
            children: "Home Assistant Integration",
          },
        },
      ].filter(Boolean),
    },
  };
}
