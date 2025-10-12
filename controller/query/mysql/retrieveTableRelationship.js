const retrieveAllRelatedTable = (req, res) => {
	return res.status(200).json({
		status: "success",
		message: "Handled by MySQL controller.",
	});
};

module.exports = retrieveAllRelatedTable;
