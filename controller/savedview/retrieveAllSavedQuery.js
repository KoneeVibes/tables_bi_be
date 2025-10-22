const { decrypt } = require("../../util/encryption");
const appPGDBPool = require("../../db/pgDBPoolManager");

const retrieveAllSavedQuery = async (req, res) => {
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
				message: "No saved queries found for this user.",
			});
		}

		const connectionIds = connectionConfigs.map((c) => c.id);
		const queryConfigsResult = await pgPool.query(
			`SELECT * FROM query_config WHERE connection_id = ANY($1::uuid[])`,
			[connectionIds]
		);
		const queryConfigs = queryConfigsResult.rows;
		if (queryConfigs.length === 0) {
			return res.status(200).json({
				status: "success",
				data: [],
				message: "No saved queries found for these connections.",
			});
		}

		const queryIds = queryConfigs.map((q) => q.id);
		const tableRelationshipsResult = await pgPool.query(
			`SELECT * FROM table_relationship WHERE query_id = ANY($1::uuid[])`,
			[queryIds]
		);
		const tableRelationships = tableRelationshipsResult.rows;

		const queryTablesResult = await pgPool.query(
			`SELECT * FROM query_table WHERE query_id = ANY($1::uuid[])`,
			[queryIds]
		);
		const queryTables = queryTablesResult.rows;

		const queryTableIds = queryTables.map((t) => t.id);
		const queryFieldsResult = await pgPool.query(
			`SELECT * FROM query_field WHERE query_table_id = ANY($1::uuid[])`,
			[queryTableIds]
		);
		const queryFields = queryFieldsResult.rows;

		const queryFieldIds = queryFields.map((f) => f.id);
		const queryAggregatesResult = await pgPool.query(
			`SELECT * FROM query_aggregate WHERE query_field_id = ANY($1::uuid[])`,
			[queryFieldIds]
		);
		const queryAggregates = queryAggregatesResult.rows;

		const querySortResult = await pgPool.query(
			`SELECT * FROM query_sort WHERE query_id = ANY($1::uuid[])`,
			[queryIds]
		);
		const querySorts = querySortResult.rows;

		const queryFilterResult = await pgPool.query(
			`SELECT * FROM query_filter WHERE query_id = ANY($1::uuid[])`,
			[queryIds]
		);
		const queryFilters = queryFilterResult.rows;

		const finalResults = queryConfigs.map((queryConfig) => {
			const connectionConfig = connectionConfigs.find(
				(c) => c.id === queryConfig.connection_id
			);
			const tablesForQuery = queryTables.filter(
				(t) => t.query_id === queryConfig.id
			);

			const datasourceDetails = {};
			let secondaryIndex = 0;
			tablesForQuery.forEach((table) => {
				const tableKey = table.is_primary
					? "primaryTable"
					: `secondaryTable_${secondaryIndex}`;
				const fieldKey = table.is_primary
					? "primaryTableFields"
					: `secondaryTable_${secondaryIndex}_Fields`;

				datasourceDetails[tableKey] = table.table_name;

				const fieldsForTable = queryFields
					.filter((f) => f.query_table_id === table.id)
					.map((f) => {
						const aggregate = queryAggregates.find(
							(a) => a.query_field_id === f.id
						);
						return {
							name: f.field_name,
							aggregate: aggregate ? aggregate.aggregate_name : "",
						};
					});

				datasourceDetails[fieldKey] = fieldsForTable;

				if (!table.is_primary) secondaryIndex++;
			});

			const relationshipsForQuery = tableRelationships.filter(
				(r) => r.query_id === queryConfig.id
			);
			const tableRelationshipsGrouped = {};
			for (const rel of relationshipsForQuery) {
				if (!tableRelationshipsGrouped[rel.relationship_group]) {
					tableRelationshipsGrouped[rel.relationship_group] = [];
				}
				tableRelationshipsGrouped[rel.relationship_group].push({
					source_table: rel.source_table,
					source_column: rel.source_column,
					target_table: rel.target_table,
					target_column: rel.target_column,
				});
			}

			const sortsForQuery = querySorts
				.filter((s) => s.query_id === queryConfig.id)
				.map(({ field, value, order_index }) => ({
					field,
					value,
					order_index,
				}));

			const filtersForQuery = queryFilters
				.filter((f) => f.query_id === queryConfig.id)
				.map(({ field, value, criteria }) => ({ field, value, criteria }));

			return {
				queryDetails: {
					name: queryConfig.name,
					createdAt: queryConfig.created_at,
				},
				connectionConfig: {
					id: connectionConfig.id,
					user: connectionConfig.user_name,
					host: connectionConfig.host,
					dbName: connectionConfig.database_name,
					dbType: connectionConfig.database_type,
					port: connectionConfig.port,
					password: decrypt(connectionConfig.password),
					createdAt: connectionConfig.created_at, //added this field so we can use this timestamp as cutoff while re-joining table
				},
				datasourceDetails,
				resultFilter: {
					sort: sortsForQuery,
					filter: filtersForQuery,
				},
				tableRelationships: tableRelationshipsGrouped,
			};
		});
		return res.status(200).json({ status: "success", data: finalResults });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "error",
			message:
				"Server encountered an issue in retrieving all saved queries at this moment. Please retry",
		});
	}
};

module.exports = retrieveAllSavedQuery;
