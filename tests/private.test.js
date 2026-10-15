const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { startApp, tokenFor, settle } = require("./support/app");
const { createUser } = require("./support/users");

let app;
let User;
let Income;
let Expense;
beforeAll(async () => {
  app = await startApp();
  User = require("../model/user");
  Income = require("../model/income");
  Expense = require("../model/expense");
});
afterAll(() => app.stop());
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Income.deleteMany({}), Expense.deleteMany({})]);
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const post = (path, token, body) => {
  const req = request(app.server).post(`/private${path}`);
  if (token) req.set("Authorization", token);
  return req.send(body);
};
const getData = (token) => request(app.server).get("/private/getdata").set("Authorization", token);
const entry = { category: "Salary", amount: 5000, description: "October pay", createdat: "2022-04-01", subject: "Pay" };

describe("the login check (verifyuser)", () => {
  test.each([
    ["no token", undefined],
    ["a malformed token", "not-a-jwt"],
    ["a token signed with another secret", jwt.sign({ id: "x" }, "another-secret")],
  ])("refuses %s", async (_label, token) => {
    const res = await post("/income", token, entry);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "User not authenticated", code: 888 });
  });

  // FINDING: it compares err.message with "TokenExpiredError", but that is the error's *name*
  // (the message is "jwt expired"), so the "Access token expired" answer is never given.
  test.failing("tells the client when the token has expired", async () => {
    const user = await createUser();
    const expired = tokenFor(user, { expiresIn: -10 });
    const res = await post("/income", expired, entry);
    expect(res.body).toEqual({ code: "120", msg: "Access token expired" });
  });

  test("an expired token is currently reported as not authenticated", async () => {
    const user = await createUser();
    const res = await post("/income", tokenFor(user, { expiresIn: -10 }), entry);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(888);
  });
});

describe("POST /private/income and /private/expense", () => {
  test.each([
    ["/income", () => Income],
    ["/expense", () => Expense],
  ])("%s stores the entry for the signed-in user", async (path, model) => {
    const user = await createUser();
    const res = await post(path, tokenFor(user), entry);

    expect(res.status).toBe(200);
    const [saved] = await model().find();
    expect(saved).toMatchObject({ userid: String(user._id), category: "Salary", amount: 5000, subject: "Pay", description: "October pay" });
    expect(saved.createdat.toISOString()).toBe("2022-04-01T00:00:00.000Z");
  });

  // FINDING: adding income answers "expenses added" (copied from the expense handler).
  test.failing("adding income says income was added", async () => {
    const user = await createUser();
    const res = await post("/income", tokenFor(user), entry);
    expect(res.body.msg).toMatch(/income/i);
  });

  test.each(["/income", "/expense"])("%s refuses missing details", async (path) => {
    const user = await createUser();
    for (const field of Object.keys(entry)) {
      const { [field]: _left, ...body } = entry;
      const res = await post(path, tokenFor(user), body);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ msg: "please filled all details", code: "501" });
    }
  });

  test.each(["/income", "/expense"])("%s refuses a token without a user id", async (path) => {
    const token = jwt.sign({ email: "x@example.com" }, process.env.REFRESH_TOKEN_SECRET);
    const res = await post(path, token, entry);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "invalid credntials", code: "508" });
  });

  // The save fails (an amount that is not a number); the .catch refers to an undefined `error`,
  // so it throws and the outer catch answers instead.
  test.each([
    ["/income", "unable to add Income try later"],
    ["/expense", "unable to add expense try later"],
  ])("%s answers 403 when the entry cannot be saved", async (path, msg) => {
    const user = await createUser();
    const res = await post(path, tokenFor(user), { ...entry, amount: "lots" });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ msg, code: "100" });
  });
});

