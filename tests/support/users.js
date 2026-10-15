const bcrypt = require("bcryptjs");
const User = require("../../model/user");

let n = 0;
/** A saved user whose password is "secret-pass". */
async function createUser(overrides = {}) {
  n += 1;
  return User.create({
    name: `User ${n}`,
    email: `user${n}@example.com`,
    password: await bcrypt.hash("secret-pass", 4),
    ...overrides,
  });
}

module.exports = { createUser };
