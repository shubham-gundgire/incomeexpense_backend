const mongoose = require("mongoose");

const expenseSchema = mongoose.Schema({
  userid: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
  },
  subject: {
    type: String,
  },
  description: {
    type: String,
  },
  createdat: {
    type: Date,
  },
});

const expense = mongoose.model("expense", expenseSchema);

module.exports = expense;
