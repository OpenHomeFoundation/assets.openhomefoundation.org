export default function render({ meta, site, config, assets, width, height, fitText }) {
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

  const padding = isOg ? 60 : 70;
  const marginLeft = 120 - padding;
  // Title container is offset by marginLeft and capped at 90% of the content box
  const titleWidth = Math.min(width - padding * 2 - marginLeft, (width - padding * 2) * 0.9);

  // Each split title part should stay on one line; shrink both parts to the
  // same size so the two weights line up. Only wrap if that's not enough.
  const splitOptions = {
    maxWidth: titleWidth,
    maxFontSize: 90,
    minFontSize: 56,
    letterSpacing: -0.03,
    uppercase: true,
  };
  const fitSplit = (maxLines, minFontSize) => {
    const parts = [
      title1 && fitText(title1, { ...splitOptions, maxLines, minFontSize, fontWeight: 300 }),
      title2 && fitText(title2, { ...splitOptions, maxLines, minFontSize, fontWeight: 600 }),
    ];
    const fontSize = Math.min(...parts.filter(Boolean).map((p) => p.fontSize));
    return { fontSize, parts };
  };
  let split = fitSplit(1, 56);
  if (split.parts.some((p) => p?.truncated)) {
    split = fitSplit(2, 48);
  }
  const [fittedTitle1, fittedTitle2] = split.parts;

  const fittedTitle = fitText(title, {
    maxWidth: titleWidth,
    maxLines: isOg ? 3 : 4,
    maxFontSize: isOg ? 64 : 56,
    minFontSize: 40,
    fontWeight: 700,
  });

  const titleNode = hasSplitTitle
    ? {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          fontFamily: "Figtree",
          fontSize: `${split.fontSize}px`,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
        },
        children: [
          title1
            ? {
              type: "div",
              props: {
                style: { display: "flex", fontWeight: 300 },
                children: fittedTitle1.text,
              },
            }
            : null,
          title2
            ? {
              type: "div",
              props: {
                style: { display: "flex", fontWeight: 600 },
                children: fittedTitle2.text,
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
          fontSize: `${fittedTitle.fontSize}px`,
          fontWeight: 700,
          lineHeight: 1.1,
        },
        children: fittedTitle.text,
      },
    };

  const styles = {
    display: "flex",
    flexDirection: "column",
    padding: `${padding}px`,
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
              marginLeft: `${marginLeft}px`,
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
