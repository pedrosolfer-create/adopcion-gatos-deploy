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

  // 1. /reportes sin sesión -> debe mostrar login, no el dashboard
  await page.goto("http://localhost:3000/reportes", { waitUntil: "networkidle" });
  results.reportesShowsLoginWhenLoggedOut = (await page.locator("text=Acceso del equipo").count()) > 0;

  // 2. login del equipo con password incorrecta -> debe rechazar
  await page.fill('input[name="password"]', "password-incorrecta");
  await Promise.all([page.waitForURL(/error=1/, { timeout: 10000 }), page.click('button[type="submit"]')]);
  await page.waitForSelector("text=incorrectos", { timeout: 10000 });
  results.equipoRejectsWrongPassword = (await page.locator("text=incorrectos").count()) > 0;

  // 3. login del equipo con password correcta -> debe mostrar el dashboard
  await page.fill('input[name="password"]', "equipo-test-2026");
  await Promise.all([
    page.waitForSelector("text=Avances de la búsqueda de adoptantes", { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  results.equipoLoginWorks = (await page.locator("text=Avances de la búsqueda de adoptantes").count()) > 0;

  // 4. /refugio sin sesión -> debe mostrar login (usuario + password)
  await page.goto("http://localhost:3000/refugio", { waitUntil: "networkidle" });
  results.refugioShowsLoginWhenLoggedOut =
    (await page.locator("text=Acceso del refugio").count()) > 0 &&
    (await page.locator('input[name="usuario"]').count()) > 0;

  // 5. login del refugio con credenciales incorrectas -> debe rechazar
  await page.fill('input[name="usuario"]', "patitas-felices");
  await page.fill('input[name="password"]', "password-mala");
  await Promise.all([page.waitForURL(/error=1/, { timeout: 10000 }), page.click('button[type="submit"]')]);
  await page.waitForSelector("text=incorrectos", { timeout: 10000 });
  results.refugioRejectsWrongPassword = (await page.locator("text=incorrectos").count()) > 0;

  // 6. login del refugio correcto -> debe mostrar el panel con sus datos
  await page.fill('input[name="usuario"]', "patitas-felices");
  await page.fill('input[name="password"]', "demo1234");
  await Promise.all([
    page.waitForSelector("text=Refugio Patitas Felices", { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  results.refugioLoginWorks = (await page.locator("text=Refugio Patitas Felices").count()) > 0;
  results.refugioShowsOwnCats =
    (await page.locator("text=Blackie").count()) > 0 && (await page.locator("text=Nube").count()) > 0;
  results.refugioShowsResponsable = (await page.locator("text=Tessie Sit").count()) > 0;

  // 7. un refugio NO debe ver los gatos/datos de otro -- aquí solo hay uno
  // sembrado, así que se verifica que no aparece nada del equipo (que no
  // tiene "Bitácora diaria" en /refugio, esa etiqueta es solo de /reportes)
  results.refugioDoesNotShowEquipoBitacoraLabel = (await page.locator("text=Bitácora diaria").count()) === 0;

  // 8. logout del refugio -> debe regresar a login
  await Promise.all([
    page.waitForSelector("text=Acceso del refugio", { timeout: 10000 }),
    page.click('button:has-text("Salir")'),
  ]);
  results.refugioLogoutWorks = (await page.locator("text=Acceso del refugio").count()) > 0;

  // 9. login de refugio otra vez, agregar un gato nuevo desde el panel y
  // confirmar que aparece en la lista sin recargar manualmente
  await page.goto("http://localhost:3000/refugio", { waitUntil: "networkidle" });
  await page.fill('input[name="usuario"]', "patitas-felices");
  await page.fill('input[name="password"]', "demo1234");
  await Promise.all([
    page.waitForSelector("text=Refugio Patitas Felices", { timeout: 10000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.click("text=+ Agregar gato");
  await page.fill('input[name="nombre"]', "Michi de Prueba");
  await Promise.all([
    page.waitForSelector("text=Michi de Prueba", { timeout: 10000 }),
    page.click('button:has-text("Guardar gato")'),
  ]);
  results.refugioAddGatoWorks = (await page.locator("text=Michi de Prueba").count()) > 0;

  // 10. /adopta -- revisar que la sección de donativos con tiers está
  await page.goto("http://localhost:3000/adopta", { waitUntil: "networkidle" });
  results.adoptaShowsDonationTiers =
    (await page.locator("text=$100 MXN").count()) > 0 && (await page.locator("text=$600 MXN").count()) > 0;
  results.adoptaShowsAdoptaYDona = (await page.locator("text=Adopta y dona").count()) > 0;

  // 11. el formulario público sigue funcionando de punta a punta (crea un
  // Lead real y termina en /adopta/gracias) -- confirma que el cambio de
  // firma de createLead (refugioId opcional) no rompió nada.
  await page.fill('input[name="nombre"]', "Prueba Automática");
  await page.fill('input[name="telefono"]', "5500000000");
  await page.fill('input[name="ciudad"]', "CDMX");
  await Promise.all([
    page.waitForURL(/\/adopta\/gracias/, { timeout: 10000 }),
    page.click('button:has-text("Enviar solicitud")'),
  ]);
  results.adoptaFormSubmitWorks = page.url().includes("/adopta/gracias");

  results.consoleErrors = consoleErrors;

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((err) => {
  console.error("VERIFY_FAILED", err);
  process.exit(1);
});
