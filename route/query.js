const express = require("express");
const determineDBType = require("../helper/dbTypeDeterminer");

// table controllers
const retrieveAllPostgreSQLTable = require("../controller/query/postgresql/retrieveAllTable");
const retrieveAllMySQLTable = require("../controller/query/mysql/retrieveAllTable");
const retrieveAllSQLServerTable = require("../controller/query/sqlserver/retrieveAllTable");

const router = express.Router();

router.get("/all/table", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return retrieveAllPostgreSQLTable(req, res);
		case "MySQL":
			return retrieveAllMySQLTable(req, res);
		case "SQL-Server":
			return retrieveAllSQLServerTable(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

module.exports = router;
