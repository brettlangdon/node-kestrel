'use strict';

var client = require('./kestrelClient.js');
var ee2 = require('eventemitter2').EventEmitter2;
var util = require('util');


var consumer = function( queue, options ){
  this._queue = queue;
  this._options = new client(options);
  this._client = new client(options);
  this._client.connect();

  this._callback = null;
  this._consume = false;
  this._timeout = 3000;

  var self = this;

  this._client.on('message', function(message){
    if( typeof self._callback == 'function' ){
      self._callback(message);
    }

    if( self._consume ){
      self.get(self._timeout);
    }

    self.emit('message', message);
  });

  this._client.on('empty', function(){
    self.get(self._timeout);
  });

  ee2.call(this);
};
util.inherits(consumer,ee2);

consumer.prototype.get = function( timeout ){
    this._client.get(this._queue, timeout);
};

consumer.prototype.consume = function( callback ){
  if(!this._client){
    this._client = client(this._options);
    this.client.connect();
  }
  if( typeof(callback) == 'function' ){
    this._callback = callback;
  }
  this._consume = true;
  this.get(this._timeout);
};

consumer.prototype.stopConsuming = function(){
  this._consume = false;
  this._client.close();
  this._client = null;
};

module.exports = consumer;
