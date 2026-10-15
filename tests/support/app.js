const http = require("http");
const jwt = require("jsonwebtoken");

/**
 * index.js connects to the database and starts listening as soon as it is loaded, and exports
 * nothing. This loads it once per test file, keeps hold of the server it starts, and waits for
 * the database connection.
 */
async function startApp() {
  const listen = jest.spyOn(http.Server.prototype, "listen");
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  require("../../index.js");
  const server = listen.mock.instances[0];
  listen.mockRestore();
  const mongoose = require("mongoose");
  await mongoose.connection.asPromise();
  log.mockRestore();
  return {
    server,
    mongoose,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    },
  };
}

/** A token exactly like the ones /auth/login hands out. */
const tokenFor = (user, options = { expiresIn: "10d" }) =>
  jwt.sign({ id: String(user._id), email: user.email }, process.env.REFRESH_TOKEN_SECRET, options);

/**
 * Express 4 does not catch errors from async handlers. A handler that answers twice throws
 * ERR_HTTP_HEADERS_SENT from inside the handler; in production that is an unhandled rejection,
 * which stops Node. Jest would report it against whichever test is running, so this records
 * every second answer attempt (and stops it from throwing) so tests can assert on it.
 */
function secondAnswers() {
  const response = require("express").response;
  const json = response.json;
  const seen = [];
  const spy = jest.spyOn(response, "json").mockImplementation(function (...args) {
    try {
      return json.apply(this, args);
    } catch (error) {
      seen.push(error.code);
      return this;
    }
  });
  return { seen, stop: () => spy.mockRestore() };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 100));

module.exports = { startApp, tokenFor, secondAnswers, settle };
