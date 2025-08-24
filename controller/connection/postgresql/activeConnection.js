const activeConnections = new Map();

function setActiveConnection(userId, poolKey) {
	activeConnections.set(userId, poolKey);
}

function getActiveConnection(userId) {
	return activeConnections.get(userId);
}

module.exports = { setActiveConnection, getActiveConnection };
