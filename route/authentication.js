const express = require("express");
const { signOutUser } = require("../controller/authentication/signOut");

const router = express.Router();

router.post("/sign-up", require("../controller/authentication/signUp"));
router.post("/sign-in", require("../controller/authentication/signIn"));
router.post("/send-otp", require("../controller/authentication/sendOtp"));
router.post("/verify-otp", require("../controller/authentication/verifyOtp"));
router.patch(
	"/complete-profile/:userId",
	require("../controller/authentication/completeProfile")
);
router.patch(
	"/reset-password/:userId",
	require("../controller/authentication/resetPassword")
);
router.post("/sign-out", require("../middleware/authorization"), signOutUser);

module.exports = router;
