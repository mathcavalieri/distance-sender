"use strict";

var mongoose = require("mongoose");
var Promise = require("bluebird");
Promise.promisifyAll(mongoose);

mongoose.connect('mongodb://localhost/distance-sender');

var clientSchema = mongoose.Schema({
    token: String
});

var ipSchema = mongoose.Schema({
    ip: String
});

module.exports = {
    client: mongoose.model('Client', clientSchema),
    ip: mongoose.model('Ip', ipSchema)
};