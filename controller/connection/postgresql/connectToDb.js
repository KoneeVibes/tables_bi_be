const userPGDBPool = require("../../../db/pgDBPoolManager");
const { setActiveConnection } = require("./activeConnection");

const delimiter = process.env.POOL_KEY_DELIMITER;

const connectToDb = async (req, res) => {
	const { host, port, username, password, dbName } = req.body || {};
	if (!host || !port || !username || !password || !dbName) {
		return res.status(400).json({
			status: "fail",
			message: "Incomplete Database Credentials, Cannot Proceed",
		});
	}

	try {
		const dbConfig = {
			user: username,
			host: host,
			database: dbName,
			password: password,
			port: port,
		};
		const userPgPool = userPGDBPool(dbConfig);

		// Test the connection with a simple query
		await userPgPool.query("SELECT 1");

		const userId = req.headers.authorization.split(" ")[1];
		const poolKey = `${host}${delimiter}${dbName}${delimiter}${username}`;
		setActiveConnection(userId, poolKey);

		return res.status(200).json({
			status: "success",
			message: `Successfully connected to PostgreSQL database: ${dbName}`,
		});
	} catch (error) {
		console.error("DB Connection error:", error);
		return res.status(500).json({
			status: "error",
			message: "Failed to connect to PostgreSQL database",
		});
	}
};

module.exports = connectToDb;
