var ee2 = require('eventemitter2').EventEmitter2;
var net = require('net');
var util = require('util');

var kestrel = function( options ){
    this._settings = {
	//port: 22133,
	//host: '127.0.0.1'
    }

    if( options instanceof Object ){
	for( var key in options ){
	    if( this._settings[key] != undefined ){
		this._settings[key] = options[key];
	    }
	}
    }

    ee2.call(this);
}
util.inherits(kestrel,ee2);

kestrel.prototype.connect = function(){
    //open connections to kestrel server(s)
}

kestrel.prototype.close = function(){
    //close any open connections
}


kestrel.prototype.set = function( queue, value, lifetime ){
    if( lifetime == undefined || lieftime == null ){
	lifetime = 0;
    }

    var command = "SET " + queue + " 0 " + lifetime + " ";
    command += value.length + "\r\n" + value + "\r\n";


    //send SET command
}

kestrel.prototype.get = function(queue, timeout){
    var command = "GET " + queue;
    
    timeout = parseInt(timeout);
    if( timeout > 0 ){
	command += "/t="+timeout;
    }
	
    //send GET command
}

kestrel.prototype.delete = function(queue){
    //delete given queue
}

kestrel.prototype.flush = function(queue){
    //flush given queue
}

kestrel.prototype.flushAll = function(){
    //flush all queues
}

kestrel.prototype.version = function(){
    //get version of server
}

kestrel.prototype.shutdown = function(){
    //shutdown server
}

kestrel.prototype.reload = function(){
    //reload the server
}

kestrel.prototype.stats = function(){
    //get server stats
}

kestrel.prototype.dumpStats = function(){
    //dump server stats
}

kestrel.prototype.monitor = function(queue, seconds, maxItems){
    //monitor the given queue
}

kestrel.prototype.confirm = function(queue, count){
    //confirm received items
}

module.exports = kestrel;