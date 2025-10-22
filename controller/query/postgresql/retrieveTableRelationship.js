const userPGDBPool = require("../../../db/pgDBPoolManager");
const {
	getActiveConnection,
} = require("../../connection/activeConnection");

const delimiter = process.env.POOL_KEY_DELIMITER;

const retrieveTableRelationship = async (req, res) => {
	try {
		const { tableName } = req.params;
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
		// what the query below does is that it checks for all FOREIGN KEY constraints that are either
		// pointing to tableName or all constraints in tableName that point to anyother tables.
		// then it returns this {source_table: <Table With Constraint>, source_column: <Column Constrained>,
		// target_table: <Table that FK is relating to/referencing>, target_column: <Target column in the
		// referenced table>}
		const result = await pool.query(
			`
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
          `,
			[tableName]
		);
		if (result.rows.length === 0) {
			result.rows.push({
				source_table: tableName,
				source_column: null,
				target_table: tableName,
				target_column: null,
			});
        };
		return res
			.status(200)
			.json({ status: "success", data: { [tableName]: result.rows } });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all related table at this moment. Please retry",
		});
	}
};

module.exports = retrieveTableRelationship;
