import { Page } from "@playwright/test";
import { expect } from "playwright-test-coverage";
import { User, Role, Franchise } from "../src/service/pizzaService";

export async function init(page: Page) {
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

  // get user franchises
  await page.route(/\/api\/franchise\/([a-zA-Z0-9]+)$/, async (route) => {
    if (route.request().method() !== "GET") {
      return route.fallback();
    }
    const match = route
      .request()
      .url()
      .match(/\/api\/franchise\/([a-zA-Z0-9]+)/);
    const userId = match ? match[1] : null;
    if (userId !== loggedInUser?.id) {
    }
    const userFranchises = validFranchises.filter((franchise) =>
      franchise.admins?.some((admin) => admin.id === userId)
    );

    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: userFranchises });
  });

  await page.goto("http://localhost:5173/");
} 

export async function loginAsDiner(page: Page) {
  await page.getByRole("textbox", { name: "Email address" }).fill("t@test.com");
  await page.getByRole("textbox", { name: "Password" }).fill("test");
  await page.getByRole("button", { name: "Login" }).click();
}

export async function loginAsAdmin(page: Page) {
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("a@admin.com");
  await page.getByRole("textbox", { name: "Password" }).fill("a");
  await page.getByRole("button", { name: "Login" }).click();
}

export async function loginAsFranchisee(page: Page) {
  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("f@franchisee.com");
  await page.getByRole("textbox", { name: "Password" }).fill("f");
  await page.getByRole("button", { name: "Login" }).click();
}

export async function orderPizzas(page: Page) {
  await page.getByRole("button", { name: "Order now" }).click();
  await page.getByRole("combobox").selectOption("4");
  await page.getByRole("link", { name: "Image Description Pepperoni" }).click();
  await page.getByRole("link", { name: "Image Description Veggie" }).click();
  await page.getByRole("button", { name: "Checkout" }).click();
}
