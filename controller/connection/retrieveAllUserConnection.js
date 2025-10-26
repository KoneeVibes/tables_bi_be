const { decrypt } = require("../../util/encryption");
const appPGDBPool = require("../../db/pgDBPoolManager");

const retrieveAllUserConnection = async (req, res) => {
	try {
		const { id } = req.user || {};
		const appDbConfig = {
			user: process.env.DB_USER,
			host: process.env.DB_HOST,
			database: process.env.DB_NAME,
			password: process.env.DB_PASSWORD,
			port: process.env.DB_PORT,
		};
		const pgPool = appPGDBPool(appDbConfig);

		const connectionConfigsResult = await pgPool.query(
			`SELECT * FROM connection_config WHERE owner_id = $1`,
			[id]
		);
		const connectionConfigs = connectionConfigsResult.rows;
		if (connectionConfigs.length === 0) {
			return res.status(200).json({
				status: "success",
				data: [],
				message: "No saved connections found for this user.",
			});
		}
		const formattedConnections = connectionConfigs.map((connectionConfig) => ({
			user: connectionConfig.user_name,
			host: connectionConfig.host,
			dbName: connectionConfig.database_name,
			dbType: connectionConfig.database_type,
			port: connectionConfig.port,
			password: decrypt(connectionConfig.password),
		}));
		return res.status(200).json({
			status: "success",
			data: formattedConnections,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all connections at this moment. Please retry",
		});
	}
};

module.exports = retrieveAllUserConnection;
