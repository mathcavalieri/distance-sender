'use strict';
var request = require("request");
var Promise = require("bluebird");

var defaultRequestOptions = {
    baseUrl: 'https://gcm-http.googleapis.com/gcm/send',
    json: true
};

var defaultRequest = request.defaults(defaultRequestOptions);

module.exports = {
    /**
     * Sends an HTTP GET. 
     * @param {string} auth: The value of the Authorization header.
     * @param {string} url: The URL.
     * @param {Object} headers: Optional, additional headers.
     */
    get: function (/**The value of the Authorization header. */auth,
    /**The URL. */url,
    /**Optional, additional headers. */ headers) {
        var headersRequest = headers || {};
        headersRequest.Authorization = auth;

        return new Promise(function (resolve, reject) {
            defaultRequest.get(url, {
                headers: headersRequest
            }, function (err, message, responseBody) {
                if (err) {
                    return reject(err);
                }
                if (message.statusCode !== 200) {
                    return reject(Error(responseBody.message));
                }
                else {
                    resolve(responseBody);
                }
            });
        });
    },
    /**
     * Sends an HTTP POST. 
     * @param {String} auth: The value of the Authorization header.
     * @param {String} url: The URL.
     * @param {String} data: The body of the request.
     * @param {Object} headers: Optional, additional headers.
     */
    post: function (/**The value of the Authorization header. */auth,
    /**The URL. */url,
    /**The body of the request. */ data,
    /**Optional, additional headers. */ headers) {
        var headersRequest = headers || {};
        headersRequest.Authorization = auth;

        return new Promise(function (resolve, reject) {
            defaultRequest.post(url, {
                body: data,
                headers: headersRequest
            }, function (err, message, responseBody) {
                if (err) {
                    return reject(err);
                }
                if (message.statusCode !== 200) {
                    return reject(Error(responseBody));
                }
                else {
                    resolve(responseBody);
                }
            });
        });
    }
};