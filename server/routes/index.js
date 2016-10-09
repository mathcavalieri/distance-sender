'use strict';

var Client = require("../config/database").client;
var arduino = require("../arduino/arduino");
var gateway = require("../utils/gateway");


arduino.connect()
  .catch(function (err) {
    console.log(err);
  });
gateway.start();

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
      arduino.sendString('v')
        .catch(function (err) {
          console.log(err);
        });
      arduino.registerWatcher(res);
      setTimeout(function () {
        if (arduino.getWatchers().length !== 0) {
          try {
            res.status(500).json({ message: "Error on the Arduino communication." });
            arduino.clearWatchers();
          }
          catch (err) {

          }
          finally {
            arduino.connect()
              .catch(function (err) {
                console.log(err);
              });
          }
        }
      }, 15000);
    });

  app.route('/register')
    .post(function (req, res) {
      if (!req.body.token) {
        res.status(400).json({ message: 'Client token not provided.' });
      }
      else {
        Client.findOneAsync({ token: req.body.token })
          .then(function (doc) {
            if (doc) {
              res.status(400).json({ message: "Already registered." });
            }
            else {
              var client = new Client({ token: req.body.token });
              return client.saveAsync();
            }
          })
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