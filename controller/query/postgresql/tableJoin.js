const userPGDBPool = require("../../../db/pgDBPoolManager");
const { getActiveConnection } = require("../../connection/activeConnection");

const delimiter = process.env.POOL_KEY_DELIMITER;

const joinTables = async (req, res) => {
	try {
		const { authorization } = req.headers;
		const { connectionConfig, tableRelationship, datasourceDetails } =
			req.body || {};

		const checkForActiveConnection =
			req.query && req.query.checkForActiveConnection === "true" ? true : false;

		if (!tableRelationship || !datasourceDetails) {
			return res.status(400).json({
				status: "error",
				message: "Missing tableRelationship or datasourceDetails",
			});
		}

		const cleanDatasourceDetails = Object.fromEntries(
			Object.entries(datasourceDetails).filter(([key, value]) => {
				if (typeof value === "string") {
					return value.trim() !== "";
				}
				if (Array.isArray(value)) {
					return value.length > 0;
				}
				return true;
			})
		);

		const { primaryTable } = cleanDatasourceDetails;
		if (!primaryTable) {
			return res.status(400).json({
				status: "error",
				message: "Primary table is required",
			});
		}

		const fields = [];
		const groupByFields = [];

		Object.entries(datasourceDetails).forEach(([key, value]) => {
			if (key.endsWith("Fields") && Array.isArray(value)) {
				let tableKey;
				if (key === "primaryTableFields") {
					tableKey = "primaryTable";
				} else {
					tableKey = key.replace("_Fields", "");
				}
				const tableName = datasourceDetails[tableKey];
				if (tableName && value.length > 0) {
					value.forEach((col) => {
						const colName = `"${tableName}"."${col.name}"`;
						if (col.aggregate && col.aggregate.trim() !== "") {
							fields.push(
								`${col.aggregate.toUpperCase()}(${colName}) AS "${col.aggregate.toUpperCase()}_${tableName}.${
									col.name
								}"`
							);
						} else {
							fields.push(`${colName} AS "${tableName}.${col.name}"`);
							groupByFields.push(colName);
						}
					});
				}
			}
		});

		if (fields.length === 0) {
			return res.status(400).json({
				status: "error",
				message: "No fields selected for query",
			});
		}

		const tableHasRows = async (pool, tableName) => {
			const { rows } = await pool.query(
				`SELECT EXISTS (SELECT 1 FROM "${tableName}" LIMIT 1) AS has_rows`
			);
			return rows[0].has_rows;
		};

		let dbConfig;
		if (checkForActiveConnection) {
			const poolKey = getActiveConnection(authorization.split(" ")[1]);
			if (!poolKey) {
				return res
					.status(400)
					.json({ status: "fail", message: "No active DB connection" });
			}

			const [host, dbName, username, port] = poolKey.split(delimiter);
			dbConfig = {
				user: username,
				host: host,
				database: dbName,
				port: port,
			};
		} else {
			dbConfig = {
				user: connectionConfig?.user,
				host: connectionConfig?.host,
				database: connectionConfig?.dbName,
				port: connectionConfig?.port,
				password: connectionConfig?.password,
			};
		}
		const pool = userPGDBPool(dbConfig);

		const joins = [];
		const joinedTables = new Set([primaryTable]);
		for (const relations of Object.values(tableRelationship)) {
			for (const rel of relations) {
				const { source_table, source_column, target_table, target_column } =
					rel;
				let joinClause = "";
				let tableToJoin = null;

				// Case 1: Primary table matches the source_table
				if (source_table === primaryTable && !joinedTables.has(target_table)) {
					joinClause = `JOIN "${target_table}" ON "${source_table}"."${source_column}" = "${target_table}"."${target_column}"`;
					tableToJoin = target_table;
				}

				// Case 2: Primary table matches the target_table
				else if (
					target_table === primaryTable &&
					!joinedTables.has(source_table)
				) {
					joinClause = `JOIN "${source_table}" ON "${source_table}"."${source_column}" = "${target_table}"."${target_column}"`;
					tableToJoin = source_table;
				}

				// Case 3: Neither directly matches primaryTable (chain joins)
				else if (!joinedTables.has(source_table)) {
					joinClause = `JOIN "${source_table}" ON "${source_table}"."${source_column}" = "${target_table}"."${target_column}"`;
					tableToJoin = source_table;
				} else if (!joinedTables.has(target_table)) {
					joinClause = `JOIN "${target_table}" ON "${source_table}"."${source_column}" = "${target_table}"."${target_column}"`;
					tableToJoin = target_table;
				}

				// Only include the join if the table has data AND selected fields
				if (joinClause && tableToJoin) {
					const hasData = await tableHasRows(pool, tableToJoin);
					const tableHasFields = fields.some((f) =>
						f.includes(`${tableToJoin}.`)
					);
					if (hasData && tableHasFields) {
						joins.push(joinClause);
						joinedTables.add(tableToJoin);
					}
					//maybe we can have an else to return a message that the table to join has no data
				}
			}
		}

		const validTables = Array.from(joinedTables);
		const filteredFields = fields.filter((f) => {
			const match = f.match(/"([^"]+)"\./);
			if (!match) return false;
			const tableName = match[1];
			return validTables.includes(tableName);
		});
		const filteredGroupByFields = groupByFields.filter((f) => {
			const match = f.match(/"([^"]+)"\./);
			if (!match) return false;
			const tableName = match[1];
			return validTables.includes(tableName);
		});
		if (filteredFields.length === 0) {
			return res.status(400).json({
				status: "error",
				message:
					"No valid fields available after excluding tables without data",
			});
		}

		const hasAggregates = fields.some((f) =>
			f.match(/(SUM|COUNT|AVG|MIN|MAX)\(/i)
		);
		const sql = `
            SELECT ${filteredFields.join(", ")}
            FROM "${primaryTable}"
            ${joins.join("\n")}
            ${
							hasAggregates && filteredGroupByFields.length > 0
								? `GROUP BY ${filteredGroupByFields.join(", ")}`
								: ""
						}`;

		const result = await pool.query(sql);
		return res.status(200).json({
			status: "success",
			data: result.rows,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in joining these tables at this moment. Please retry",
		});
	}
};

module.exports = joinTables;
