const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOption");
const cookieParser = require("cookie-parser");

// middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// api routes would go under here:
app.use("/api/v1/authentication", require("./route/authentication"));
app.use(
	"/api/v1/user-management",
	require("./middleware/authorization"),
	require("./route/userManagement")
);
app.use(
	"/api/v1/connection",
	require("./middleware/authorization"),
	require("./route/connection")
);
app.use(
	"/api/v1/query",
	require("./middleware/authorization"),
	require("./route/query")
);
app.use(
	"/api/v1/saved-view",
	require("./middleware/authorization"),
	require("./route/savedView")
);

module.exports = app;
