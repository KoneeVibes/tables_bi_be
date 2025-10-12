const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const appPGDBPool = require("../../db/pgDBPoolManager");
require("dotenv").config();

const signInUser = async (req, res) => {
	const { email, password } = req.body || {};
	if (!email || !password) {
		return res.status(400).json({
			status: "fail",
			message: "Incomplete User Details, Cannot Proceed",
		});
	}

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
		const user = await pgPool.query(
			"SELECT id, password FROM app_user WHERE email = $1 AND status = $2",
			[email, "active"]
		);

		if (user.rows.length === 0) {
			return res.status(401).json({
				status: "fail",
				message: "Invalid email or password.",
			});
		}

		const isPasswordValid = await bcrypt.compare(
			password,
			user.rows[0].password
		);
		if (!isPasswordValid) {
			return res.status(401).json({
				status: "fail",
				message: "Invalid email or password.",
			});
		}

		// Generate JWT token
		const token = jwt.sign(
			{ userId: user.rows[0].id },
			process.env.JWT_SECRET,
			{ expiresIn: "24h" }
		);
		return res.status(200).json({
			status: "success",
			message: "User successfully signed in.",
			token,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "fail",
			message:
				"Server encountered an issue in authenticating this user. Please retry",
		});
	}
};

module.exports = signInUser;
