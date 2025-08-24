const retrieveLoggedInUser = async (req, res) => {
	try {
		if (req.user) {
			return res.status(200).json({
				status: "success",
				message: "success",
				data: req.user,
			});
		} else {
			return res.status(404).json({
				status: "success",
				message: "User not found",
			});
		}
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			status: "fail",
			message:
				"Server encountered an issue in retrieving this User at this moment. Please retry",
		});
	}
};

module.exports = retrieveLoggedInUser;
