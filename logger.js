var self = {};
module.exports = self;

self.debug = function(msg) {
    var date = new Date();
    console.log('[' + date.getFullYear() + '/' + date.getMonth() + '/' +
                 date.getDate() + '-' + date.getHours() + ':' +
                 date.getMinutes() + ':' + date.getSeconds() + '] ' + msg);
}

self.error = function(msg) {
    self.debug(msg);
}
