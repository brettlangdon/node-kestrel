var ee2 = require('eventemitter2').EventEmitter2;
var client = require('./kestrelClient.js');
var util = require('util');

var producer = function( queue, options ){
    this._queue = queue;
    this._client = new client(options);
    this._client.connect();

    var self = this;
    this._client.on('stored', function(stored){
	self.emit('stored', stored);
    });

    ee2.call(this);
}
util.inherits(producer,ee2);



producer.prototype.send = function(message, lifetime, callback){
    if( typeof(lifetime) === "function" ){
    callback = lifetime;
    lifetime = null;
    }
    if( lifetime == null || lifetime == undefined ){
	lifetime = 0;
    }
    lifetime = parseInt(lifetime);

    this._client.set(this._queue, message, lifetime, callback);
}

producer.prototype.close = function(){
    this._client.close();
}


module.exports = producer;
