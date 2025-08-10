const bcrypt = require("bcrypt");
const getPGDBPool = require('../../db/pgDBPoolManager');
require('dotenv').config();

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
        return res.status(400).json({
            status: "fail",
            message: "Email or OTP not found, Cannot Proceed"
        });
    };

    // connect to database
    const dbConfig = {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };
    const pgPool = getPGDBPool(dbConfig);

    try {
        const existingOTP = await pgPool.query(
            'SELECT otp FROM valid_account_verification_otps WHERE requester = $1',
            [email]
        );
        if (existingOTP.rows.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No OTP found or OTP has expired. Please request a new one.",
            });
        };

        const hashedOtp = existingOTP.rows[0].otp;
        const isMatch = await bcrypt.compare(otp, hashedOtp);
        if (!isMatch) {
            return res.status(400).json({
                status: "fail",
                message: "OTP not valid. Please try again"
            });
        }

        // If OTP is valid, update user status to active and delete the OTP record
        const updatedUser = await pgPool.query(
            'UPDATE users SET status = $1 WHERE email = $2 RETURNING id',
            ['active', email]
        );
        await pgPool.query(
            'DELETE FROM account_verification_otps WHERE requester = $1',
            [email]
        );

        return res.status(200).json({
            status: "success",
            message: "OTP is successfully verified",
            data: { id: updatedUser.rows[0].id }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "fail",
            message: "Server encountered an error while verifying user authentication OTP. Please retry.",
        });
    }
};

module.exports = verifyOtp;
