var ee2 = require('eventemitter2').EventEmitter2;
var net = require('net');
var util = require('util');
var types = require('./connectionType.js');

var kestrel = function( options ){

    this._settings = {
	servers: ['127.0.0.1:22133'],
	connectionType: types.ROUND_ROBIN
    }
    this._currentConnection = 0;
    this._connections = [];

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

//open connections to kestrel server(s)
kestrel.prototype.connect = function(){
    var type = this._settings.connectionType;

    if( types[type] == undefined || types[type] == null ){
	throw "Kestrel Client Connection: Argument 1 Must Be A Valid Kestrel Connection Type";
    }

    switch( type ){
    case types.RANDOM:
    case types.ROUND_ROBIN:
	for(var i in this._settings.servers){
	    var parts = this._settings.servers[i].split(':');
	    var port = (parts.length>1)?parts[1]:'22133';
	    var host = parts[0];
	    this._connections.push( _createConnection(port,host,this) );
	}
	break;
    case types.FAILOVER:
	var rand = Math.floor( Math.random()*this._settings.servers.length );
	var parts = this._settings.servers[rand].split(':');
	var port = (parts.length>1)?parts[1]:'22133';
	var host = parts[0];
	this._connections.push( _createConnection(port,host,this) );
	break;
    default:
	throw "Kestrel Client Connection: Unknown Connection Type";
	break;
    }

}

function _createConnection(port, host, self){
    var connection = net.connect(port,host);
    connection.on('data', function(data){
	_handleData(data,self);
	self.emit('data', data);
    });

    return connection;
}

function _handleData(data, self){
    data = data.toString();

    if( data.match('STORED\r\n') != null ){
	self.emit('stored', true);
    }
    
    if( data.match(/^VALUE/) != null ){
	_handleGet(data,self);
    }
    
    if( data.match(/^STAT/) != null ){
	_handleStats(data,self);
    }
    
    if( data.match(/^queue/) != null ){
	_handleDumpStats(data, self);
    }
    
    if( data == 'DELETED\r\n' ){
	self.emit('deleted', true);
    }

    if( data.match(/^VERSION/) != null ){
	self.emit('version', data.split(' ')[1].replace('\r\n',''));
    }

    if( data == 'Reloaded config.\r\n' ){
	self.emit('reloaded', true);
    }


    if( data == 'END\r\n' ){
	self.emit('empty', null);
    }
    
}

function _handleGet(data, self){
    var msg = {};
    
    var parts = data.split('\r\n');
    msg.queue = parts[0].match(/([a-zA-Z_]+)/mg)[1];
    msg.data = parts[1].replace('\r\n','');
    
    self.emit('message', msg);
}

function _handleStats(data, self){
    var stats = {};

    var parts = data.match(/STAT ([a-zA-Z_]+) (.*?)\r\n/g);

    for( var i in parts ){
	var part = parts[i].split(' ');
	stats[part[1]] = part[2].replace('\r\n', '');
    }


    self.emit('stats', stats);
}

function _handleDumpStats(data, self){
    var stats = {};

    var parts = data.replace('\r\n}\r\nEND','').split('}\r\n');

    for( var i in parts ){
	var part = parts[i].split('\r\n');
	var queue = part[0].match(/[a-zA-Z_]+/g)[1];
	stats[queue] = {};
	for( var lcv = 1; lcv < part.length-1; ++lcv ){
	    var p = part[lcv].split('=');
	    stats[queue][ p[0].replace(/ /g,'') ] = p[1];
	}
    }

    self.emit('dump_stats', stats);
}


kestrel.prototype._getConnection = function(){
    if( this._connections.length == 1 ){
	return this._connections[0];
    }else if( this._connections.length == 0 ){
	return null;
    }

    var connection = null;

    switch(this._settings.connectionType){
    case types.RANDOM:
	var rand = Math.floor( Math.random()*this._connections.length );
	connection =  this._connections[rand];
	break;
    case types.ROUND_ROBIN:
	this._currentConnection += 1;
	if( this._currentConnection > this._connections.length ){
	    this._currentConnection = 0;
	}
	connection = this._connections[this._currentConnection];
	break;
    case types.FAILOVER:
	connection = this._connections[0];
	break;
    }

    return connection;
}

kestrel.prototype.close = function(){
    //close any open connections
    for( var i in this._connections ){
	this._connections[i].destroy();
    }
}


kestrel.prototype.set = function( queue, value, lifetime ){
    if( lifetime == undefined || lifetime == null ){
	lifetime = 0;
    }

    var command = "SET " + queue + " 0 " + lifetime + " ";
    command += value.length + "\r\n" + value + "\r\n";

    var connection = this._getConnection();
    if( connection != null ){
	connection.write(command);
    }

    return this;
}

kestrel.prototype.get = function(queue, timeout){
    var command = "GET " + queue;
    
    timeout = parseInt(timeout);
    if( timeout > 0 ){
	command += "/t="+timeout;
    }
    
    var connection = this._getConnection();
    if( connection != null ){
	connection.write(command + '\r\n');
    }

    return this;
}

kestrel.prototype.delete = function(queue){
    //delete given queue
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('DELETE ' + queue + '\r\n');
    }

    return this;
}

kestrel.prototype.flush = function(queue){
    //flush given queue
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('FLUSH ' + queue + '\r\n');
    }
    
    return this;
}

kestrel.prototype.flushAll = function(){
    //flush all queues
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('FLUSH_ALL\r\n');
    }

    return this;
}

kestrel.prototype.version = function(){
    //get version of server
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('VERSION\r\n');
    }    

    return this;
}

kestrel.prototype.shutdown = function(){
    //shutdown server
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('SHUTDOWN\r\n');
    }    

    return this;
}

kestrel.prototype.reload = function(){
    //reload the server
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('RELOAD\r\n');
    }    

    return this;
}

kestrel.prototype.stats = function( callback ){
    //get server stats
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('STATS\r\n');
    }

    return this;
}

kestrel.prototype.dumpStats = function(){
    //dump server stats
    var connection = this._getConnection();
    if( connection != null ){
	connection.write('DUMP_STATS\r\n');
    }    

    return this;
}

kestrel.prototype.monitor = function(queue, seconds, maxItems){
    //monitor the given queue
}

kestrel.prototype.confirm = function(queue, count){
    //confirm received items
}

module.exports = kestrel;