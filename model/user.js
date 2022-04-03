const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  about: {
    type: String,
  },
  country: {
    type: String,
  },
  twitterpro: {
    type: String,
    default: "https://twitter.com/#",
  },
  facebookpro: {
    type: String,
    default: "https://facebook.com/#",
  },
  instapro: {
    type: String,
    default: "https://instagram.com/#",
  },
  linkedpro: {
    type: String,
    default: "https://linkedin.com/#",
  },
  profileimg: {
    data: Buffer,
    contentType: String,
  },
});

const user = mongoose.model("user", userSchema);

module.exports = user;
