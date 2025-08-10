const express = require("express");
const router = express.Router();

router.post("/signup", require("../controller/authentication/signUp"));
router.post("/signin", require("../controller/authentication/signIn"));
router.post("/verify-otp", require("../controller/authentication/verifyOtp"));
router.patch("/complete-profile/:userId", require("../controller/authentication/completeProfile"));

module.exports = router;
