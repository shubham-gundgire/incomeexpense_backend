# Testing

`tests/` is a standalone Jest + supertest suite with its own `tests/package.json`. It changes no
app code, `package.json` or lockfile.

| Tests | Statements | Branches | Functions | Lines |
|------:|-----------:|---------:|----------:|------:|
|    55 |      98.4% |    98.3% |      100% | 98.4% |

(7 of the 55 are known bugs. The only uncovered lines are the "token expired" branch, which the
bug below makes unreachable, and logout's empty `catch`.)

```bash
npm ci                 # the app (first time)
cd tests && npm ci     # the test tooling (first time; downloads MongoDB ~55 MB once)
npm test | npm run coverage | npm run bugs   # bugs: run the known-bug tests as normal tests
```

The tests load the real `index.js` against an in-memory MongoDB (`mongodb-memory-server`), one
database per test file. The real `.env` and database are never used. Jest runs the files
untransformed with V8 coverage, because `index.js` names variables `public` and `private`, which
Node accepts but Babel does not.

Covered: register, login, the login check, contact, income, expense, password reset, profile
update, data fetch, the unfinished endpoints, startup and database-connection handling.

## Known bugs

| Severity | Where | Bug |
|---|---|---|
| High | `middleware/verifyuser.js`, `routes/private.js` | Logout does nothing on the server. Tokens are stored in the `refesh` collection but never checked or removed, so a token keeps working for its full 10 days after logout. |
| High | `controllers/contact.js` | A message that cannot be saved (e.g. a field that is not text) is answered, then answered again; the third attempt escapes as an unhandled rejection, which can stop the server. `controllers/auth.js` `register` has the same pattern when saving the user fails. |
| Medium | `controllers/auth.js` `register` | If the token cannot be signed (`REFRESH_TOKEN_SECRET` not set), the user is already saved: sign-up says "try later", then every retry says "user already present". |
| Medium | `middleware/verifyuser.js` | It compares `err.message` with `"TokenExpiredError"` (that is the error's name), so an expired token is never reported as expired. |
| Low | `model/contact.js` | The date default is `Date.now()` (called once) instead of `Date.now`: every message carries the server's start time. |
| Low | `controllers/contact.js` | Nothing is validated; an empty form is stored. |
| Low | `controllers/private.js` `income` | Adding income answers "expenses added". |

Also noted:
- `index.js` calls `connect()` without handling failure, so an unreachable database is an unhandled rejection.
- `/private/updatepro` needs no login and only answers "hi".
- `resetpassword` and `userdata` answer before their save finishes.
- The income/expense `.catch` blocks refer to an undefined `error`.
- CORS allows only the Netlify site.
- A `.env` with a MongoDB Atlas URL (including the password) and a token secret was committed in April 2022 and removed two days later. It is still in git history, so those credentials should be changed.
