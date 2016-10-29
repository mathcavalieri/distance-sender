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
    var emergMessage = {
        data: {
            temperature: parseInt(data)
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
    if (/temp:/.test(data)) {
        data = data.replace(/temp:/, "");
        data = parseFloat(data);
        //"notify" the watchers
        watchers.forEach(function (watcher) {
            try {
                watcher.res.json({ temperature: data });
                watcher.callback(data);
            } catch (error) {

            }
        });
        watchers = [];
        //simulate an emergency value
        setTimeout(function () {
            emergMessage.data.temperature = 100;
            emergMessage.notification.body = 100;
            gcm.notificate(emergMessage);
        }, 5000);
    }

    if (/emerg:/.test(data)) {
        data = data.replace(/emerg:/, "");
        emergMessage.data.temperature = parseInt(data);
        emergMessage.notification.body = parseInt(data);
        gcm.notificate(emergMessage);
    }
    if (/motion:/.test(data)) {
        console.log(new Date(), data.replace(/motion:/, ""));
    }
});
function connectToArduino() {
    return new Promise(function (resolve, reject) {
        try {
            if (!port.opening) {
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
        }
        catch (err) {
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

    registerWatcher: function (watcher, cb) {
        watchers.push({ res: watcher, callback: cb });
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