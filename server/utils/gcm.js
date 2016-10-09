"use strict";
var Client = require("../config/database").client;
var request = require('../utils/request');


module.exports = {
    /**
     * Sends a notification through the Google Cloud Messaging platform.
     */
    notificate: function (/**The template of the notification. */messageTemplate) {
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
};