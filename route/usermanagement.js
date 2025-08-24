const express = require("express");

const router = express.Router();

router.get(
	"/logged-in-user",
	require("../controller/usermanagement/retrieveLoggedInUser")
);

module.exports = router;
