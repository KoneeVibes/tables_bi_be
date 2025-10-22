const express = require("express");
const determineDBType = require("../helper/dbTypeDeterminer");

// table controllers
const retrieveAllPostgreSQLTable = require("../controller/query/postgresql/retrieveAllTable");
const retrieveAllMySQLTable = require("../controller/query/mysql/retrieveAllTable");
const retrieveAllSQLServerTable = require("../controller/query/sqlserver/retrieveAllTable");

const retrieveAllPostgreSQLTableField = require("../controller/query/postgresql/retrieveAllTableField");
const retrieveAllMySQLTableField = require("../controller/query/mysql/retrieveAllTableField");
const retrieveAllSQLServerTableField = require("../controller/query/sqlserver/retrieveAllTableField");

const retrieveAllPostgreSQLTableRelationship = require("../controller/query/postgresql/retrieveAllTableRelationship");
const retrieveAllMySQLTableRelationship = require("../controller/query/mysql/retrieveAllTableRelationship");
const retrieveAllSQLServerTableRelationship = require("../controller/query/sqlserver/retrieveAllTableRelationship");

const retrievePostgreSQLTableRelationship = require("../controller/query/postgresql/retrieveTableRelationship");
const retrieveMySQLTableRelationship = require("../controller/query/mysql/retrieveTableRelationship");
const retrieveSQLServerTableRelationship = require("../controller/query/sqlserver/retrieveTableRelationship");

const postgreSQLJoin = require("../controller/query/postgresql/tableJoin");
const mySQLJoin = require("../controller/query/mysql/tableJoin");
const sqlServerJoin = require("../controller/query/sqlserver/tableJoin");

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

router.get("/:tableName/all/field", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return retrieveAllPostgreSQLTableField(req, res);
		case "MySQL":
			return retrieveAllMySQLTableField(req, res);
		case "SQL-Server":
			return retrieveAllSQLServerTableField(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

router.post("/all/table-relationship", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return retrieveAllPostgreSQLTableRelationship(req, res);
		case "MySQL":
			return retrieveAllMySQLTableRelationship(req, res);
		case "SQL-Server":
			return retrieveAllSQLServerTableRelationship(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

router.get("/:tableName/table-relationship", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return retrievePostgreSQLTableRelationship(req, res);
		case "MySQL":
			return retrieveMySQLTableRelationship(req, res);
		case "SQL-Server":
			return retrieveSQLServerTableRelationship(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

router.post("/run-join", (req, res) => {
	const response = determineDBType(req);
	switch (response) {
		case "PostgreSQL":
			return postgreSQLJoin(req, res);
		case "MySQL":
			return mySQLJoin(req, res);
		case "SQL-Server":
			return sqlServerJoin(req, res);
		default:
			return res.status(400).json({ error: response });
	}
});

module.exports = router;
