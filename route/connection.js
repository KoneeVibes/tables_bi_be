const express = require("express");
const determineDBType = require("../helper/dbTypeDeterminer");
const connectToMYSQL = require("../controller/connection/mysql/connectToDb");
const connectToSQLServer = require("../controller/connection/sqlserver/connectToDb");
const connectToPostgreSQL = require("../controller/connection/postgresql/connectToDb");

const router = express.Router();

router.post("/connect-to-db", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return connectToPostgreSQL(req, res);
		case "MySQL":
			return connectToMYSQL(req, res);
		case "SQL-Server":
			return connectToSQLServer(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

module.exports = router;
