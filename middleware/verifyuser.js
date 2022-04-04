const jwt = require("jsonwebtoken");
const User = require('../model/user');
const Refesh = require('../model/refresh');

const verifyuser = async (req, res, next) => {
  const accessToken = req.headers.authorization;

  const decoded = jwt.verify(
    accessToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, decoded) => {
      if (decoded) {
        req.user = decoded;
        next();
      } else if (err.message === "TokenExpiredError") {
        return res.status(403).send({
          code: "120",
          msg: "Access token expired",
        });
      } else {
        return res
          .status(403)
          .send({ msg: "User not authenticated", code: 888 });
      }
    }
  );
};

const logout = async (req, res) => {
  try {
  

    res.send("logout");
  } catch (error) {
    res.status(403).json({
      msg: "unable to logout  try again",
      code: "100",
      error: error,
    });
  }
};
module.exports = { verifyuser, logout };