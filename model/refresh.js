const mongoose = require("mongoose");

const refesharray = mongoose.Schema({
  refreshtoken: String,
});

const refresh = mongoose.model("refesh", refesharray);

module.exports = refresh;
