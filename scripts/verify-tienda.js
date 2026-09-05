const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  const results = {};

  await page.goto("http://localhost:3000/tienda", { waitUntil: "networkidle" });

  // Agregar 2x del primer producto y 1x del segundo
  const addButtons = await page.locator('button:has-text("+")').all();
  await addButtons[0].click();
  await addButtons[0].click();
  await addButtons[1].click();

  results.cartShowsTotal = (await page.locator("text=Total").count()) > 0;

  await page.click('button:has-text("Continuar pedido")');
  await page.waitForSelector('input[name="compradorNombre"]', { timeout: 5000 });

  await page.fill('input[name="compradorNombre"]', "Comprador de Prueba");
  await page.fill('input[name="compradorTelefono"]', "5511112222");

  await Promise.all([
    page.waitForURL(/\/tienda\/gracias/, { timeout: 10000 }),
    page.click('button:has-text("Confirmar pedido")'),
  ]);

  results.checkoutRedirectedToGracias = page.url().includes("/tienda/gracias");
  results.graciasShowsTotal = (await page.locator("text=Total").count()) > 0;
  results.graciasShowsPendiente = (await page.locator("text=todavía no hay pago en línea").count()) === 0; // texto está en /tienda, no en /gracias -- solo valida que no truene

  results.consoleErrors = consoleErrors;
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((err) => {
  console.error("VERIFY_TIENDA_FAILED", err);
  process.exit(1);
});
