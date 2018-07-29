'use strict';

const EventEmitter = require('events');

const logger = require('./logger');
const net = require('net');
const async = require('async');

const ERRORCODES = {
	'001': 'Invalid command. Command not found.',
	'002': 'Invalid module address (does not exist).',
	'003': 'Invalid connector address (does not exist).',
	'004': 'Invalid ID value.',
	'005': 'Invalid frequency value.',
	'006': 'Invalid repeat value.',
	'007': 'Invalid offset value.',
	'008': 'Invalid pulse count.',
	'009': 'Invalid pulse data.',
	'010': 'Uneven amount of <on|off> statements.',
	'011': 'No carriage return found.',
	'012': 'Repeat count exceeded.',
	'013': 'IR command sent to input connector.',
	'014': 'Blaster command sent to non-blaster connector.',
	'015': 'No carriage return before buffer full.',
	'016': 'No carriage return.',
	'017': 'Bad command syntax.',
	'018': 'Sensor command sent to non-input connector.',
	'019': 'Repeated IR transmission failure.',
	'020': 'Above designated IR <on|off> pair limit.',
	'021': 'Symbol odd boundary.',
	'022': 'Undefined symbol.',
	'023': 'Unknown option.',
	'024': 'Invalid baud rate setting.',
	'025': 'Invalid flow control setting.',
	'026': 'Invalid parity setting.',
	'027': 'Settings are locked'
};

class ITachClient extends EventEmitter {
	/**
	 * Create an ITach client.
	 *
	 * @param {String} address - a host:port pair
	 */
	constructor (address) {
		super();
		var parts = address.split(':');
		if ( parts.length != 2) {
			throw new Error('Invalid address: ' + address);
		}
		this.host = parts[0];
		this.port = parts[1];
		this.reconnect = true;
		this.reconnect_sleep = 5;
		this.is_connected = false;
		this.connection = null;
		this.requests = {};
		this.request_id = 0;

		var client = this;
		this.send_queue = async.queue(function (data, callback) {
			var result = false;
			if (client.is_connected) {
				client.emit('debug', 'Data sent to itach: ' + data);
				client.connection.write(data + '\r\n');
				result = true;
			} else {
				client.emit('error', 'Not connected to itach - Can not send data.');
				client.emit('debug', data);
			}
			if (typeof callback === 'function') {
				callback({
					'result': result,
					'msg': ''
				});
			}
		}, 1);

		this.on('debug', logger.debug);
		this.on('error', logger.error);

		this.connect();
	}

	connect() {
		var client = this;

		if (this.is_connected) {
			console.log('Already connected.');
			return
		}

		this.emit('debug', 'Connecting to itach: ' + this.host + ':' + this.port);

		if (this.connection === null) {
			this.connection = net.connect(this.port, this.host);
		} else {
			this.connection.connect(this.port, this.host);
		}

		this.connection.on('connect', function() {
			client.is_connected = true;
			client.emit('debug', 'Connected to itach: ' + client.host + ':' + client.port);
			client.emit('connect');
		});

		this.connection.on('close', function() {
			client.is_connected = false;
			client.emit('debug', 'Disconnected from itach: ' + client.host + ':' + client.port);
			client.emit('close', false);
			if (client.reconnect) {
				setTimeout(client.connect, client.reconnect_sleep + 1000);
			}
		});

		this.connection.on('data', function(data) {
			data = data.toString().replace(/[\n\r]$/, '');
			client.emit('debug', 'Received data from itach: ' + data);
			var parts = data.split(',');
			var id = parts[2];
			if (client.requests[id] === undefined) {
				client.emit('error', 'itach request id ' + id + ' does not exist.');
				return;
			}

			// result is true only when completeir received.
			var result = (parts[0] === 'completeir');

			if (parts[0].match(/^ERR/)) {
				client.emit('error', 'itach error: ' + parts[1] + ': ' + ERRORCODES[parts[1]]);
			}

			if (typeof client.requests[id].callback === 'function') {
				client.requests[id].callback({
					'result': result,
					'data': data
				});
			}
			delete client.requests[id];
		});

		this.connection.on('debug', logger.debug);
		this.connection.on('error', logger.error);

	}

	close() {
		if (! this.is_connected) {
			console.log('Not connected.');
			return;
		}
		this.connection.destroy();
		this.is_connected = false;
	}

	send(data, callback) {
		var id, parts, options;

		this.request_id += 1;
		var id = this.request_id;

		parts = data.split(',');
		parts[2] = id; // Add ID to keep track of return message
		data = parts.join(',');

		var client = this;
		this.send_queue.push(data, function (res) {
			if (res.result) {
				client.requests[id] = {
					'id': id,
					'data': data,
					'callback': callback
				};
			} else {
				callback({
					'result': false,
					'msg': res.msg
				});
			}
		});
	}

}

module.exports = ITachClient;
