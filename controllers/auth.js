
const User = require('../model/user');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Refesh = require('../model/refresh');
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

    const accessToken = await jwt.sign(
      { id: saveuser._id, email: saveuser.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );
    const refreshToken = await jwt.sign(
      { id: saveuser._id, email: saveuser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "10d" }
    );
    
const refesharray = await Refesh.create({ refreshtoken: refreshToken });

    res
      .status(200)
      .cookie("accessToken", accessToken, {
        expires: new Date(new Date().getTime() + 5 * 60000),
        sameSite: "none",
        httpOnly: true,
      })
      .cookie("refreshToken", refreshToken, {
        expires: new Date(new Date().getTime() + 240 * 60 * 60000),
        sameSite: "none",
        httpOnly: true,
      })
      .cookie("authSession", true, {
        expires: new Date(new Date().getTime() + 5 * 60000),
        sameSite: "none",
      })
      .cookie("refreshTokenID", true, {
        expires: new Date(new Date().getTime() + 240 * 60 * 60000),
        sameSite: "none",
      })
      .json({ mag: "user register sucesfully", code: 201 });
  } catch (error) {
    res.status(403).json({
      msg: "unable to register  try later",
      code: "100",
      error
    });
  }
}
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
  
    const accessToken = await jwt.sign(
      { id: user._id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );
    const refreshToken = await jwt.sign(
      { id: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "10d" }
    );
const refesharray = await Refesh.create({ refreshtoken: refreshToken });
    res
      .status(200)
      .cookie("accessToken", accessToken, {
        expires: new Date(new Date().getTime() + 5 * 60000),
        sameSite: "none",
        httpOnly: true,
      })
      .cookie("refreshToken", refreshToken, {
        expires: new Date(new Date().getTime() + 240 * 60 * 60000),
        sameSite: "none",
        httpOnly: true,
      })
      .cookie("authSession", true, {
        expires: new Date(new Date().getTime() + 5 * 60000),
        sameSite: "none",
      })
      .cookie("refreshTokenID", true, {
        expires: new Date(new Date().getTime() + 240 * 60 * 60000),
        sameSite: "none",
      })
      .json({ mag: "user login sucesfully", code: 201 });
  } catch (error) {
    res.status(403).json({
      msg: "unable to login  try later",
      code: "100"
    });
  }
};
module.exports = { login, register };