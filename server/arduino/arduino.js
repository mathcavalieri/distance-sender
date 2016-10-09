"use strict";

var SerialPort = require("serialport");
var Promise = require('bluebird');
var watchers = [];
var gcm = require("../utils/gcm");
var port = new SerialPort('COM4', {
    baudRate: 9600,
    autoOpen: false,
    parser: SerialPort.parsers.readline('\n')
});

function writeAndDrain(data, callback) {
    port.write(data, function () {
        port.drain(callback);
    });
}

port.on('data', function (data) {
    var message;
    if (/value:/.test(data)) {
        data = data.replace(/value:/, "");
        //"notify" the watchers
        watchers.forEach(function (res) {
            try {
                res.json({ distance: parseInt(data) });
            } catch (error) {

            }
        });
        watchers = [];
    }

    if (/emerg:/.test(data)) {
        data = data.replace(/emerg:/, "");
        message = {
            data: {
                distance: parseInt(data)
            },
            to: process.env.DEBUG_TOKEN,
            notification: {
                body: parseInt(data),
                title: "Emergency!",
                icon: "myicon"
            },
            collapse_key: "1",
            priority: "high"
        };
        gcm.notificate(message);
    }
});
function connectToArduino() {
    return new Promise(function (resolve, reject) {
        try {
            port.close();
        } catch (error) {
            //must already have been closed
            console.log(error);
        }
        try {
            port.open(function (err) {
                if (err) {
                    console.log('Error opening port: ', err.message);
                    reject(err);
                }
                else {
                    console.log('Port opened.');
                    resolve();
                }
            });
        }
        catch (err) {
            console.log(err);
        }

    });
}
module.exports = {
    connect: function () {
        return connectToArduino();
    },
    sendString: function (data) {
        return new Promise(function (resolve, reject) {
            writeAndDrain(data, function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            });
        });
    },

    registerWatcher: function (watcher) {
        watchers.push(watcher);
        return this;
    },

    clearWatchers: function () {
        watchers = [];
        return this;
    },

    getWatchers: function () {
        return watchers;
    }

};