'use strict';

var ee2 = require('eventemitter2').EventEmitter2;
var net = require('net');
var util = require('util');
var types = require('./connectionType.js');

var kestrel = function( options ){

  this._settings = {
    servers: ['127.0.0.1:22133'],
    connectionType: types.ROUND_ROBIN,
    reconnect: false,
    reconnectDelay: 200
  };
  this._currentConnection = 0;
  this._connections = [];
  this._openConnection = null;

  if( options instanceof Object ){
    for( var key in options ){
      if( this._settings[key] !== undefined ){
        this._settings[key] = options[key];
      }
    }
  }

  this._pendingSetCallback = null;

  ee2.call(this);
};

util.inherits(kestrel,ee2);

//open connections to kestrel server(s)
kestrel.prototype.connect = function(){
  var type = this._settings.connectionType;

  if( types[type] === undefined || types[type] === null ){
    throw 'Kestrel Client Connection: Argument 1 Must Be A Valid Kestrel Connection Type';
  }

  var parts,port,host;

  switch( type ){
    case types.RANDOM:
    case types.ROUND_ROBIN:
      for(var i in this._settings.servers){
          parts = this._settings.servers[i].split(':');
          port = (parts.length>1)?parts[1]:'22133';
          host = parts[0];
          this._connections.push( _createConnection(port,host,this) );
      }
      break;
    case types.FAILOVER:
      var rand = Math.floor( Math.random()*this._settings.servers.length );
      parts = this._settings.servers[rand].split(':');
      port = (parts.length>1)?parts[1]:'22133';
      host = parts[0];
      this._connections.push( _createConnection(port,host,this) );
      break;
    default:
      throw 'Kestrel Client Connection: Unknown Connection Type';
  }
};

function _createConnection(port, host, self){
  var connection = net.connect(port,host);

  connection.on('error', function(err){
    self._openConnection = null;
    self.emit('error', err);
    if(self._settings.reconnect){      
      setTimeout(function(){
        self.connect();
      },self._settings.reconnectDelay);
    }
  });

  connection.on('data', function(data){
    _handleData(data,self);
    self.emit('data', data);
  });

  return connection;
}

function _handleData(data, self){
  data = data.toString();

  if( data.match('STORED\r\n') ){
    self.emit('stored', true);
    if(self._pendingSetCallback){
      var callback = self._pendingSetCallback;
      self._pendingSetCallback = null;
      callback(null);
    }
  }
  
  if( data.match(/^VALUE/) ){
    _handleGet(data,self);
  }
  
  if( data.match(/^STAT/) ){
    _handleStats(data,self);
  }
  
  if( data.match(/^queue/) ){
    _handleDumpStats(data, self);
  }
  
  if( data == 'DELETED\r\n' ){
    self.emit('deleted', true);
  }

  if( data.match(/^VERSION/) ){
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
  if( this._connections.length == 1 ) {
    return this._connections[0];
  } else if( this._connections.length === 0 ) {
    return null;
  }

  var connection = null;

  switch(this._settings.connectionType) {
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
};

kestrel.prototype.close = function(){
  //close any open connections
  for( var i in this._connections ){
    this._connections[i].destroy();
  }
};

kestrel.prototype.set = function( queue, value, lifetime, callback){
  if( typeof(lifetime) === 'function' ){
    callback = lifetime;
    lifetime = null;
  }
  if( lifetime === undefined || lifetime === null ){
    lifetime = 0;
  }

  if(this._pendingSetCallback && callback){
    return callback('Cannot write again. Still waiting for previous write to be stored');
  }

  var command = 'SET ' + queue + ' 0 ' + lifetime + ' ';
  command += Buffer.byteLength(value, 'utf8') + '\r\n';

  var connection = this._getConnection();
  if( connection ){
    if(callback){
      this._pendingSetCallback = callback;
    }
    connection.write(command);
    connection.write(value);
    connection.write('\r\n');
  } else {
    if(callback){
      callback('No connection');
    } else {
      throw new Error('No connection');
    }
  }

  return this;
};

kestrel.prototype.get = function(queue, timeout){
  var command = 'GET ' + queue;

  timeout = parseInt(timeout,10);
  if( timeout > 0 ){
    command += '/t='+timeout;
  }
  
  var connection = this._getConnection();
  if( connection ){
    connection.write(command + '\r\n');
  }

  return this;
};


kestrel.prototype.getNextOpen = function(queue, timeout){
  var command = 'GET ' + queue;

  timeout = parseInt(timeout,10);
  if( timeout > 0 ){
    command += '/t='+timeout;
  }
  
  var connection = this._openConnection;

  if(connection) {
    command += '/close';
  } else {
    connection = this._getConnection();
    this._openConnection = connection;
  }

  command += '/open';

  if( connection ){
    connection.write(command + '\r\n');
  }

  return this;
};



kestrel.prototype.delete = function(queue){
  //delete given queue
  var connection = this._getConnection();
  if( connection ){
    connection.write('DELETE ' + queue + '\r\n');
  }

  return this;
};

kestrel.prototype.flush = function(queue){
  //flush given queue
  var connection = this._getConnection();
  if( connection ){
    connection.write('FLUSH ' + queue + '\r\n');
  }
  
  return this;
};

kestrel.prototype.flushAll = function(){
  //flush all queues
  var connection = this._getConnection();
  if( connection ){
    connection.write('FLUSH_ALL\r\n');
  }

  return this;
};

kestrel.prototype.version = function(){
  //get version of server
  var connection = this._getConnection();
  if( connection ){
    connection.write('VERSION\r\n');
  }

  return this;
};

kestrel.prototype.shutdown = function(){
  //shutdown server
  var connection = this._getConnection();
  if( connection ){
    connection.write('SHUTDOWN\r\n');
  }

  return this;
};

kestrel.prototype.reload = function(){
  //reload the server
  var connection = this._getConnection();
  if( connection ){
    connection.write('RELOAD\r\n');
  }

  return this;
};

kestrel.prototype.stats = function(){
  //get server stats
  var connection = this._getConnection();
  if( connection ){
    connection.write('STATS\r\n');
  }

  return this;
};

kestrel.prototype.dumpStats = function(){
  //dump server stats
  var connection = this._getConnection();
  if( connection ){
    connection.write('DUMP_STATS\r\n');
  }

  return this;
};


kestrel.prototype.monitor = function(queue, seconds, maxItems){
    //monitor the given queue
};

kestrel.prototype.confirm = function(queue, count){
    //confirm received items
};

module.exports = kestrel;