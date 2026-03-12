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
            style: { fontSize: "20px", color: "#A1A1A1" },
            children: label,
          },
        },
      ],
    },
  };
}

function codeownersItem(codeowners) {
  const owners = codeowners.split(",").map((s) => s.trim().replace(/^@/, ""));
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: "12px" },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", gap: "12px" },
            children: owners.map((username) => ({
              type: "img",
              props: {
                src: `https://github.com/${username}.png?size=70`,
                width: 70,
                height: 70,
                style: { borderRadius: "50%" },
              },
            })),
          },
        },
        {
          type: "div",
          props: {
            style: { fontSize: "20px", color: "#A1A1A1" },
            children: "Code owners",
          },
        },
      ],
    },
  };
}

export default function render({ title, subtitle, site, release, installs, codeowners, colors, width, assets }) {
  const hasStats = release || installs || codeowners;

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
          release ? statItem(release, "Release") : null,
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
        padding: "50px 80px",
        width: "100%",
        height: "100%",
        backgroundColor: colors.background,
        color: colors.text,
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
                    fontSize: "64px",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  },
                  children: title || "Untitled",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "28px",
                    color: colors.subtitle,
                    lineHeight: 1.3,
                    marginTop: "20px",
                  },
                  children: cleanText(site?.querySelector("article header")?.nextElementSibling) || subtitle || "",
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
