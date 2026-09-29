import { Page } from "@playwright/test";
import { test, expect } from "playwright-test-coverage";
import { Franchise, Role, User } from "../src/service/pizzaService";

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
});

test("login", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(
    page.getByRole("link", { name: "T", exact: true })
  ).toBeVisible();
});

test("purchase with login", async ({ page }) => {
  await init(page);
  await page.getByRole("button", { name: "Order now" }).click();
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await page.getByRole("link", { name: "Image Description Veggie" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
  await loginAsDiner(page);
  await expect(page.getByRole("cell", { name: "Pepperoni" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Veggie" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "pies" })).toBeVisible();
  await page.getByRole("button", { name: "Pay now" }).click();
  await page.getByText("VerifyOrder more").click();
  await expect(page.getByText("VerifyOrder more")).toBeVisible();
});

test("admin view franchises", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
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
  await page.getByRole("link", { name: "Login" }).click();
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

async function init(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
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
      password: "test",
      roles: [{ role: Role.Franchisee }],
    },
  };

  const validFranchises: Franchise[] = [
    {
      id: "2",
      name: "LotaPizza",
      stores: [
        { id: "4", name: "Lehi", totalRevenue: 0.003 },
        { id: "5", name: "Springville", totalRevenue: 0.5 },
        { id: "6", name: "American Fork", totalRevenue: 0 },
      ],
    },
    {
      id: "3",
      name: "PizzaCorp",
      stores: [{ id: "7", name: "Spanish Fork" }],
    },
    { id: "4", name: "topSpot", stores: [] },
  ];

  // Authorize login for the given user
  await page.route("*/**/api/auth", async (route) => {
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

  // gets currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // orders two pizzas
  await page.route("*/**/api/order", async (route) => {
    const orderReq = route.request().postDataJSON();
    const orderRes = {
      order: { ...orderReq, id: 23 },
      jwt: "eyJpYXQ",
    };
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ json: orderRes });
  });
  // Gets menu
  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  
  // gets franchises and stores
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }

    const franchiseRes = {
      franchises: validFranchises,
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  // delete franchise
  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    if (route.request().method() !== "DELETE") {
      return route.fallback();
    }

    const franchiseRes = {
      franchises: validFranchises,
    };
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: franchiseRes });
  });

  //create franchise
  await page.route("*/**/api/franchise", async (route) => {
    if (route.request().method() === 'POST') {
      route.continue()
    }
    const req = route.request().postDataJSON();
    if (!loggedInUser || !Role.isRole(loggedInUser, Role.Admin)) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    validFranchises.push(req);
    const franchiseRes = {
      validFranchises,
    };
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ json: franchiseRes });
  });

  await page.goto("http://localhost:5173/");
}

async function loginAsDiner(page: Page) {
  await page.getByRole("textbox", { name: "Email address" }).fill("t@test.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Login" }).click();
}

async function loginAsAdmin(page: Page) {
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("a@admin.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();
}
