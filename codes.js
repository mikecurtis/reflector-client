/*jslint node:true*/
"use strict";

var self;
module.exports = self = {};

var fs = require('fs');

// TODO: codes.txt to come from env var
var data = fs.readFileSync(__dirname + '/codes.txt', "utf8");
var lines = data.split('\n');

for (var i = 0; i < lines.length; i++) {

	var name = undefined;

	var line = lines[i].trim();

	if (line.trim() == '' || line.trim().indexOf('#') == 0) {
		continue;
	}

	var parts = line.split(" ").filter(w => w.length > 0);

	if (parts.length == 0) {
		continue;
	} else if (parts.length == 1) {
		throw 'Unexpected line: ' + line;
	}

	if (parts[0].substr(0, 1) != '[' ||
	    parts[0].substr(parts[0].length-1, parts[0].length) != ']') {
		throw 'Could not parse name "' + parts[0] + '" from line "' + line + '"';
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
			if (self[alias] != undefined) {
				codes = codes.concat(self[alias]);
			} else {
				throw 'Unrecognized alias: ' + alias;
			}
		} else {
			codes.push(code);
		}
	}

	if (self[name] != undefined) {
		throw 'Duplicate entries for ' + name;
	}

	self[name] = codes;

}
