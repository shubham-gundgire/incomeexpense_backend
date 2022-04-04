const User = require("../model/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Refesh = require("../model/refresh");
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }

    const user = await User.findOne({ email });

    if (user) {
      return res.status(403).json({
        msg: "user already present ",
        code: "502",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const saveuser = await User.create({ name, email, password: hashPassword })
      .then((data) => {
        return data;
      })
      .catch((e) => {
        console.log("we got error", e);
        res.status(403).json({
          msg: "unable to register user try later",
          code: "100",
        });
      });

    const refreshToken = await jwt.sign(
      { id: saveuser._id, email: saveuser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "10d" }
    );

    const refesharray = await Refesh.create({ refreshtoken: refreshToken });

    res.status(200).json({ msg: "user register sucesfully", code: 201,token:refreshToken });
  } catch (error) {
    res.status(403).json({
      msg: "unable to register  try later",
      code: "100",
      error,
    });
  }
};
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(403).json({
        msg: "please enter valid credentials ",
        code: "502",
      });
    }
    const ispass = await bcrypt.compare(password, user.password);

    if (!ispass) {
      return res.status(403).json({
        msg: "please enter valid credentials  ",
        code: "502",
      });
    }

    const refreshToken = await jwt.sign(
      { id: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "10d" }
    );
    const refesharray = await Refesh.create({ refreshtoken: refreshToken });
    res.status(200).json({ msg: "user login sucesfully", code: 201,token:refreshToken });
  } catch (error) {
    res.status(403).json({
      msg: "unable to login  try later",
      code: "100",
    });
  }
};
module.exports = { login, register };
