import { Page } from "@playwright/test";
import { test, expect } from './testSetup';
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
  await page.goto("http://localhost:5173/invalid-route");
  await expect(page.getByText("Oops")).toBeVisible();
});

test("login", async ({ page }) => {
  await init(page);
  await page.getByRole("link", { name: "Login" }).click();
  await loginAsDiner(page);
  await expect(
    page.getByRole("link", { name: "T", exact: true })
  ).toBeVisible();
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
      password: "f",
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
      admins: [{ id: "4", name: "Franchisee", email: "f@franchisee.com" }],
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

  // gets currently logged in user
  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  // orders two pizzas / gets orders for diner
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
  await page.route(/\/api\/franchise\/([a-zA-Z0-9]+)$/, async (route) => {
    if (route.request().method() !== "DELETE") {
      return route.fallback();
    }
    const match = route
      .request()
      .url()
      .match(/\/api\/franchise\/([a-zA-Z0-9]+)/);
    const franchiseId = match ? match[1] : null;
    const ind = validFranchises.findIndex(
      (franchise) => franchise.id === franchiseId
    );
    validFranchises.splice(ind, 1);

    const franchiseRes = {
      franchises: validFranchises,
    };
    expect(route.request().method()).toBe("DELETE");
    await route.fulfill({ json: franchiseRes });
  });

  // create franchise
  await page.route("*/**/api/franchise", async (route) => {
    const req = route.request().postDataJSON();
    if (!loggedInUser || !Role.isRole(loggedInUser, Role.Admin)) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    validFranchises.push({ id: "5", name: req.name, stores: [] });
    const franchiseRes = {
      validFranchises,
    };
    expect(route.request().method()).toBe("POST");
    await route.fulfill({ json: franchiseRes });
  });

  // close store
  await page.route(
    /\/api\/franchise\/([a-zA-Z0-9]+)\/store\/([a-zA-Z0-9]+)$/,
    async (route) => {
      if (!loggedInUser || !Role.isRole(loggedInUser, Role.Admin)) {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
        return;
      }
      const match = route
        .request()
        .url()
        .match(/\/api\/franchise\/([a-zA-Z0-9]+)/);
      const franchiseId = match ? match[1] : null;
      const storeId = match ? match[2] : null;
      const franchiseInd = validFranchises.findIndex(
        (franchise) => franchise.id === franchiseId
      );
      const ind = validFranchises
        .find((franchise) => franchise.id === franchiseId)
        ?.stores.findIndex((store) => store.id === storeId);
      if (ind) validFranchises[franchiseInd].stores.splice(ind, 1);

      const franchiseRes = {
        franchises: validFranchises,
      };
      expect(route.request().method()).toBe("DELETE");
      await route.fulfill({ json: franchiseRes });
    }
  );

  // create franchise
  await page.route(
    /\/api\/franchise\/([a-zA-Z0-9]+)\/store$/,
    async (route) => {
      if (route.request().method() !== "POST") {
        return route.fallback();
      }
      const req = route.request().postDataJSON();
      const match = route
        .request()
        .url()
        .match(/\/api\/franchise\/([a-zA-Z0-9]+)/);
      const franchiseId = match ? match[1] : null;
      const ind = validFranchises.findIndex(
        (franchise) => franchise.id === franchiseId
      );
      const newStore = {
        id: "10",
        name: req.name,
        totalRevenue: 0,
      };

      validFranchises[ind].stores.push(newStore);

      expect(route.request().method()).toBe("POST");
      await route.fulfill({ json: newStore });
    }
  );

  await page.goto("http://localhost:5173/");
}

async function loginAsDiner(page: Page) {
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


async function orderPizzas(page: Page) {
  await page.getByRole("button", { name: "Order now" }).click();
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await page.getByRole("link", { name: "Image Description Veggie" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
}
