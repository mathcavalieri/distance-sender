'use strict';
var http = require('http');
var app = require('./server/config/express');

var server = http.createServer(app)
	.listen(3000, function () {
		console.log('Listening on port 3000');
	});
