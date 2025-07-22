const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require('dotenv').config();

const appDBConnect = require('../../db/appDBConnect');
const pool = appDBConnect();

const signInUser = async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
        return res.status(400).json({
            status: "fail",
            message: "Incomplete User Details, Cannot Proceed"
        });
    };

    try {
        const user = await pool.query(
            'SELECT id, password FROM users WHERE email = $1',
            [email]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid email or password."
            });
        };

        const isPasswordValid = await bcrypt.compare(password, user.rows[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: "fail",
                message: "Invalid email or password."
            });
        };

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.rows[0].id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        return res.status(200).json({
            status: "success",
            message: "User successfully signed in.",
            token
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "fail",
            message: "Server encountered an issue in authenticating this user. Please retry"
        });
    }
};

module.exports = signInUser;
