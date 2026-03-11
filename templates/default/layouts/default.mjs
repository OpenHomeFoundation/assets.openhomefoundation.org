export default function render({ title, subtitle, colors, width }) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
              fontSize: width > 1100 ? "64px" : "48px",
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
                  fontSize: width > 1100 ? "32px" : "24px",
                  color: colors.subtitle,
                  marginTop: "20px",
                },
                children: subtitle,
              },
            }
          : null,
      ].filter(Boolean),
    },
  };
}
