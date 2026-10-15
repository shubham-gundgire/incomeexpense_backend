const request = require("supertest");
const { startApp, secondAnswers, settle } = require("./support/app");

let app;
let Contact;
beforeAll(async () => {
  app = await startApp();
  Contact = require("../model/contact");
});
afterAll(() => app.stop());
beforeEach(() => Contact.deleteMany({}));

const contact = (body) => request(app.server).post("/public/contact").send(body);

test("stores a contact message", async () => {
  const res = await contact({ name: "Ravi", email: "ravi@example.com", subject: "Hello", msg: "Nice app" });

  expect(res.status).toBe(200);
  expect(res.body).toEqual({ msg: "message sent succesfully", code: 200 });
  const [saved] = await Contact.find();
  expect(saved).toMatchObject({ name: "Ravi", email: "ravi@example.com", subject: "Hello", msg: "Nice app" });
  expect(saved.date).toBeInstanceOf(Date);
});

test("CORS only allows the deployed Netlify site, with credentials", async () => {
  const res = await request(app.server)
    .options("/public/contact")
    .set("Origin", "https://euphonious-starship-d15c0e.netlify.app")
    .set("Access-Control-Request-Method", "POST");
  expect(res.headers["access-control-allow-origin"]).toBe("https://euphonious-starship-d15c0e.netlify.app");
  expect(res.headers["access-control-allow-credentials"]).toBe("true");
});

// FINDING: nothing is validated — an empty form is stored as a message.
test.failing("refuses an empty message", async () => {
  const res = await contact({});
  expect(res.status).toBe(403);
  expect(await Contact.countDocuments()).toBe(0);
});

// FINDING: the schema default is `Date.now()` (called once when the model is defined) instead
// of `Date.now`, so every message is stamped with the time the server started.
test.failing("each message is dated when it is sent", async () => {
  await contact({ name: "First" });
  await new Promise((r) => setTimeout(r, 30));
  await contact({ name: "Second" });
  const [first, second] = await Contact.find().sort({ _id: 1 });
  expect(second.date.getTime()).toBeGreaterThan(first.date.getTime());
});

test("every message currently carries the same date", async () => {
  await contact({ name: "First" });
  await new Promise((r) => setTimeout(r, 30));
  await contact({ name: "Second" });
  const [first, second] = await Contact.find().sort({ _id: 1 });
  expect(second.date.getTime()).toBe(first.date.getTime());
});

// FINDING: when saving fails (here, a field that is not text), the .catch answers 403 but the
// handler goes on to answer 200 as well; that throws, the outer catch tries to answer a third
// time, and that error escapes the handler as an unhandled rejection — which stops a Node
// process that has no handler for it.
test.failing("a message that cannot be saved is answered once, without crashing", async () => {
  const answers = secondAnswers();
  try {
    const res = await contact({ name: { not: "text" } });
    await settle();
    expect(res.status).toBe(403);
    expect(answers.seen).toEqual([]);
  } finally {
    answers.stop();
  }
});

// With the recorder in place the second answer no longer throws, so the third attempt (the one
// that escapes as an unhandled rejection in production) is not reached; one extra answer shows it.
test("a message that cannot be saved is currently answered twice", async () => {
  const answers = secondAnswers();
  try {
    const res = await contact({ name: { not: "text" } });
    await settle();
    expect(res.status).toBe(403);
    expect(answers.seen).toEqual(["ERR_HTTP_HEADERS_SENT"]);
  } finally {
    answers.stop();
  }
});

test("a database failure while saving answers 403", async () => {
  // A synchronous throw lands in the outer catch, which answers once.
  const create = jest.spyOn(Contact, "create").mockImplementationOnce(() => {
    throw new Error("db down");
  });
  const res = await contact({ name: "X" });
  create.mockRestore();
  expect(res.status).toBe(403);
  expect(res.body).toMatchObject({ msg: "please try again", code: "100" });
});
