const mongoose = require("mongoose");

const dbconnect = async () => {
  await mongoose
    .connect(process.env.MONGOOSEURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("succesfuly connected to database");
    });

  const db = mongoose.connection;
  db.on("error", () => {
    console.log("MongoDB connection error");
  });
};
module.exports = dbconnect;
