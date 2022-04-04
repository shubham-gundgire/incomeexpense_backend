require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;
const connect = require('./config/dbconnect');
const auth = require('./routes/user');
const public = require('./routes/public')
const private = require('./routes/private');
connect();

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/auth', auth);
app.use("/public", public);
app.use("/private", private);
app.listen(port, () => {
  console.log("server is running on port no :", port);
});