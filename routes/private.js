const router = require("express").Router();
const {
  resetpassword,
  income,
  expense,
  updateprofile,
  getdata,
  userdata,
} = require("../controllers/private");
const {
  refreshToken,
  verifyuser,
  logout
} = require("../middleware/verifyuser");


router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post("/resetpass",verifyuser, resetpassword);
router.post('/income',verifyuser, income);
router.post('/expense',verifyuser, expense);
router.post("/updatepro", updateprofile);
router.get('/getdata', verifyuser, getdata);
router.post("/userdata", verifyuser, userdata);
module.exports = router;