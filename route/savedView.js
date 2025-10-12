const express = require("express");

const router = express.Router();

router.get(
	"/all/query",
	require("../controller/savedview/retrieveAllSavedQuery")
);

module.exports = router;
