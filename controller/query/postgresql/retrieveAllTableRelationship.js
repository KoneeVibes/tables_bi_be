const userPGDBPool = require("../../../db/pgDBPoolManager");
const {
	getActiveConnection,
} = require("../../connection/activeConnection");

const delimiter = process.env.POOL_KEY_DELIMITER;

const retrieveAllTableRelationship = async (req, res) => {
	try {
		const { authorization } = req.headers;
		const tableNames = req.body || [];

		if (!Array.isArray(tableNames) || tableNames.length === 0) {
			return res.status(400).json({
				status: "fail",
				message: "No tables supplied in request body",
			});
		}

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
		const sql = `
			SELECT
				tc.table_name   AS source_table,
				kcu.column_name AS source_column,
				ccu.table_name  AS target_table,
				ccu.column_name AS target_column
			FROM
				information_schema.table_constraints tc
			JOIN
				information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN
				information_schema.constraint_column_usage ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE
				tc.constraint_type = 'FOREIGN KEY'
				AND (
					tc.table_name = $1
					OR ccu.table_name = $1
				);
		`;

		const results = await Promise.all(
			tableNames.map(async (tableName) => {
				try {
					const result = await pool.query(sql, [tableName]);
					if (result.rows.length === 0) {
						result.rows.push({
							source_table: tableName,
							source_column: null,
							target_table: tableName,
							target_column: null,
						});
					}
					return { tableName, rows: result.rows };
				} catch (err) {
					console.error(`Failed to fetch relationships for ${tableName}:`, err);
					return { tableName, rows: [] };
				}
			})
		);
		const data = results.reduce((acc, { tableName, rows }) => {
			acc[tableName] = rows;
			return acc;
		}, {});

		return res.status(200).json({ status: "success", data });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all table fields at this moment. Please retry",
		});
	}
};

module.exports = retrieveAllTableRelationship;
