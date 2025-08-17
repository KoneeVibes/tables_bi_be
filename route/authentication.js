const express = require("express");
const router = express.Router();
const { signOutUser } = require("../controller/authentication/signOut");

router.post("/sign-up", require("../controller/authentication/signUp"));
router.post("/sign-in", require("../controller/authentication/signIn"));
router.post("/verify-otp", require("../controller/authentication/verifyOtp"));
router.patch("/complete-profile/:userId", require("../controller/authentication/completeProfile"));
router.post("/sign-out", require("../middleware/authorization"), signOutUser);

module.exports = router;
