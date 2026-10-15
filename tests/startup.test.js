const http = require("http");

// index.js and config/dbconnect.js, loaded fresh for each scenario.
beforeEach(() => jest.resetModules());
afterEach(() => jest.restoreAllMocks());

test("starts on PORT and connects to MONGOOSEURI", async () => {
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...args) => logs.push(args));
  const listen = jest.spyOn(http.Server.prototype, "listen");
  require("../index.js");
  const server = listen.mock.instances[0];
  const mongoose = require("mongoose");
  await mongoose.connection.asPromise();

  expect(listen).toHaveBeenCalledWith("0", expect.any(Function));
  await new Promise((r) => setTimeout(r, 20));
  expect(logs).toEqual(expect.arrayContaining([["succesfuly connected to database"], ["server is running on port no :", "0"]]));

  // A later connection error is logged, not thrown.
  mongoose.connection.emit("error", new Error("lost"));
  expect(logs).toContainEqual(["MongoDB connection error"]);

  await new Promise((r) => server.close(r));
  await mongoose.disconnect();
});

test("defaults to port 5000", () => {
  const port = process.env.PORT;
  delete process.env.PORT;
  const listen = jest.spyOn(http.Server.prototype, "listen").mockImplementation(function () {
    return this;
  });
  jest.spyOn(require("mongoose"), "connect").mockResolvedValue();
  jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    require("../index.js");
    expect(listen).toHaveBeenCalledWith(5000, expect.any(Function));
  } finally {
    process.env.PORT = port;
  }
});

test("connecting rejects when the database cannot be reached", async () => {
  jest.spyOn(require("mongoose"), "connect").mockRejectedValue(new Error("unreachable"));
  await expect(require("../config/dbconnect")()).rejects.toThrow("unreachable");
});

// FINDING: index.js calls connect() without waiting for or catching the result, so a database
// that cannot be reached is an unhandled rejection: the server keeps running without a
// database, or stops, depending on how Node handles unhandled rejections.
test("index.js does not handle a failed connection", () => {
  const attempt = { then: jest.fn(), catch: jest.fn() };
  jest.doMock("../config/dbconnect", () => () => attempt);
  jest.spyOn(http.Server.prototype, "listen").mockImplementation(function () {
    return this;
  });
  require("../index.js");
  expect(attempt.then).not.toHaveBeenCalled();
  expect(attempt.catch).not.toHaveBeenCalled();
});
