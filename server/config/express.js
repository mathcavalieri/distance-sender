var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.json());

consign({ verbose: false })
	.include('./server/routes/index.js')
	.into(app);

module.exports = app;
