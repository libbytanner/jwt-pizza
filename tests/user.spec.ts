import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Role, User } from "../src/service/pizzaService";


test("update username", async ({ page }) => {
  await init(page);
  await loginAsDiner(page);
  await page.getByRole("link", { name: "T", exact: true }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("h3")).toContainText("Edit user");
  await page.getByRole("textbox").first().fill("pizza dinerx");
  await page.getByRole("button", { name: "Update" }).click();

  await page.waitForSelector('[role="dialog"].hidden', { state: "attached" });

  await expect(page.getByRole("main")).toContainText("pizza dinerx");

  await page.getByRole("link", { name: "Logout" }).click();
  await loginAsDiner(page);
  await page.getByRole("link", { name: "pd", exact: true }).click();

  await expect(page.getByRole("main")).toContainText("pizza dinerx");
});

test("update user password", async ({ page }) => {
  await init(page);
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

async function init(page: Page) {
  let loggedInUser: User | undefined;
  let validUsers: Record<string, User> = {
    "t@test.com": {
      id: "767",
      name: "Test",
      email: "t@test.com",
      password: "test",
      roles: [{ role: Role.Diner }],
    },
    "a@admin.com": {
      id: "3",
      name: "Mr. Admin",
      email: "a@admin.com",
      password: "a",
      roles: [{ role: Role.Admin }],
    },
    "f@franchisee.com": {
      id: "4",
      name: "Franchisee",
      email: "f@franchisee.com",
      password: "f",
      roles: [{ role: Role.Franchisee }],
    },
  };

  // Register user
  await page.route("*/**/api/auth", async (route) => {
    if (route.request().method() !== "POST") {
      route.fallback();
      return;
    }
    const registerReq = route.request().postDataJSON();
    const user = {
      id: "5",
      name: registerReq.name,
      email: registerReq.email,
      roles: [{ role: Role.Diner }],
    };
    const registerRes = {
      user,
      token: "abcdef",
    };
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ json: registerRes });
  });

  // login
  await page.route("*/**/api/auth", async (route) => {
    if (route.request().method() !== "PUT") {
      route.fallback();
      return;
    }
    const loginReq = route.request().postDataJSON();
    const user = validUsers[loginReq.email];
    if (!user || user.password !== loginReq.password) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    loggedInUser = validUsers[loginReq.email];
    const loginRes = {
      user: loggedInUser,
      token: "abcdef",
    };
    expect(route.request().method()).toBe("PUT");
    await route.fulfill({ json: loginRes });
  });

  // logout
  await page.route("*/**/api/auth", async (route) => {
    if (route.request().method() !== "DELETE") {
      route.fallback();
      return;
    }
    const logoutReq = route.request().postDataJSON();
    loggedInUser = undefined;
    const logoutRes = {
      message: "logout successful",
    };
    expect(route.request().method()).toBe("DELETE");
    await route.fulfill({ json: logoutRes });
  });

  // gets currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // updates user
  await page.route(/\/api\/user\/([a-zA-Z0-9]+)$/, async (route) => {
    const updateReq = route.request().postDataJSON();
    const match = route
      .request()
      .url()
      .match(/\/api\/user\/([a-zA-Z0-9]+)/);
    const userId = match ? match[1] : null;
    const user = Object.values(validUsers).find((valid) => valid.id === userId);
    validUsers[updateReq.email] = {
      name: updateReq.name,
      email: updateReq.email,
      password: updateReq.password ?? user?.password,
      id: user?.id,
      roles: user?.roles,
    };

    if (user?.email !== updateReq.email) {
      const oldEmail = user?.email ?? "";
      const { [oldEmail]: oldUser, ...rest } = validUsers;
      validUsers = rest;
    }

    const updateRes = {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      roles: [{ role: "diner" }],
    };

    expect(route.request().method()).toBe("PUT");
    await route.fulfill({ json: loggedInUser });
  });

  await page.route("*/**/api/order", async (route) => {
    let orderRes: any;
    if (route.request().method() === "POST") {
      const orderReq = route.request().postDataJSON();
      orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: "eyJpYXQ",
      };
      expect(route.request().method()).toBe("POST");
    }
    if (route.request().method() === "GET") {
      orderRes = {
        dinerId: 4,
        orders: [
          {
            id: 1,
            franchiseId: 1,
            storeId: 1,
            date: "2024-06-05T05:14:40.000Z",
            items: [{ id: 1, menuId: 1, description: "Veggie", price: 0.05 }],
          },
        ],
        page: 1,
      };
      expect(route.request().method()).toBe("GET");
    }
  });
  await page.goto("http://localhost:5173/");
}

async function loginAsDiner(page: Page) {
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("t@test.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Login" }).click();
}

async function loginAsAdmin(page: Page) {
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("a@admin.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();
}
