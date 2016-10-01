"use strict";

var mongoose = require("mongoose");
var Promise = require("bluebird");
Promise.promisifyAll(mongoose);

mongoose.connect('mongodb://localhost/distance-sender');

var clientSchema = mongoose.Schema({
    token: String
});

module.exports = mongoose.model('Client', clientSchema);