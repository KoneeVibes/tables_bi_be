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
	"/api/v1/usermanagement",
	require("./middleware/authorization"),
	require("./route/usermanagement")
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

module.exports = app;
