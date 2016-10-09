'use strict';

var request = require('../utils/request');
var originalRequest = require('request');
var Promise = require('bluebird');
var Client = require("../config/database").client;
var Ip = require("../config/database").ip;
var SerialPort = require("serialport");
var portName = 'COM4';
var port = new SerialPort(portName, {
  baudRate: 9600,
  autoOpen: false,
  parser: SerialPort.parsers.readline('\n')
});
var watchers = [];
var nonce = "";
var timestamp = "";
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

function performGatewayLogin() {
  return new Promise(function (resolve, reject) {
    if (nonce) {
      resolve();
    }
    nonce = ("" + Math.random()).substr(2, 5);
    timestamp = Date.now();
    originalRequest(process.env.GATEWAY_LOGIN_URL + '&_n=' +
      nonce + '&_=' + timestamp, function (err, message, body) {
        if (body && JSON.parse(body).valid) {
          resolve();
        }
        else {
          reject(Error("Something went wrong while logging in."));
        }
      });

  });
}

function getGatewayIp() {
  return new Promise(function (resolve, reject) {
    performGatewayLogin()
      .then(function () {
        originalRequest(process.env.GET_WAN_IP_URL + ';&' + "_n=" +
          nonce + '&_=' + timestamp, {
            headers: {
              Cookie: process.env.GATEWAY_CREDENTIALS
            }
          }, function (err, message, body) {
            if (body) {
              if (/PLEASE LOGIN/.test(body)) {
                nonce = undefined;
                return reject(Error("Invalid nonce. Perform login again."));
              }
              body = JSON.parse(body);
              var hexIp = body[process.env.WAN_IP_OID];
              if (!hexIp) {
                reject(Error("Something went wrong while getting the gateway's IP."));
              }
              hexIp = hexIp.substr(1, hexIp.length);
              var stringIp = [hexIp.substr(0, 2),
                hexIp.substr(2, 2),
                hexIp.substr(4, 2),
                hexIp.substr(6, 2)];
              var ip = "";
              for (var i = 0; i < 4; i++) {
                ip += parseInt(stringIp[i], 16);
                if (i < 3) {
                  ip += '.';
                }
              }
              resolve(ip);
            }
            else {
              return reject(Error("Something went wrong while getting the gateway's IP."));
            }

          });
      })
      .catch(function (err) {
        console.log(err);
      });

  });
}

setInterval(function () {
		var lastIp;
  var currentIp;
  Ip.findOneAsync()
    .then(function (doc) {
      lastIp = doc;
      return getGatewayIp();
    })
    .then(function (ip) {
      currentIp = ip;
      console.log(ip);

      if (!lastIp) {
        return new Ip({ ip: ip }).saveAsync();
      }

    })
    .then(function (savedIp) {
      lastIp = lastIp || savedIp;
      if (lastIp && lastIp.ip !== currentIp) {
        //send notification 
        notificate({
          data: {
            ip: currentIp
          },
          to: process.env.DEBUG_TOKEN,
          notification: {
            body: currentIp,
            title: "IP change!",
            icon: "myicon"
          },
          priority: "high"
        });
        console.log('IP changed. Sending notification.');
        lastIp.ip = currentIp;
        return lastIp.saveAsync();
      }
    })
    .catch(function (err) {
      console.log(err);
    });
}, 30000);

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