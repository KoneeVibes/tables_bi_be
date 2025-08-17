// This would ideally be a database/redis store for storing blacklisted tokens.
const tokenBlacklist = new Set();

const signOutUser = async (req, res) => {
	try {
		const { user } = req;
		// ensure that only authenticated users can log out
		if (!user)
			return res.status(401).json({
				status: "fail",
				message: "Unauthorized action. Please sign up/log in.",
			});
		const authHeader = req.headers.authorization;
		const token = authHeader.split(" ")[1];
		tokenBlacklist.add(token);
		res.status(200).json({
			status: "success",
			message: "Logged out successfully",
		});
	} catch (error) {
		return res.status(500).json({
			status: "fail",
			message: "Server encountered an error. Please try again",
		});
	}
};

module.exports = { signOutUser, tokenBlacklist };
