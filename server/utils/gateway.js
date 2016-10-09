"use strict";

var nonce,
    timestamp,
    originalRequest = require("request"),
    Promise = require("bluebird"),
    gcm = require("./gcm"),
    Ip = require("../config/database").ip;

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

module.exports = {
    /**
     * Starts capturing the gateway IP and sending notifications when necessary.
     */
    start: function (/**The time, in milliseconds, in between each check. Defaults to 30 seconds.*/interval) {
        interval = interval || 30000;
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
                        gcm.notificate({
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
        }, interval);
    }
};
