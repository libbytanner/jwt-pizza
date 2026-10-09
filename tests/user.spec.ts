import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";
import { init, loginAsDiner } from "./utils";


test("update username", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await page.getByRole("link", { name: "T", exact: true }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await page.getByRole("link", { name: "pd", exact: true }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

test("update user password", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await page.getByRole("link", { name: "T", exact: true }).click();

  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator("#password").click();
  await page.locator("#password").fill("newPassword");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("Test");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page.getByRole("textbox", { name: "Email address" }).fill('t@test.com');
  await page.getByRole("textbox", { name: "Password" }).fill("newPassword");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "T", exact: true }).click();

  await expect(page.getByRole("main")).toContainText("Test");
});
test("update user email", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await page.getByRole("link", { name: "T", exact: true }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.locator('input[type="email"]').fill("new@email.com");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("Test");

  await page.getByRole("link", { name: "Logout" }).click();
  await page.getByRole("link", { name: "Login" }).click();

  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("new@email.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Login" }).click();

  await page.getByRole("link", { name: "T", exact: true }).click();

  await expect(page.getByRole("main")).toContainText("Test");
});