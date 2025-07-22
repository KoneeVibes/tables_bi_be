const Pool = require('pg').Pool;
require('dotenv').config();

function appDBConnect() {
    const pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    });

    pool.on("connect", () => {
        console.log("Connected to the application database successfully.");
    })

    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });

    return pool;
}

module.exports = appDBConnect;
