const isValidString = require("../../helper/isValidString");
const appPGDBPool = require("../../db/pgDBPoolManager");

const completeProfile = async (req, res) => {
	const { userId } = req.params || {};
	const { jobTitle, purpose, acquisitionMethod } = req.body || {};

	if (!userId || !isValidString(userId)) {
		return res.status(400).json({
			status: "fail",
			message: "Invalid user id, Cannot Proceed",
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
		const result = await pgPool.query(
			"UPDATE users SET job_title = $1, purpose = $2, acquisition_method = $3, updated_at = NOW() where id = $4",
			[jobTitle, purpose, acquisitionMethod, userId]
		);

		if (result.rowCount === 0) {
			return res.status(404).json({
				status: "fail",
				message: "User not found.",
			});
		}

		return res.status(200).json({
			status: "success",
			message: "User profile successfully completed.",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "fail",
			message:
				"Server encountered an error while completing user profile. Please retry.",
		});
	}
};

module.exports = completeProfile;
