'use strict';

var request = require('../utils/request');
var Client = require("../config/database");
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
  var notifications = [];
  if (/value:/.test(data)) {
    data = data.replace(/value:/, "");
    var message = {
      data: {
        distance: parseInt(data)
      },
      to: process.env.DEBUG_TOKEN,
      notification: {
        body: parseInt(data),
        title: "Update!",
        icon: "myicon"
      },
      "collapse_key": "distance"
    };
    Client.findAsync({})
      .then(function (list) {
        list.forEach(function (client) {
          message.to = client.token;
          notifications.push(request.post(process.env.API_KEY, '', message));
        });
        return notifications;
      })
      .all()
      .then(function () {
        console.log(arguments);
        console.log('Sent to ' + notifications.length + ' client(s)');
      })
      .catch(function (err) {
        throw err;
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

  app.route('/register')
    .post(function (req, res) {
      if (!req.body.token) {
        res.status(400).json({ message: 'Client token not provided.' });
      }
      else {
        var client = new Client({ token: req.body.token });
        client.saveAsync()
          .then(function () {
            console.log(arguments);
            res.json();
          })
          .catch(function (err) {
            res.status(500).json(err);
          });
      }
    });

  app.route('/delete')
    .post(function (req, res) {
      if (!req.body.token) {
        res.status(400).json({ message: 'Client token not provided.' });
      }
      else {
        Client.removeAsync({ token: req.body.token })
          .then(function () {
            res.json();
          })
          .catch(function (err) {
            throw err;
          });
      }
    });

};