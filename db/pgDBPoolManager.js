const { Pool } = require("pg");

const pools = new Map();
const delimiter = process.env.POOL_KEY_DELIMITER;

function getDBPool({ user, host, database, password, port }) {
	const key = `${host}${delimiter}${database}${delimiter}${user}`;

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
