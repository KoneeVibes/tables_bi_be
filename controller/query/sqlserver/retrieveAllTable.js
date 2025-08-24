const retrieveAllTable = (req, res) => {
	return res.status(200).json({
		status: "success",
		message: "Handled by SQL Server controller.",
	});
};

module.exports = retrieveAllTable;
