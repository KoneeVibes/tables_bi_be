const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const appPGDBPool = require("../../db/pgDBPoolManager");
require("dotenv").config();

const signUpUser = async (req, res) => {
	const {
		firstName,
		lastName,
		email,
		password,
		confirmPassword,
		organization,
	} = req.body || {};

	// Validate required fields
	if (!firstName || !lastName || !email || !password || !confirmPassword) {
		return res.status(400).json({
			status: "fail",
			message: "Incomplete user details. Cannot proceed.",
		});
	}

	if (password !== confirmPassword) {
		return res.status(400).json({
			status: "fail",
			message: "Passwords do not match. Cannot proceed.",
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
		// Check if user already exists
		const existingUser = await pgPool.query(
			"SELECT id, email, status FROM app_user WHERE email = $1",
			[email]
		);

		// send otp to verify email and send a response
		if (
			existingUser.rows.length > 0 &&
			existingUser.rows[0].status === "inactive"
		) {
			const existingOTP = await pgPool.query(
				"SELECT * FROM valid_account_verification_otp WHERE requester = $1",
				[existingUser.rows[0].email]
			);
			if (existingOTP.rows.length > 0) {
				return res.status(409).json({
					status: "fail",
					message:
						"An OTP has already been sent to this email. Please verify your email.",
				});
			} else {
				// Generate and hash a random 6-digit OTP
				const randomSixDigits = crypto.randomInt(100000, 999999).toString();
				const hashedOTP = await bcrypt.hash(randomSixDigits, 10);

				// Store the OTP in the database
				const otpId = uuidv4();
				await pgPool.query(
					`INSERT INTO account_verification_otp (id, requester, otp)
                    VALUES ($1, $2, $3)`,
					[otpId, existingUser.rows[0].email, hashedOTP]
				);

				// Send the OTP via email
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
			}
		}

		// If user already exists, return conflict status
		if (existingUser.rows.length > 0) {
			return res.status(409).json({
				status: "fail",
				message: "A user with this email already exists.",
			});
		}

		// Hash the password using bcrypt
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// Insert new user
		const userId = uuidv4();
		const newUser = await pgPool.query(
			`INSERT INTO app_user (id, first_name, last_name, email, organization, password)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING email`,
			[userId, firstName, lastName, email, organization || null, hashedPassword]
		);

		// Generate and hash a random 6-digit OTP
		const randomSixDigits = crypto.randomInt(100000, 999999).toString();
		const hashedOTP = await bcrypt.hash(randomSixDigits, 10);

		// Store the OTP in the database
		const otpId = uuidv4();
		await pgPool.query(
			`INSERT INTO account_verification_otp (id, requester, otp)
            VALUES ($1, $2, $3)`,
			[otpId, newUser.rows[0].email, hashedOTP]
		);

		// Send the OTP via email
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
			return res.status(201).json({
				status: "success",
				message: "User created and OTP sent successfully",
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
				"Server encountered an error while creating the user. Please retry.",
		});
	}
};

module.exports = signUpUser;
