function cleanText(el) {
  if (!el) return "";
  el.querySelectorAll(".terminology-tooltip").forEach((t) => t.remove());
  return el.text.trim();
}

function statItem(value, label) {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: "12px" },
      children: [
        {
          type: "div",
          props: {
            style: { fontSize: "40px", fontWeight: 600 },
            children: value,
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: "20px", color: "#A1A1A1", fontWeight: 600 },
            children: label,
          },
        },
      ],
    },
  };
}

function codeownersItem(codeowners) {
  const owners = [...new Set(codeowners.split(",").map((s) => {
    const name = s.trim().replace(/^@/, "");
    return name.includes("/") ? name.split("/")[0] : name;
  }))];
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: "12px" },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", gap: "12px" },
            children: [
              ...owners.slice(0, 5).map((username) => ({
                type: "img",
                props: {
                  src: `https://github.com/${username}.png?size=60`,
                  width: 60,
                  height: 60,
                  style: { borderRadius: "50%" },
                },
              })),
              owners.length > 5
                ? {
                  type: "div",
                  props: {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      marginLeft: "8px",
                      fontSize: "28px",
                      fontWeight: 600,
                      color: "#A1A1A1",
                    },
                    children: `+${owners.length - 5}`,
                  },
                }
                : null,
            ].filter(Boolean),
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: "20px", color: "#A1A1A1", fontWeight: 600 },
            children: "Code owners",
          },
        },
      ],
    },
  };
}

export default function render({ meta, site, config, assets, width, height, fitText }) {
  const title = meta["og:title"] || meta._title || meta.title || "Untitled";
  const subtitle = cleanText(site?.querySelector("article header~p"))
    || meta["og:description"] || meta.description || meta.subtitle || "";

  const installs = meta["og:image:installs"];
  const codeowners = meta["og:image:codeowners"];
  const hasStats = installs || codeowners;

  const contentWidth = width - 120;
  const fittedTitle = fitText(title, {
    maxWidth: contentWidth,
    maxLines: 2,
    maxFontSize: 56,
    minFontSize: 40,
    fontWeight: 700,
  });
  const fittedSubtitle = fitText(subtitle, {
    maxWidth: contentWidth,
    maxLines: hasStats ? 4 : 6,
    maxFontSize: 26,
    minFontSize: 20,
  });

  const statsRow = hasStats
    ? {
      type: "div",
      props: {
        style: {
          display: "flex",
          alignItems: "flex-end",
          gap: "40px",
          marginTop: "30px",
        },
        children: [
          installs ? statItem(installs, "Installations") : null,
          codeowners ? codeownersItem(codeowners) : null,
        ].filter(Boolean),
      },
    }
    : null;

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
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 600,
                          color: "#A1A1A1",
                        },
                        children: "Integration",
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
                  ],
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: `${fittedSubtitle.fontSize}px`,
                    color: config.colors.subtitle,
                    lineHeight: 1.3,
                    marginTop: "20px",
                  },
                  children: fittedSubtitle.text,
                },
              },
              statsRow,
            ].filter(Boolean),
          },
        },
      ].filter(Boolean),
    },
  };
}
