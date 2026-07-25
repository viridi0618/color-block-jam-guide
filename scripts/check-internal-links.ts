import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

let passed = 0;
let failed = 0;

function check(description: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS: ${description}`);
    passed++;
  } else {
    console.log(`FAIL: ${description}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  // ── Read all source files ──
  const layoutPath = new URL("app/layout.tsx", root);
  const homepagePath = new URL("app/page.tsx", root);
  const playOnlinePath = new URL("app/play-online/page.tsx", root);
  const levelsPath = new URL("app/levels/page.tsx", root);
  const levelsRangePath = new URL("app/levels/[range]/page.tsx", root);
  const levelPagePath = new URL("app/level/[levelId]/page.tsx", root);
  const internalLinksPath = new URL("lib/internal-links.ts", root);

  const layout = await readFile(layoutPath, "utf-8");
  const homepage = await readFile(homepagePath, "utf-8");
  const playOnline = await readFile(playOnlinePath, "utf-8");
  const levelsPage = await readFile(levelsPath, "utf-8");
  const levelsRangePage = await readFile(levelsRangePath, "utf-8");
  const levelPage = await readFile(levelPagePath, "utf-8");
  const internalLinks = await readFile(internalLinksPath, "utf-8");
  const cssPath = new URL("app/globals.css", root);
  const css = await readFile(cssPath, "utf-8");

  // ── 1. Logo in layout.tsx points to "/" ──
  check(
    "Logo in layout.tsx points to \"/\"",
    /href="\/"\s+className="brand"/.test(layout),
  );

  // ── 1b. No "Home" text link in nav (Logo handles return to home) ──
  check(
    'No "Home" text link in nav',
    !/>\s*Home\s*<\//.test(layout.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? ""),
  );

  // ── 1c. No "About" in top nav ──
  check(
    'No "About" in top nav',
    !layout.match(/<nav[\s\S]*?<\/nav>/)?.[0]?.includes("About"),
  );

  // ── 2. "All Levels" nav link points to "/levels" ──
  check(
    '"All Levels" nav link points to "/levels"',
    /href="\/levels"\s*>\s*All Levels\s*</.test(layout),
  );

  // ── 3. "Play Online" nav link points to "/play-online" ──
  check(
    '"Play Online" nav link points to "/play-online"',
    /href="\/play-online"\s*>\s*Play Online\s*</.test(layout),
  );

  // ── 4. "Find a Level" nav link points to "/#find-level" ──
  check(
    '"Find a Level" nav link points to "/#find-level"',
    /href="\/#find-level"/.test(layout),
  );

  // ── 5. All Levels and Find a Level have different hrefs ──
  check(
    "All Levels and Find a Level have different hrefs",
    (() => {
      const allLevelsMatch = layout.match(/href="(\/levels)"\s*>/);
      const findLevelMatch = layout.match(/href="(\/[^"]*)"[^>]*>\s*Find a Level\s*</);
      if (!allLevelsMatch || !findLevelMatch) return false;
      return allLevelsMatch[1] !== findLevelMatch[1];
    })(),
  );

  // ── 6. Homepage has id="find-level" on the search area ──
  check(
    "Homepage has id=\"find-level\" on the search area",
    /id="find-level"/.test(homepage)
      && /LevelSearch/.test(homepage),
  );

  // ── 6b. CSS has scroll-margin-top for #find-level ──
  check(
    "CSS has scroll-margin-top for #find-level",
    /#find-level\s*\{[^}]*scroll-margin-top/.test(css),
  );

  // ── 7. Homepage directly renders OnlineGamePlayer with sourcePage="home" and compact ──
  check(
    "Homepage directly renders OnlineGamePlayer with sourcePage=\"home\" and compact",
    /<OnlineGamePlayer\s+sourcePage="home"\s+compact/.test(homepage),
  );

  // ── 8. No TrackedPlayOnlineLink import in homepage ──
  check(
    "No TrackedPlayOnlineLink import in homepage",
    !/TrackedPlayOnlineLink/.test(homepage),
  );

  // ── 9. No main game entry point that jumps to /play-online ──
  //     (no <Link href="/play-online"> in game section context on homepage)
  check(
    'No main game entry point that jumps to /play-online (no <Link href="/play-online"> in game section context)',
    !/<Link\s+href="\/play-online"/.test(homepage),
  );

  // ── 10. Footer only contains the 4 approved links ──
  const footerMatch = layout.match(/<footer[\s\S]*?<\/footer>/);
  const footerContent = footerMatch ? footerMatch[0] : "";
  const footerLinks = [...footerContent.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
  const approvedFooterLinks = ["/", "/levels", "/play-online", "/privacy"];
  const uniqueFooterLinks = [...new Set(footerLinks)];
  const footerLinksOk = uniqueFooterLinks.length === 4
    && approvedFooterLinks.every((link) => uniqueFooterLinks.includes(link));
  check(
    "Footer only contains the 4 approved links: /, /levels, /play-online, /privacy",
    footerLinksOk,
    `found: ${uniqueFooterLinks.join(", ")}`,
  );

  // ── 11. Footer does NOT contain disallowed links ──
  const disallowedFooterLinks = ["/download", "/play-on-pc", "/faq", "/about", "/about-color-block-jam"];
  const hasDisallowedFooterLink = disallowedFooterLinks.some(
    (link) => footerContent.includes(`href="${link}"`),
  );
  check(
    "Footer does NOT contain: /download, /play-on-pc, /faq, /about, /about-color-block-jam",
    !hasDisallowedFooterLink,
  );

  // ── 12. Footer does NOT contain "Featured Level Walkthroughs" or "Browse by Level Range" ──
  check(
    'Footer does NOT contain "Featured Level Walkthroughs" or "Browse by Level Range" section',
    !/Featured Level Walkthroughs/.test(footerContent)
      && !/Browse by Level Range/.test(footerContent),
  );

  // ── 13. getRelatedLevels does NOT contain forbidden identifiers ──
  const forbiddenIdentifiers = [
    "deterministicIndex",
    "MIN_DISTANT",
    "MAX_DISTANT",
    "outOfRangeIds",
    "distantTarget",
    "distantCount",
  ];
  const hasForbidden = forbiddenIdentifiers.some((id) => internalLinks.includes(id));
  check(
    "getRelatedLevels does NOT contain: deterministicIndex, MIN_DISTANT, MAX_DISTANT, outOfRangeIds, distantTarget, distantCount",
    !hasForbidden,
  );

  // ── 14. getRelatedLevels only has neighbor logic and same-range logic, no distant random selection ──
  check(
    "getRelatedLevels only has neighbor logic and same-range logic, no distant random selection",
    /Neighbors/.test(internalLinks)
      && /Same.range/.test(internalLinks)
      && !/distant/i.test(internalLinks)
      && !/random/i.test(internalLinks),
  );

  // ── 15. /play-online page has compact prop on OnlineGamePlayer ──
  check(
    "/play-online page has compact prop on OnlineGamePlayer",
    /<OnlineGamePlayer\s[\s\S]*?\bcompact\b/.test(playOnline),
  );

  // ── 16. /play-online page does NOT include forbidden phrases ──
  const forbiddenPhrases = [
    "No download or installation required",
    "free to play",
    "works on both mobile and desktop",
  ];
  const hasForbiddenPhrase = forbiddenPhrases.some(
    (phrase) => playOnline.includes(phrase),
  );
  check(
    '/play-online page does NOT include "No download or installation required" or "free to play" or "works on both mobile and desktop"',
    !hasForbiddenPhrase,
  );

  // ── 17. /play-online page has rich content (How to Play, About This Game sections) ──
  check(
    "/play-online page has rich content (How to Play, About This Game sections)",
    playOnline.includes("How to Play") && playOnline.includes("About This Game"),
  );

  // ── 18. /levels page has ItemList JSON-LD in source ──
  check(
    "/levels page has ItemList JSON-LD in source",
    levelsPage.includes("ItemList") && levelsPage.includes("application/ld+json"),
  );

  // ── 19. /levels/[range] page has ItemList JSON-LD in source ──
  check(
    "/levels/[range] page has ItemList JSON-LD in source",
    levelsRangePage.includes("ItemList") && levelsRangePage.includes("application/ld+json"),
  );

  // ── 20. /levels/[range] page has "Browse All Color Block Jam Levels" link ──
  check(
    '/levels/[range] page has "Browse All Color Block Jam Levels" link',
    levelsRangePage.includes("Browse All Color Block Jam Levels"),
  );

  // ── 21. Level page has "More Color Block Jam Walkthroughs" section ──
  check(
    'Level page has "More Color Block Jam Walkthroughs" section (not "More Levels to Explore")',
    levelPage.includes("More Color Block Jam Walkthroughs")
      && !levelPage.includes("More Levels to Explore"),
  );

  // ── 22. Level page has range link and /levels link in related section ──
  check(
    "Level page has range link and /levels link in related section",
    (() => {
      const relatedSection = levelPage.match(/related-levels-nav([\s\S]*?)<\/nav>/);
      if (!relatedSection) return false;
      const sectionContent = relatedSection[1];
      const hasRangeLink = /href=\{range\.slug\}/.test(sectionContent)
        || /href=\{range\.slug\}/.test(levelPage);
      const hasLevelsLink = /href="\/levels"/.test(sectionContent);
      return hasRangeLink && hasLevelsLink;
    })(),
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);

  // ── 23. /levels page has visible breadcrumb ──
  check(
    "/levels page has visible breadcrumb",
    levelsPage.includes('className="breadcrumbs"')
      && levelsPage.includes("aria-label=\"Breadcrumb\""),
  );

  // ── 24. /levels breadcrumb is Home → All Levels ──
  check(
    "/levels breadcrumb is Home → All Levels",
    levelsPage.includes("Home")
      && levelsPage.includes("All Levels")
      && levelsPage.includes('aria-current="page"'),
  );

  // ── 25. /levels current page does not link to itself ──
  check(
    "/levels current page does not link to itself",
    (() => {
      const breadcrumbMatch = levelsPage.match(/<nav[^>]*breadcrumbs[^>]*>([\s\S]*?)<\/nav>/);
      if (!breadcrumbMatch) return false;
      const breadcrumbContent = breadcrumbMatch[1];
      const allLevelsLink = breadcrumbContent.match(/href="\/levels"[^>]*>\s*All Levels\s*</);
      return !allLevelsLink;
    })(),
  );

  // ── 26. /levels has BreadcrumbList JSON-LD ──
  check(
    "/levels has BreadcrumbList JSON-LD",
    levelsPage.includes("BreadcrumbList")
      && levelsPage.includes('@type": "ListItem"')
      && levelsPage.includes("position: 1")
      && levelsPage.includes("position: 2"),
  );

  // ── 27. /levels still has ItemList ──
  check(
    "/levels still has ItemList",
    levelsPage.includes("ItemList"),
  );

  // ── 28. /levels/[range] has BreadcrumbList JSON-LD ──
  check(
    "/levels/[range] has BreadcrumbList JSON-LD",
    levelsRangePage.includes("BreadcrumbList")
      && levelsRangePage.includes("position: 1")
      && levelsRangePage.includes("position: 2")
      && levelsRangePage.includes("position: 3"),
  );

  // ── 29. range BreadcrumbList is Home → All Levels → Current Range ──
  check(
    "range BreadcrumbList is Home → All Levels → Current Range",
    levelsRangePage.includes('name: "Home"')
      && levelsRangePage.includes('name: "All Levels"')
      && levelsRangePage.includes("Levels"),
  );

  // ── 30. range visible breadcrumb matches schema names ──
  check(
    "range visible breadcrumb matches schema names",
    levelsRangePage.includes("All Levels")
      && levelsRangePage.includes("Levels"),
  );

  // ── 31. range current page does not link to itself ──
  check(
    "range current page does not link to itself",
    levelsRangePage.includes('aria-current="page"'),
  );

  // ── 32. level page has four-level BreadcrumbList ──
  check(
    "level page has four-level BreadcrumbList",
    levelPage.includes("position: 1")
      && levelPage.includes("position: 2")
      && levelPage.includes("position: 3")
      && levelPage.includes("position: 4"),
  );

  // ── 33. level page current level has aria-current="page" ──
  check(
    "level page breadcrumb has aria-current=\"page\" on current level",
    levelPage.includes('aria-current="page"'),
  );

  // ── 34. IntentLinks does NOT contain /download ──
  const intentLinks = await readFile(new URL("components/IntentLinks.tsx", root), "utf-8");
  check(
    "IntentLinks does NOT contain /download",
    !intentLinks.includes("/download"),
  );

  // ── 35. IntentLinks does NOT contain /play-on-pc ──
  check(
    "IntentLinks does NOT contain /play-on-pc",
    !intentLinks.includes("/play-on-pc"),
  );

  // ── 36. IntentLinks does NOT contain /faq ──
  check(
    "IntentLinks does NOT contain /faq",
    !intentLinks.includes("/faq"),
  );

  // ── 37. IntentLinks contains /#find-level ──
  check(
    "IntentLinks contains /#find-level",
    intentLinks.includes("/#find-level"),
  );

  // ── 38. IntentLinks contains /levels ──
  check(
    "IntentLinks contains /levels",
    intentLinks.includes('"/levels"'),
  );

  // ── 39. IntentLinks contains /play-online ──
  check(
    "IntentLinks contains /play-online",
    intentLinks.includes("/play-online"),
  );

  // ── 40. Homepage /levels anchor text is descriptive ──
  check(
    "Homepage /levels anchor text is \"Browse All Color Block Jam Levels\"",
    homepage.includes("Browse All Color Block Jam Levels"),
  );

  // ── 41. Level page related section uses descriptive /levels anchor text ──
  check(
    "Level page related section uses \"Browse All Color Block Jam Levels\"",
    levelPage.includes("Browse All Color Block Jam Levels"),
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();