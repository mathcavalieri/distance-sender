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
var watchers = [];

function writeAndDrain(data, callback) {
  port.write(data, function () {
    port.drain(callback);
  });
}

function notificate(messageTemplate) {
  var notifications = [];
  Client.findAsync({})
    .then(function (list) {
      list.forEach(function (client) {
        messageTemplate.to = client.token;
        notifications.push(request.post(process.env.API_KEY, '', messageTemplate));
      });
      return notifications;
    })
    .all()
    .then(function () {
      console.log('Sent to ' + notifications.length + ' client(s)');
    })
    .catch(function (err) {
      throw err;
    });
}

port.on('data', function (data) {
  var message;
  if (/value:/.test(data)) {
    data = data.replace(/value:/, "");
    //"notify" the watchers
    watchers.forEach(function (res) {
      res.json({ distance: parseInt(data) });
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
    notificate(message);
  }
});

port.open(function (err) {
  if (err) {
    return console.log('Error opening port: ', err.message);
  }

  console.log('port opened');
});

module.exports = function (app) {
  app.use(function (req, res, next) {
    if (req.get("Authorization") === process.env.PASSWORD) {
      next();
    }
    else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  app.route('/check')
    .post(function (req, res) {
      writeAndDrain('v', function () { });
      //register this response as a watcher to the Arduino response
      watchers.push(res);
      setTimeout(function () {
        if (watchers.length !== 0) {
          res.status(500).json({ message: "Error on the Arduino communication." });
        }
      }, 15000);
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