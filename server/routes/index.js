'use strict';

var request = require('../utils/request');
var SerialPort = require("serialport");
var portName = 'COM4';
var port = new SerialPort(portName, {
   baudRate: 9600,
   autoOpen: false,
   parser: SerialPort.parsers.readline('\n')
});

port.on('data', function (data) {
  console.log('Data: ' + data);
});

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }

  port.write('main screen turn on');
});

module.exports = function (app) {

    app.route('/test')
        .post(function (req, res) {
            console.log('body: ', req.body);
            res.json({ ok: 'ok' })
        });

};