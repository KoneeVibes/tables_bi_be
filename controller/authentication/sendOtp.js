const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const appPGDBPool = require("../../db/pgDBPoolManager");
require("dotenv").config();

const sendOtp = async (req, res) => {
	const { email } = req.body || {};
	if (!email) {
		return res.status(400).json({
			status: "fail",
			message: "Invalid email. Cannot proceed.",
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
			"SELECT id, email, status FROM app_user WHERE email = $1",
			[email]
		);
		if (existingUser.rowCount === 0) {
			return res.status(404).json({
				status: "fail",
				message: "User not found.",
			});
		}

		const randomSixDigits = crypto.randomInt(100000, 999999).toString();
		const hashedOTP = await bcrypt.hash(randomSixDigits, 10);

		const otpId = uuidv4();
		await pgPool.query(
			`INSERT INTO account_verification_otp (id, requester, otp)
                    VALUES ($1, $2, $3)`,
			[otpId, existingUser.rows[0].email, hashedOTP]
		);

		const transporter = nodemailer.createTransport({
			host: process.env.MAIL_SERVER,
			port: 465,
			secure: true,
			auth: {
				user: process.env.MAIL_ID,
				pass: process.env.MAIL_PASSWORD,
			},
			// temporary workaround for local testing
			// should be removed in production
			tls: {
				rejectUnauthorized: false,
			},
		});
		const mailOptions = {
			from: process.env.MAIL_ID,
			to: email,
			subject: "Account Verification Code",
			text: `Your account verification OTP is ${randomSixDigits}`,
		};
		try {
			await transporter.sendMail(mailOptions);
			return res.status(200).json({
				status: "success",
				message: "OTP sent successfully",
			});
		} catch (err) {
			return res.status(500).json({
				status: "fail",
				message: "Server encountered an issue in sending OTP. Please retry",
			});
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "fail",
			message:
				"Server encountered an error while resetting user password. Please retry.",
		});
	}
};

module.exports = sendOtp;
