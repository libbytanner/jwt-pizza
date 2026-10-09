import { Page } from "@playwright/test";
import { test, expect } from "./testSetup";
import { init, loginAsAdmin, loginAsDiner, loginAsFranchisee, orderPizzas } from "./utils";

test("home page loads", async ({ page }) => {
  await page.goto("http://localhost:5173/");
  expect(await page.title()).toBe("JWT Pizza");
});

test("test static pages", async ({ page }) => {
  await init(page);
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByText("So you want a piece of the")).toBeVisible();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByText("The secret sauce")).toBeVisible();
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Mama Rucci, my my")).toBeVisible();
  await page.goto("http://localhost:5173/invalid-route");
  await expect(page.getByText("Oops")).toBeVisible();
});

test("register", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Register" }).click();
  await page.getByRole("textbox", { name: "Full name" }).fill("Test User");
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("test@test.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();
  await expect(page.getByRole("link", { name: "TU" })).toBeVisible();
});

test("login", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(
    page.getByRole("link", { name: "T", exact: true })
  ).toBeVisible();
});

test("logout", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(
    page.getByRole("link", { name: "T", exact: true })
  ).toBeVisible();
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
});

test("diner dashboard", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(page.getByText("The web's best pizza").first()).toBeVisible();
  await orderPizzas(page);
  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page.getByText("VerifyOrder more")).toBeVisible();
  await page.getByRole("link", { name: "T", exact: true }).click();
  await expect(page.getByText("Your pizza kitchen")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "1", exact: true })
  ).toBeVisible();
});

test("purchase pizzas", async ({ page }) => {
  await init(page);
  await orderPizzas(page);
  // await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(page.getByRole("cell", { name: "Pepperoni" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Veggie" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "pies" })).toBeVisible();
  await page.getByRole("button", { name: "Pay now" }).click();
  await expect(page.getByText("VerifyOrder more")).toBeVisible();
});

test("admin view franchises", async ({ page }) => {
  await init(page);
  await loginAsAdmin(page);
  await expect(page.getByRole("link", { name: "MA" })).toBeVisible();
  await page.getByRole("link", { name: "Admin" }).click();
  await expect(page.getByText("Mama Ricci's kitchen")).toBeVisible();
  await expect(page.getByRole("cell", { name: "LotaPizza" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "PizzaCorp" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "topSpot" })).toBeVisible();
});

test("admin add and delete franchise", async ({ page }) => {
  await init(page);
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Admin" }).click();

  await page.getByRole("button", { name: "Add Franchise" }).click();
  await page
    .getByRole("textbox", { name: "franchise name" })
    .fill("TEST FRANCHISE");
  await page
    .getByRole("textbox", { name: "franchisee admin email" })
    .fill("f@franchisee.com");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(
    page.getByRole("cell", { name: "TEST FRANCHISE" })
  ).toBeVisible();
  await page
    .getByRole("row", { name: "TEST FRANCHISE Close" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "Cancel" }).click();

  await expect(
    page.getByRole("cell", { name: "TEST FRANCHISE" })
  ).toBeVisible();
  await page
    .getByRole("row", { name: "TEST FRANCHISE Close" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("Mama Ricci's")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "TEST FRANCHISE" })
  ).not.toBeVisible();
});

test("admin close store", async ({ page }) => {
  await init(page);
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Admin" }).click();
  await page
    .getByRole("row", { name: "American Fork 0 ₿ Close" })
    .getByRole("button")
    .click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("cell", { name: "Lehi" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "American Fork" })
  ).not.toBeVisible();
});

test("view franchisee dashboard", async ({ page }) => {
  await init(page);
  await loginAsFranchisee(page);
  await expect(page.getByText("The web's best pizza").first()).toBeVisible();
  await page
    .getByRole("navigation", { name: "Global" })
    .getByRole("link", { name: "Franchise" })
    .click();
  await expect(page.getByText("LotaPizza")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Lehi" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "0.003 ₿" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create store" })
  ).toBeVisible();
});

test("create store as franchisee", async ({ page }) => {
  await init(page);
  await loginAsFranchisee(page);
  await page
    .getByRole("navigation", { name: "Global" })
    .getByRole("link", { name: "Franchise" })
    .click();
  await page.getByRole("button", { name: "Create store" }).click();
  await page.getByRole("textbox", { name: "store name" }).fill("New Store");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("cell", { name: "New Store" })).toBeVisible();
});