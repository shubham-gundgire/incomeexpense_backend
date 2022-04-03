const jwt = require("jsonwebtoken");
const User = require('../model/user');
const Refesh = require('../model/refresh');

const verifyuser = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  const decoded = jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET,
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
        
        return res.status(403).send({ msg: "User not authenticated",code:888 });
      }
    }
  );
};
const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res
      .status(403)
      .send({ msg: "Refresh token not found", code: "701" });
  }

  const istoken = await Refesh.findOne({ refreshtoken: refreshToken });
  if (!istoken) {
    return res.status(403).send({ msg: "Refresh token blocked", code: "702" });
  }

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (!err) {
        const accessToken = await jwt.sign(
          { id: decoded.id, email: decoded.email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "5m" }
        );
        return res
          .status(200)
          .cookie("accessToken", accessToken, {
            expires: new Date(new Date().getTime() + 5 * 60000),
            sameSite: "strict",
            httpOnly: true,
          })
          .cookie("authSession", true, {
            expires: new Date(new Date().getTime() + 5 * 60000),
            sameSite: "strict",
          })
          .send({ msg: "acces token updated", code: "101" });
      } else {
        return res.status(403).send({
          code: "703",
          msg: "Invalid refresh token",
        });
      }
    }
  );
};
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await Refesh.findOneAndDelete({ refreshtoken: refreshToken });
    }
    res
      .clearCookie("refreshToken")
      .clearCookie("accessToken")
      .clearCookie("authSession")
      .clearCookie("refreshTokenID")
      .send("logout");
  } catch (error) {
    res.status(403).json({
      msg: "unable to logout  try again",
      code: "100",
      error: error,
    });
  }
};
module.exports = { verifyuser, refreshToken, logout };