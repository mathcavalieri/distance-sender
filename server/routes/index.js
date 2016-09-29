'use strict';

var request = require('../utils/request');
var SerialPort = require("serialport");
var portName = 'COM4';
var port = new SerialPort(portName, {
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
  if (/value:/.test(data)) {
    data = data.replace(/value:/, "");
    var message = {
      data: {
        distance: parseInt(data)
      },
      to: process.env.DEBUG_TOKEN
    };
    request.post(process.env.API_KEY, '', message)
      .then(function (result) {
        console.log(result);
      });
  }
});

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }

  console.log('port opened');
});

module.exports = function (app) {

  app.route('/test')
    .post(function (req, res) {
      writeAndDrain('v', function () { });
      res.json({ ok: 'ok' });
    });

};