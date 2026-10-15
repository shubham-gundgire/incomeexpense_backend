const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { startApp } = require("./support/app");
const { createUser } = require("./support/users");

let app;
let User;
let Refresh;
beforeAll(async () => {
  app = await startApp();
  User = require("../model/user");
  Refresh = require("../model/refresh");
});
afterAll(() => app.stop());
beforeEach(async () => {
  await User.deleteMany({});
  await Refresh.deleteMany({});
});

const register = (body) => request(app.server).post("/auth/register").send(body);
const login = (body) => request(app.server).post("/auth/login").send(body);

describe("POST /auth/register", () => {
  test("creates the user with a hashed password and answers with a 10-day token", async () => {
    const res = await register({ name: "Asha", email: "asha@example.com", password: "pa55word" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ msg: "user register sucesfully", code: 201 });
    const saved = await User.findOne({ email: "asha@example.com" });
    expect(saved.password).not.toBe("pa55word");
    expect(await bcrypt.compare("pa55word", saved.password)).toBe(true);
    expect(saved).toMatchObject({ twitterpro: "https://twitter.com/#", linkedpro: "https://linkedin.com/#" });

    const claims = jwt.verify(res.body.token, process.env.REFRESH_TOKEN_SECRET);
    expect(claims).toMatchObject({ id: String(saved._id), email: "asha@example.com" });
    expect(claims.exp - claims.iat).toBe(10 * 24 * 60 * 60);
    expect(await Refresh.countDocuments({ refreshtoken: res.body.token })).toBe(1);
  });

  test.each([
    [{ email: "a@example.com", password: "x" }],
    [{ name: "A", password: "x" }],
    [{ name: "A", email: "a@example.com" }],
    [{}],
  ])("refuses missing details: %j", async (body) => {
    const res = await register(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "please filled all details", code: "501" });
    expect(await User.countDocuments()).toBe(0);
  });

  test("refuses an email that is already registered", async () => {
    await createUser({ email: "taken@example.com" });
    const res = await register({ name: "B", email: "taken@example.com", password: "x" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "user already present ", code: "502" });
    expect(await User.countDocuments()).toBe(1);
  });

  test("answers 403 when the token cannot be signed (no secret configured)", async () => {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    delete process.env.REFRESH_TOKEN_SECRET;
    try {
      const res = await register({ name: "C", email: "c@example.com", password: "x" });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ msg: "unable to register  try later", code: "100" });
    } finally {
      process.env.REFRESH_TOKEN_SECRET = secret;
    }
  });

  // FINDING: if signing the token fails (e.g. REFRESH_TOKEN_SECRET is not set — the .env once
  // committed to this repo only had ACCESS_TOKEN_SECRET), the user has already been created, so
  // the sign-up says "try later" but every retry then answers "user already present".
  test.failing("a failed registration does not leave the account half-created", async () => {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    delete process.env.REFRESH_TOKEN_SECRET;
    try {
      await register({ name: "D", email: "d@example.com", password: "x" });
    } finally {
      process.env.REFRESH_TOKEN_SECRET = secret;
    }
    const retry = await register({ name: "D", email: "d@example.com", password: "x" });
    expect(retry.status).toBe(200);
  });

  // FINDING: when saving the user fails, the .catch answers 403 and then execution continues
  // with `saveuser` undefined: reading `saveuser._id` throws, and the outer catch tries to answer
  // a second time (ERR_HTTP_HEADERS_SENT) from inside an async handler.
  test("a failed save answers 403 once", async () => {
    const create = jest.spyOn(User, "create").mockRejectedValueOnce(new Error("db down"));
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const { secondAnswers, settle } = require("./support/app");
    const answers = secondAnswers();
    try {
      const res = await register({ name: "E", email: "e@example.com", password: "x" });
      await settle();
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ msg: "unable to register user try later", code: "100" });
      // ...but it tries to answer a second time (in production: an unhandled rejection).
      expect(answers.seen).toEqual(["ERR_HTTP_HEADERS_SENT"]);
    } finally {
      answers.stop();
      create.mockRestore();
      log.mockRestore();
    }
  });
});

describe("POST /auth/login", () => {
  test("answers with a fresh 10-day token for the right password", async () => {
    const user = await createUser({ email: "log@example.com" });
    const res = await login({ email: "log@example.com", password: "secret-pass" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ msg: "user login sucesfully", code: 201 });
    expect(jwt.verify(res.body.token, process.env.REFRESH_TOKEN_SECRET)).toMatchObject({ id: String(user._id), email: "log@example.com" });
    expect(await Refresh.countDocuments()).toBe(1);
  });

  test("the same answer for an unknown email and a wrong password (no account probing)", async () => {
    await createUser({ email: "real@example.com" });
    const unknown = await login({ email: "nobody@example.com", password: "secret-pass" });
    const wrong = await login({ email: "real@example.com", password: "nope" });

    expect(unknown.status).toBe(403);
    expect(wrong.status).toBe(403);
    expect(unknown.body.msg.trim()).toBe("please enter valid credentials");
    expect(wrong.body.msg.trim()).toBe("please enter valid credentials");
    expect(unknown.body.code).toBe(wrong.body.code);
  });

  test.each([[{ email: "a@example.com" }], [{ password: "x" }]])("refuses missing details: %j", async (body) => {
    const res = await login(body);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "please filled all details", code: "501" });
  });

  test("answers 403 when the database fails", async () => {
    const find = jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("db down"));
    const res = await login({ email: "a@example.com", password: "x" });
    find.mockRestore();
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ msg: "unable to login  try later", code: "100" });
  });
});
