const saveQuery = async (req, res) => {
	return res.status(200).json({
		status: "success",
		message: "Handled by SQL Server controller.",
	});
};

module.exports = saveQuery;
