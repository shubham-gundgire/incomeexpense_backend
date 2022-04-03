const mongoose = require("mongoose");

const incomeSchema = mongoose.Schema({
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

const income = mongoose.model('income', incomeSchema);

module.exports = income;