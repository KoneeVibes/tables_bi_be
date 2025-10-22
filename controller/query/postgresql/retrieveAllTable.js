const userPGDBPool = require("../../../db/pgDBPoolManager");
const {
	getActiveConnection,
} = require("../../connection/activeConnection");

const delimiter = process.env.POOL_KEY_DELIMITER;

const retrieveAllTable = async (req, res) => {
	try {
		const { authorization } = req.headers;
		const poolKey = getActiveConnection(authorization.split(" ")[1]);
		if (!poolKey) {
			return res
				.status(400)
				.json({ status: "fail", message: "No active DB connection" });
		}

		const [host, dbName, username, port] = poolKey.split(delimiter);
		const dbConfig = {
			user: username,
			host: host,
			database: dbName,
			port: port,
		};

		const pool = userPGDBPool(dbConfig);
		const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE';
          `);

		return res.status(200).json({ status: "success", data: result.rows });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all tables at this moment. Please retry",
		});
	}
};

module.exports = retrieveAllTable;
