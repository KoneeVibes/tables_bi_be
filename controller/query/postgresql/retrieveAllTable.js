const userPGDBPool = require("../../../db/pgDBPoolManager");
const {
	getActiveConnection,
} = require("../../connection/postgresql/activeConnection");

const retrieveAllTable = async (req, res) => {
	try {
		const { authorization } = req.headers;
		const poolKey = getActiveConnection(authorization.split(" ")[1]);
		if (!poolKey) {
			return res
				.status(400)
				.json({ status: "fail", message: "No active DB connection" });
		}

		const [host, dbName, username] = poolKey.split("_");
		const dbConfig = {
			user: username,
			host: host,
			database: dbName,
		};

		const pool = userPGDBPool(dbConfig);
		const result = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE';
          `);

		return res.status(200).json({ status: "success", data: result.rows });
	} catch (err) {
		console.error("Error retrieving tables:", err);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all tables at this moment. Please retry",
		});
	}
};

module.exports = retrieveAllTable;
