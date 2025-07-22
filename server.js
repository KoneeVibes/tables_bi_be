const http = require("http");
const app = require("./app");

const server = http.createServer(app);

server.on("listening", () => console.log('The server is connected and listening for request'));
server.listen(8971);
