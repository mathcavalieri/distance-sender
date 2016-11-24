# distance-sender
Sample node.js server to serve as an interface with Arduino.

## Environment Variables
There are a number of environment variables that must be provided, otherwise the app won't run as expected. Namely:

- API_KEY: The server key used as authorization for the GCM/FCM services (more on that [here](https://firebase.google.com/docs/cloud-messaging/server)). Example: *key=AIzaSyZ-1u...0GBYzPu7Udno5aA*.
- PASSWORD: The password used as authorization for this app's services. The same password must be used on the mobile app. Example: *password*.
- ARDUINO_SERIAL_PORT: The name of the serial port to connect to Arduino. Example: *COM4* or */dev/tty-usbserial1*.

You can do that with this command:

```bash
$ set PASSWORD=pass
```

## MongoDB Startup
Run the following command:

```bash
$ mongod
```

## Project Startup
After providing the above environment variables and starting up the MongoDB server, run the following commands on another instance of the command line, on the root of this project:

```bash
$ npm install && npm start
```

This assumes you've installed [Node.js](https://nodejs.org/en/download/) and [MongoDB](https://www.mongodb.com/download-center) and added their bin directories to your PATH environment variable.
