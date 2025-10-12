const { Pool } = require("pg");
require("dotenv").config();

const pools = new Map(); //ideally should be reddis
const delimiter = process.env.POOL_KEY_DELIMITER;

function getDBPool({ user, host, database, password, port }) {
	const key = `${host}${delimiter}${database}${delimiter}${user}${delimiter}${port}`;

	if (pools.has(key)) {
		return pools.get(key);
	}

	const pool = new Pool({
		user,
		host,
		database,
		password,
		port,
		ssl: {
			rejectUnauthorized: false,
		},
	});

	pool.on("connect", () => {
		console.log(`Connected to DB: ${database}`);
	});

	pool.on("error", (err) => {
		console.error(`Unexpected error on DB: ${database}`, err);
	});

	pools.set(key, pool);
	return pool;
}

module.exports = getDBPool;
