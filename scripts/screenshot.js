const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto("http://localhost:3000/adopta", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/adopta-full.png", fullPage: true });

  await page.goto("http://localhost:3000/tienda", { waitUntil: "networkidle" });
  await page.screenshot({ path: "/tmp/tienda-full.png", fullPage: true });

  console.log(JSON.stringify({ consoleErrors }, null, 2));
  await browser.close();
})().catch((err) => {
  console.error("SCREENSHOT_FAILED", err);
  process.exit(1);
});
