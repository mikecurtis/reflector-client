'use strict';

if (process.argv.length != 5) {
	console.log('Usage: ' + process.argv[0] +
		    ' reflector_addr itach_addr codes_file')
	process.exit()
}
const REFLECTOR_ADDR = process.argv[2]
const ITACH_ADDR = process.argv[3]
const CODES_FILE = process.argv[4]
const RETRY_INTERVAL = 1000;

const logger = require('./logger.js');

const sanitizer = require('sanitizer');

const codes = require('./codes.js');
const CODES = new codes(CODES_FILE);

const itach = require('./itachclient.js');
const ITACH = new itach(ITACH_ADDR);

const ws = require('ws');

class RefreshingSocket {
	/**
	 * Loosely bound socket; replaces itself when closed.
	 *
	 * @param {String} address A WebSocket URI.
	 * @param {Number} retryInterval Time between pings and retries.
	 * @param {Function} onmessage Function to play upon message.
	 */
	constructor(address, retryInterval, onMessage) {
		this.instance = null;
		this.address = address;
		this.retryInterval = retryInterval;
		this.onMessage = onMessage;
		this.refresh();
		// Ping channel to keep alive.
		// Required to prevent Heroku Free from sleeping dyno.
		setInterval(function () {
			this.instance.ping('0');
		}.bind(this), retryInterval);
	}

	refresh() {

		logger.debug('Establishing new WebSocket: ' + this.address);
		var newInstance = new ws(this.address);

		newInstance.onopen = function () {
			logger.debug('WebSocket connected: ' + this.address);
		}.bind(this);

		newInstance.onclose = function () {
       			logger.debug('WebSocket disconnected: ' + this.address);
			// Replace with new WebSocket after a delay.
			// Ideally, we would just refresh the existing
			// WebSocket, but this appears to not work when Heroku
			// sleeps a dyno.
			setTimeout(this.refresh.bind(this), this.retryInterval);
		}.bind(this);

		newInstance.onmessage = this.onMessage;

		var oldInstance = this.instance;
		delete this.instance;
		this.instance = newInstance;

		if (oldInstance !== null) {
			oldInstance.close();
			setTimeout(() => {
				oldInstance.terminate();
			}, 1000);
		}

	}
}

const rs = new RefreshingSocket(REFLECTOR_ADDR, RETRY_INTERVAL, function (e) {
	var data = sanitizer.sanitize(e.data);
	var command = CODES.code(data);
	if (command === undefined) {
		logger.debug('Undefined command: ' + data);
		return;
	} else {
		logger.debug('Received command from WebSocket: ' + data + ' => ' + command);
	}
	for (var i = 0; i < command.length; i++) {
		ITACH.send(command[i], function(result) {
				logger.debug('Success: ' + command + ' => ' + result.data);
			}
		);
	}
});
