'use strict';

if (process.argv.length != 5) {
	console.log('Usage: ' + process.argv[0] +
		    ' reflector_addr itach_addr codes_file')
	process.exit()
}
const REFLECTOR_ADDR = process.argv[2]
const ITACH_ADDR = process.argv[3]
const CODES_FILE = process.argv[4]

const logger = require('./logger.js');

const codes = require('./codes.js');
const CODES = new codes(CODES_FILE);

const itach = require('./itachclient.js');
const ITACH = new itach(ITACH_ADDR);

const ws = require('ws');
const WS = new ws(REFLECTOR_ADDR)

WS.onopen = function () {
	logger.debug('WebSocket connected: ' + WS.url);
	WS.on('close', () => logger.debug('WebSocket disconnected: ' + WS.url));
};

WS.onmessage = function (event) {
	var c = CODES.code(event.data);
	if (c == undefined) {
		console.log('Undefined command: ' + event.data);
		return;
	}
	for (var i = 0; i < c.length; i++) {
		ITACH.send(c[i], function(result) {
				logger.debug(result);
			}
		);
	}
};
