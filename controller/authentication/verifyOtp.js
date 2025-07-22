const bcrypt = require("bcrypt");

const appDBConnect = require('../../db/appDBConnect');
const pool = appDBConnect();

const verifyOtp = async (req, res) => {
    const { email, otp } = req.body || {};
    if (!email || !otp) {
        return res.status(400).json({
            status: "fail",
            message: "Email or OTP not found, Cannot Proceed"
        });
    };
    try {
        const existingOTP = await pool.query(
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
        await pool.query(
            'UPDATE users SET status = $1 WHERE email = $2',
            ['active', email]
        );
        await pool.query(
            'DELETE FROM account_verification_otps WHERE requester = $1',
            [email]
        );

        return res.status(200).json({
            status: "success",
            message: "OTP is successfully verified",
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
