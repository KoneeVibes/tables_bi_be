const appPGDBPool = require("../../db/pgDBPoolManager");

const deleteSavedQuery = async (req, res) => {
	try {
		const { id } = req.params || {};
		if (!id) {
			return res.status(400).json({
				status: "error",
				message: "Connection ID is required",
			});
		}

		const appDbConfig = {
			user: process.env.DB_USER,
			host: process.env.DB_HOST,
			database: process.env.DB_NAME,
			password: process.env.DB_PASSWORD,
			port: process.env.DB_PORT,
		};
		const pgPool = appPGDBPool(appDbConfig);

		const connectionConfigResult = await pgPool.query(
			`SELECT * FROM connection_config WHERE id = $1`,
			[id]
		);
		const connectionConfig = connectionConfigResult.rows;
		if (connectionConfig.length === 0) {
			return res.status(200).json({
				status: "success",
				data: [],
				message: "No saved queries found for this user.",
			});
		}

		await pgPool.query(`DELETE FROM connection_config WHERE id = $1`, [id]);
		return res.status(200).json({
			status: "success",
			message: "success",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in deleting saved query at this moment. Please retry",
		});
	}
};

module.exports = deleteSavedQuery;
