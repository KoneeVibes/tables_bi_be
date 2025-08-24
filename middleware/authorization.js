const jwt = require("jsonwebtoken");
const appPGDBPool = require("../db/pgDBPoolManager");
const { tokenBlacklist } = require("../controller/authentication/signOut");
require("dotenv").config();

module.exports = async (req, res, next) => {
	// connect to database
	const dbConfig = {
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_PORT,
	};
	const pgPool = appPGDBPool(dbConfig);

	try {
		const authHeader = req.headers.authorization;
		if (!authHeader)
			return res.status(401).json({
				status: "fail",
				message: "Authorization header missing",
			});

		const token = authHeader.split(" ")[1];
		if (!token)
			return res.status(404).json({
				status: "fail",
				message: "Token is missing in authorization header",
			});
		if (tokenBlacklist.has(token))
			return res.status(401).json({
				status: "fail",
				message: "Token is blacklisted",
			});

		let decodedToken;
		try {
			decodedToken = jwt.verify(token, process.env.JWT_SECRET);
		} catch (err) {
			return res.status(401).json({
				status: "fail",
				message: "Invalid or expired token",
			});
		}

		const user = await pgPool.query("SELECT * FROM users WHERE id = $1", [
			decodedToken.userId,
		]);
		if (user.rows.length === 0)
			return res.status(404).json({
				status: "fail",
				message: "User not found",
			});
		req.user = user.rows[0];
		next();
	} catch (err) {
		return res.status(500).json({
			status: "fail",
			message: "Server encountered an error. Contact Administrator",
		});
	}
};
