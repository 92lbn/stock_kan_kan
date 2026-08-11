import { expect, test, type Page } from "@playwright/test";

const identifier = process.env.E2E_ADMIN_IDENTIFIER ?? "admin";
const password = process.env.E2E_ADMIN_PASSWORD ?? "Admin-test-2026!";

async function login(page: Page, baseURL: string) {
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Identifiant").fill(identifier);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
}

test("connexion à l'application Planning", async ({ page }) => {
  await login(page, "http://127.0.0.1:3000");
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
});

test("historique de pointage en lecture seule", async ({ page }) => {
  await login(page, "http://127.0.0.1:3000");
  await page.goto("http://127.0.0.1:3000/pointage");
  await expect(page.getByRole("heading", { name: /Historique/ })).toBeVisible();
  await expect(page.getByText("Le pointage se fait sur la tablette")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pointer (l'arrivée|le départ)/ })).toHaveCount(0);
});

test("pointage kiosk par PIN sur la tablette", async ({ page }) => {
  await login(page, "http://127.0.0.1:3000");
  await page.goto("http://127.0.0.1:3000/employees");
  await page.getByRole("button", { name: "Ajouter un compte" }).click();
  const suffix = Date.now().toString();
  const employeeName = `Kiosk E2E ${suffix}`;
  await page.getByLabel("Identifiant").fill(`kiosk-${suffix}`);
  await page.getByLabel("Nom").fill(employeeName);
  await page.getByLabel("Mot de passe").fill("Employe-test-2026!");
  await page.getByLabel("PIN de pointage (optionnel)").fill("2468");
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByText(employeeName)).toBeVisible();

  await page.goto("http://127.0.0.1:3001/pointage");
  await page.getByRole("button", { name: new RegExp(employeeName) }).click();
  await page.getByLabel("PIN personnel").fill("2468");
  await page.getByRole("button", { name: "Pointer l’arrivée" }).click();
  await expect(page.getByText(`Arrivée de ${employeeName} enregistrée.`)).toBeVisible();

  await page.getByRole("button", { name: new RegExp(employeeName) }).click();
  await page.getByLabel("PIN personnel").fill("2468");
  await page.getByRole("button", { name: "Pointer le départ" }).click();
  await expect(page.getByText(`Départ de ${employeeName} enregistré.`)).toBeVisible();
});

test("création d'un article puis mouvement de stock", async ({ page }) => {
  await login(page, "http://127.0.0.1:3001");
  await page.goto("http://127.0.0.1:3001/stock");
  await page.getByRole("button", { name: "Ajouter un article" }).click();
  const name = `Article E2E ${Date.now()}`;
  await page.getByLabel("Nom de l'article").fill(name);
  await page.getByLabel("Unité").fill("pièce");
  await page.getByLabel("Quantité").fill("1");
  await page.getByLabel("DLC du stock initial").fill("2099-12-31");
  await page.getByRole("button", { name: "Ajouter l'article" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByText(name).click();
  await page.getByPlaceholder(/Quantité/).fill("2");
  await page.getByLabel("DLC", { exact: true }).fill("2099-12-31");
  await page.getByRole("button", { name: "Valider le mouvement" }).click();
  await expect(page.getByText(name)).toBeVisible();
});

test("création d'un employé puis d'un créneau", async ({ page }) => {
  await login(page, "http://127.0.0.1:3000");
  await page.goto("http://127.0.0.1:3000/employees");
  await page.getByRole("button", { name: "Ajouter un compte" }).click();
  const suffix = Date.now().toString();
  const employeeName = `Employé E2E ${suffix}`;
  await page.getByLabel("Identifiant").fill(`e2e-${suffix}`);
  await page.getByLabel("Nom").fill(employeeName);
  await page.getByLabel("Mot de passe").fill("Employe-test-2026!");
  await page.getByRole("button", { name: "Créer le compte" }).click();
  await expect(page.getByText(employeeName)).toBeVisible();

  await page.goto("http://127.0.0.1:3000/planning");
  await page.getByRole("button", { name: "Ajouter un créneau", exact: true }).click();
  await page.getByLabel("Employé").selectOption({ label: employeeName });
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Date").fill(tomorrow);
  await page.getByLabel("Début").fill("10:00");
  await page.getByLabel("Fin").fill("14:00");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText(employeeName)).toBeVisible();
});