describe("POST /private/resetpass", () => {
  test("changes the password when the current one is right", async () => {
    const user = await createUser();
    const res = await post("/resetpass", tokenFor(user), { current_pass: "secret-pass", new_pass: "new-pass-1" });
    await settle(); // the handler does not wait for the save

    expect(res.status).toBe(200);
    expect(res.body).toBe("password reset");
    const saved = await User.findById(user._id);
    expect(await bcrypt.compare("new-pass-1", saved.password)).toBe(true);
  });

  test("refuses a wrong current password", async () => {
    const user = await createUser();
    const res = await post("/resetpass", tokenFor(user), { current_pass: "wrong", new_pass: "x" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "please enter valid credentials  ", code: "503" });
    expect(await bcrypt.compare("secret-pass", (await User.findById(user._id)).password)).toBe(true);
  });

  test("refuses missing details", async () => {
    const user = await createUser();
    const res = await post("/resetpass", tokenFor(user), { current_pass: "secret-pass" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "please filled all details", code: "501" });
  });

  test("refuses when the account no longer exists", async () => {
    const user = await createUser();
    await User.deleteOne({ _id: user._id });
    const res = await post("/resetpass", tokenFor(user), { current_pass: "secret-pass", new_pass: "x" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "please enter valid credentials ", code: "503" });
  });

  test("answers 403 when the database fails", async () => {
    const user = await createUser();
    jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("db down"));
    const res = await post("/resetpass", tokenFor(user), { current_pass: "a", new_pass: "b" });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ msg: "unable to reset try later", code: "100" });
  });
});

describe("GET /private/getdata", () => {
  test("returns my profile without the password, and only my income and expenses", async () => {
    const me = await createUser({ name: "Me" });
    const other = await createUser({ name: "Other" });
    await post("/income", tokenFor(me), entry);
    await post("/expense", tokenFor(me), { ...entry, category: "Food", amount: 200 });
    await post("/income", tokenFor(other), { ...entry, amount: 1 });

    const res = await getData(tokenFor(me));

    expect(res.status).toBe(200);
    expect(res.body.userdata).toMatchObject({ name: "Me", email: me.email });
    expect(res.body.userdata).not.toHaveProperty("password");
    expect(res.body.getincome.map((i) => i.amount)).toEqual([5000]);
    expect(res.body.getexpense.map((e) => e.category)).toEqual(["Food"]);
  });

  test("answers 403 when the database fails", async () => {
    const me = await createUser();
    jest.spyOn(Income, "find").mockImplementationOnce(() => Promise.reject(new Error("db down")));
    const res = await getData(tokenFor(me));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: "100" });
  });
});

describe("POST /private/userdata", () => {
  const profile = {
    name: "New Name",
    about: "Saving up",
    twitterpro: "https://twitter.com/me",
    facebookpro: "https://facebook.com/me",
    instapro: "https://instagram.com/me",
    linkedpro: "https://linkedin.com/in/me",
  };

  test("updates my profile", async () => {
    const me = await createUser();
    const res = await post("/userdata", tokenFor(me), profile);
    await settle(); // the handler does not wait for the save

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ msg: "updated" });
    expect(await User.findById(me._id).lean()).toMatchObject(profile);
  });

  test("refuses missing details", async () => {
    const me = await createUser();
    const { about: _about, ...partial } = profile;
    const res = await post("/userdata", tokenFor(me), partial);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("501");
  });

  test("refuses a token without a user id", async () => {
    const res = await post("/userdata", jwt.sign({ email: "x" }, process.env.REFRESH_TOKEN_SECRET), profile);
    expect(res.body).toEqual({ msg: "invalid credntials", code: "508" });
  });

  test("refuses when the account no longer exists", async () => {
    const me = await createUser();
    await User.deleteOne({ _id: me._id });
    const res = await post("/userdata", tokenFor(me), profile);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("503");
  });

  test("answers 403 when the database fails", async () => {
    const me = await createUser();
    jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("db down"));
    const res = await post("/userdata", tokenFor(me), profile);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ msg: "unable update userdata try later", code: "100" });
  });
});

describe("unfinished endpoints", () => {
  test("/updatepro needs no login and only answers \"hi\"", async () => {
    const res = await post("/updatepro", undefined, { name: "x" });
    expect(res.status).toBe(200);
    expect(res.body).toBe("hi");
  });

  test("/logout answers \"logout\"", async () => {
    const res = await post("/logout");
    expect(res.text).toBe("logout");
  });

  // FINDING: logout does nothing on the server. Tokens are stored in the `refesh` collection
  // but never checked or removed, so a token keeps working for its full 10 days after logout.
  test.failing("a token stops working after logout", async () => {
    const me = await createUser();
    const token = tokenFor(me);
    await post("/logout", token);
    const res = await getData(token);
    expect(res.status).toBe(403);
  });
});
