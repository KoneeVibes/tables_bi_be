const supportedDBTypes = ["PostgreSQL", "MySQL", "SQL-Server"];

const determineDBType = (req) => {
	const dbType = req.headers["datasource"];
	if (!supportedDBTypes.includes(dbType)) {
		return "Unsupported database type";
	}
	return dbType;
};

module.exports = determineDBType;
