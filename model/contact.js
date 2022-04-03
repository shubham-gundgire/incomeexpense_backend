const mongoose = require("mongoose");

const contactSchema = mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    subject: {
        type: String,
    },
    msg: {
        type: String,
    },
    date: {
        type: Date,
        default:Date.now(),
    }
});

const contact = mongoose.model('contact', contactSchema);
module.exports = contact;