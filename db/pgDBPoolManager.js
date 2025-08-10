const { Pool } = require('pg');

const pools = new Map();

function getDBPool({ user, host, database, password, port }) {
    const key = `${host}_${database}_${user}`;

    if (pools.has(key)) {
        return pools.get(key);
    };

    const pool = new Pool({ user, host, database, password, port });

    pool.on('connect', () => {
        console.log(`Connected to DB: ${database}`);
    });

    pool.on('error', (err) => {
        console.error(`Unexpected error on DB: ${database}`, err);
    });

    pools.set(key, pool);
    return pool;
}

module.exports = getDBPool;
