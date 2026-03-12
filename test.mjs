import { parse } from "node-html-parser";

const url = "https://www.home-assistant.io/integrations/zha";
const html = await (await fetch(url)).text();
const site = parse(html);

// Try various approaches
console.log("=== querySelector('article header+p') ===");
console.log(site.querySelector("article header+p")?.text);

console.log("\n=== querySelector('article header') then nextElementSibling ===");
const header = site.querySelector("article header");
console.log("header found:", !!header);
console.log("nextElementSibling:", header?.nextElementSibling?.text);

console.log("\n=== querySelector('article p') ===");
console.log(site.querySelector("article p")?.text);

console.log("\n=== All article children tags ===");
const article = site.querySelector("article");
if (article) {
  for (const child of article.childNodes.slice(0, 15)) {
    if (child.tagName) {
      console.log(`<${child.tagName.toLowerCase()}> → ${child.text}`);
    }
  }
}
