'use strict';

const ppath = require('path');

const fs = require('fs');

class Codes {
	/**
	 * Load and parse codes file.
	 *
	 * @param {String} path The path to the codes file.
	 */
	constructor(path) {

		this.path = path;
		this.codeMap = {};

		var rawData = fs.readFileSync(ppath.resolve(this.path), 'utf8');
		var lines = rawData.split('\n');

		for (var i = 0; i < lines.length; i++) {

			var name = undefined;

			var line = lines[i].trim();

			if (line.trim() == '' || line.trim().indexOf('#') == 0) {
				continue;
			}

			var parts = line.split(' ').filter(w => w.length > 0);

			if (parts.length == 0) {
				continue;
			} else if (parts.length == 1) {
				throw new Error('Unexpected line: ' + line);
			}

			if (parts[0].substr(0, 1) != '[' ||
			    parts[0].substr(parts[0].length-1, parts[0].length) != ']') {
				throw new Error('Could not parse name ' + parts[0] + ' from line ' + line);
			}
			name = parts[0].substr(1, parts[0].length-2);

			var codes = parts.slice(1);

			var base_codes = parts.slice(1);
			var codes = [];
			for (var j = 0; j < base_codes.length; j++) {
				var code = base_codes[j];
				if (code.substr(0, 1) == '[' &&
				    code.substr(code.length-1, code.length) == ']') {
					var alias = code.substr(1, code.length-2);
					if (this.codeMap[alias] != undefined) {
						codes = codes.concat(this.codeMap[alias]);
					} else {
						throw new Error('Unrecognized alias: ' + alias);
					}
				} else {
					codes.push(code);
				}
			}

			if (this.codeMap[name] != undefined) {
				throw new Error('Duplicate entries for ' + name);
			}

			this.codeMap[name] = codes;

		}
	}

	code (id) {
		return this.codeMap[id];
	}
}


module.exports = Codes;
