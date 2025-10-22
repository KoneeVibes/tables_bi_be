const express = require("express");

const router = express.Router();

router.post("/query/save-query", require("../controller/savedview/saveQuery"));

router.get(
	"/all/query",
	require("../controller/savedview/retrieveAllSavedQuery")
);

router.delete(
	"/query/:id",
	require("../controller/savedview/deleteSavedQuery")
);

module.exports = router;
