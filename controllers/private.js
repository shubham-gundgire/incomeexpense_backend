const User = require("../model/user");
const bcrypt = require("bcryptjs");
const Income = require("../model/income");
const Expense = require("../model/expense");


const income = async (req, res) => {
  try {
    const { category, amount, description, createdat, subject } = req.body;
    const userid = req.user.id;

    if (!category || !amount || !description || !createdat || !subject) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }
    if (!userid) {
      return res.status(403).json({
        msg: "invalid credntials",
        code: "508",
      });
    }
    const saveIncomes = await Income.create({
      userid,
      category,
      amount,
      subject,
      description,
      createdat,
    })
      .then((data) => {
        return data;
      })
      .catch((e) => {
        console.log("we got error", e);
        res.status(403).json({
          msg: "unable to add income try later",
          code: "100",
          error: error,
        });
      });

    res.status(200).json({ msg: "expenses added" });
  } catch (error) {
    res.status(403).json({
      msg: "unable to add Income try later",
      code: "100",
      error: error,
    });
  }
};
const expense = async (req, res) => {
  try {
    const { category, amount, description, createdat, subject } = req.body;
    const userid = req.user.id;

    if (!category || !amount || !description || !createdat || !subject) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }
    if (!userid) {
      return res.status(403).json({
        msg: "invalid credntials",
        code: "508",
      });
    }
    const saveExpenses = await Expense.create({
      userid,
      category,
      amount,
      subject,
      description,
      createdat,
    })
      .then((data) => {
        return data;
      })
      .catch((e) => {
        console.log("we got error", e);
        res.status(403).json({
          msg: "unable to add income try later",
          code: "100",
          error: error,
        });
      });

    res.status(200).json({ msg: "expenses added" });
  } catch (error) {
    res.status(403).json({
      msg: "unable to add expense try later",
      code: "100",
      error: error,
    });
  }
};

const resetpassword = async (req, res) => {
  try {
    const { current_pass, new_pass } = req.body;
    const id = req.user.id;

    if (!current_pass || !new_pass) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }
    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.status(403).json({
        msg: "please enter valid credentials ",
        code: "503",
      });
    }

    const ispass = await bcrypt.compare(current_pass, user.password);
    if (!ispass) {
      return res.status(403).json({
        msg: "please enter valid credentials  ",
        code: "503",
      });
    }
    const hashPassword = await bcrypt.hash(new_pass, 10);
    if (ispass) {
      user.password = hashPassword;
      user.save();
    }
    res.json("password reset");
  } catch (error) {
    res.status(403).json({
      msg: "unable to reset try later",
      code: "100",
      error,
    });
  }
};

const updateprofile = (req, res) => {
  console.log(req.body);
  res.json("hi");
};

const getdata = async (req, res) => {
  try {
    const id = req.user.id;
    const userdata = await User.findOne({ _id: id })
      .select("-password")
      .then((data) => {
        console.log(data);
        return data;
      });

    const getincome = await Income.find({ userid: id }).then((data) => {
      return data;
    });
    const getexpense = await Expense.find({ userid: id }).then((data) => {
      return data;
    });
    res.status(200).json({ userdata, getincome, getexpense });
  } catch (error) {
    res.status(403).json({
      msg: "unable to reset try later",
      code: "100",
      error,
    });
  }
};
const userdata = async (req, res) => {
  try {
    const { name,about, twitterpro, facebookpro, instapro, linkedpro } =
      req.body;
    const userid = req.user.id;
    if (
      !name ||
      !about ||
      !twitterpro ||
      !facebookpro ||
      !instapro ||
      !linkedpro
    ) {
      return res.status(403).json({
        msg: "please filled all details",
        code: "501",
      });
    }
    if (!userid) {
      return res.status(403).json({
        msg: "invalid credntials",
        code: "508",
      });
    }
    const user = await User.findOne({ _id: userid });

    if (!user) {
      return res.status(403).json({
        msg: "please enter valid credentials ",
        code: "503",
      });
    }
    user.name = name;
    user.about = about;
    user.twitterpro = twitterpro;
    user.facebookpro = facebookpro;
    user.instapro = instapro;
    user.linkedpro = linkedpro;
    user.save();
    res.json({
  
      msg: "updated",
    });
  } catch (error) {
    res.status(403).json({
      msg: "unable update userdata try later",
      code: "100",
      error: error,
    });
  }
};

module.exports = {
  resetpassword,
  income,
  expense,
  updateprofile,
  getdata,
  userdata,
};
