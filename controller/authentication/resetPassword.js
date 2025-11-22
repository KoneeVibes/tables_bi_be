const bcrypt = require("bcrypt");
const appPGDBPool = require("../../db/pgDBPoolManager");
const isValidString = require("../../helper/isValidString");

const resetPassword = async (req, res) => {
	const { userId } = req.params || {};
	const { newPassword, confirmNewPassword } = req.body || {};

	if (!userId || !isValidString(userId)) {
		return res.status(400).json({
			status: "fail",
			message: "Invalid user id, Cannot Proceed",
		});
	}

	if (!newPassword?.trim() || !confirmNewPassword?.trim()) {
		return res.status(400).json({
			status: "error",
			message: "All fields are required",
		});
	}

	if (newPassword !== confirmNewPassword) {
		return res.status(400).json({
			status: "fail",
			message: "Passwords do not match",
		});
	}

	const dbConfig = {
		user: process.env.DB_USER,
		host: process.env.DB_HOST,
		database: process.env.DB_NAME,
		password: process.env.DB_PASSWORD,
		port: process.env.DB_PORT,
	};
	const pgPool = appPGDBPool(dbConfig);

	try {
		const existingUser = await pgPool.query(
			"SELECT id, email FROM app_user WHERE id = $1",
			[userId]
		);
		if (existingUser.rowCount === 0) {
			return res.status(404).json({
				status: "fail",
				message: "User not found.",
			});
		}

		const verificationOTP = await pgPool.query(
			"SELECT otp FROM valid_account_verification_otp WHERE requester = $1 ORDER BY created_at DESC LIMIT 1",
			[existingUser.rows[0].email]
		);
		if (verificationOTP.rowCount === 0) {
			return res.status(404).json({
				status: "fail",
				message: "OTP not found.",
			});
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUser = await pgPool.query(
			"UPDATE app_user SET password = $1, updated_at = NOW() WHERE id = $2",
			[hashedPassword, userId]
		);
		if (updatedUser.rowCount === 0) {
			return res.status(500).json({
				status: "fail",
				message: "Failed to reset password. Please try again.",
			});
		}

		await pgPool.query(
			"DELETE FROM account_verification_otp WHERE requester = $1",
			[existingUser.rows[0].email]
		);

		return res.status(200).json({
			status: "success",
			message: "Password successfully updated. Proceed to login.",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "fail",
			message:
				"Server encountered an error while resetting user password. Please retry.",
		});
	}
};

module.exports = resetPassword;
