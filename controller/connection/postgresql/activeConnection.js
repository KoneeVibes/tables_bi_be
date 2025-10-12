const activeConnections = new Map(); //should ideally be reddis

function setActiveConnection(userId, poolKey) {
	activeConnections.set(userId, poolKey);
}

function getActiveConnection(userId) {
	return activeConnections.get(userId);
}

module.exports = { setActiveConnection, getActiveConnection };
