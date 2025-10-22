const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const appPGDBPool = require("../../db/pgDBPoolManager");
const {
	getActiveConnection,
} = require("../connection/activeConnection");
const determineDBType = require("../../helper/dbTypeDeterminer");
const { encrypt } = require("../../util/encryption");

const delimiter = process.env.POOL_KEY_DELIMITER;

const saveQuery = async (req, res) => {
	//setup app db connection
	const appDbConfig = {
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_PORT,
	};

	const appDbPool = appPGDBPool(appDbConfig);
	const client = await appDbPool.connect();

	try {
		const { id } = req.user || {};
		const { authorization } = req.headers;
		const {
			resultFilter,
			tableRelationship,
			datasourceDetails,
			queryName = "undefined",
		} = req.body || {};

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
						fields.push(
							`${tableName}.${col.name} AS "${tableName}.${col.name}"`
						);
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

		const poolKey = getActiveConnection(authorization.split(" ")[1]);
		if (!poolKey) {
			return res
				.status(400)
				.json({ status: "fail", message: "No active DB connection" });
		}
		const [host, dbName, username, port, password] = poolKey.split(delimiter);

		// start transaction
		await client.query("BEGIN");

		const connectionConfigId = uuidv4();
		const dbType = determineDBType(req);
		const encryptedPassword = encrypt(password);
		const connectionConfig = await client.query(
			`INSERT INTO connection_config (id, user_name, host, database_name, database_type, port, password, owner_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			[
				connectionConfigId,
				username,
				host,
				dbName,
				dbType,
				parseInt(port, 10),
				encryptedPassword,
				id,
			]
		);
		if (connectionConfig.rowCount === 0) {
			return res.status(500).json({
				status: "error",
				message: "Failed to save connection configuration",
			});
		}

		const queryConfigId = uuidv4();
		const queryConfig = await client.query(
			`INSERT INTO query_config (id, name, connection_id)
             VALUES ($1, $2, $3)`,
			[queryConfigId, queryName, connectionConfigId]
		);
		if (queryConfig.rowCount === 0) {
			return res.status(500).json({
				status: "error",
				message: "Failed to save query configuration",
			});
		}

		for (const [relationshipGroup, relationships] of Object.entries(
			tableRelationship
		)) {
			for (const rel of relationships) {
				const tableRelationshipId = uuidv4();
				const relationship = await client.query(
					`INSERT INTO table_relationship (
                   id,
                   query_id,
                   relationship_group,
                   source_table,
                   source_column,
                   target_table,
                   target_column
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
					[
						tableRelationshipId,
						queryConfigId,
						relationshipGroup,
						rel.source_table,
						rel.source_column,
						rel.target_table,
						rel.target_column,
					]
				);
				if (relationship.rowCount === 0) {
					return res.status(500).json({
						status: "error",
						message: `Failed to save table relationship: ${relationshipGroup}`,
					});
				}
			}
		}

		const tableRecords = [];
		const primaryTableId = uuidv4();
		const primaryQueryTable = await client.query(
			`INSERT INTO query_table (id, query_id, table_name, key_name, is_primary)
             VALUES ($1, $2, $3, $4, $5)`,
			[
				primaryTableId,
				queryConfigId,
				datasourceDetails.primaryTable,
				"primaryTable",
				true,
			]
		);
		if (primaryQueryTable.rowCount === 0) {
			return res.status(500).json({
				status: "error",
				message: "Failed to save primary query table",
			});
		}
		tableRecords.push({ key: "primaryTable", id: primaryTableId });

		const secondaryTables = Object.keys(datasourceDetails).filter(
			(key) => key.startsWith("secondaryTable_") && !key.endsWith("_Fields")
		);
		for (const tableKey of secondaryTables) {
			const tableName = datasourceDetails[tableKey];
			const queryTableId = uuidv4();
			const secondaryQueryTable = await client.query(
				`INSERT INTO query_table (id, query_id, table_name, key_name, is_primary)
                 VALUES ($1, $2, $3, $4, $5)`,
				[queryTableId, queryConfigId, tableName, tableKey, false]
			);
			if (secondaryQueryTable.rowCount === 0) {
				return res.status(500).json({
					status: "error",
					message: `Failed to save secondary query table: ${tableName}`,
				});
			}
			tableRecords.push({ key: tableKey, id: queryTableId });
		}

		for (const { key, id: queryTableId } of tableRecords) {
			const fieldKey = key.startsWith("secondaryTable_")
				? `${key}_Fields`
				: `${key}Fields`;
			const fields = datasourceDetails[fieldKey] || [];
			for (const fieldObj of fields) {
				const { name: fieldName, aggregate: aggregateName } = fieldObj;
				const queryFieldId = uuidv4();
				const field = await client.query(
					`INSERT INTO query_field (id, query_table_id, field_name)
                     VALUES ($1, $2, $3)`,
					[queryFieldId, queryTableId, fieldName]
				);
				if (field.rowCount === 0) {
					return res.status(500).json({
						status: "error",
						message: `Failed to save field: ${fieldName} for table key: ${key}`,
					});
				}
				if (aggregateName && aggregateName.trim() !== "") {
					const queryAggregateId = uuidv4();
					const aggregate = await client.query(
						`INSERT INTO query_aggregate (id, query_field_id, aggregate_name)
                         VALUES ($1, $2, $3)`,
						[queryAggregateId, queryFieldId, aggregateName]
					);
					if (aggregate.rowCount === 0) {
						return res.status(500).json({
							status: "error",
							message: `Failed to save aggregate for field: ${fieldName}`,
						});
					}
				}
			}
		}

		if (resultFilter) {
			const { sort = [], filter = [] } = resultFilter;

			for (let i = 0; i < sort.length; i++) {
				const { field = "", value = "" } = sort[i];
				const cleanField = field.trim() || null;
				const cleanValue = value.trim() || null;
				if (!cleanField && !cleanValue) continue;
				const sortConfigId = uuidv4();
				const orderIndex = i;
				const sortInsert = await client.query(
					`INSERT INTO query_sort (id, query_id, field, value, order_index)
                     VALUES ($1, $2, $3, $4, $5)`,
					[sortConfigId, queryConfigId, cleanField, cleanValue, orderIndex]
				);
				if (sortInsert.rowCount === 0) {
					return res.status(500).json({
						status: "error",
						message: "Failed to save sort configuration",
					});
				}
			}

			for (const filterConfig of filter) {
				const { field = "", criteria = "", value = "" } = filterConfig;
				const cleanField = field.trim() || null;
				const cleanCriteria = criteria.trim() || null;
				const cleanValue = String(value).trim() || null;
				if (!cleanField && !cleanCriteria && !cleanValue) continue;
				const filterConfigId = uuidv4();
				const filterInsert = await client.query(
					`INSERT INTO query_filter (id, query_id, field, value, criteria)
                     VALUES ($1, $2, $3, $4, $5)`,
					[filterConfigId, queryConfigId, cleanField, cleanValue, cleanCriteria]
				);
				if (filterInsert.rowCount === 0) {
					return res.status(500).json({
						status: "error",
						message: "Failed to save filter configuration",
					});
				}
			}
		}

		await client.query("COMMIT");
		return res.status(201).json({
			status: "success",
			message: "Query saved successfully",
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in starting the save process. Please retry",
		});
	} finally {
		client.release();
	}
};

module.exports = saveQuery;
