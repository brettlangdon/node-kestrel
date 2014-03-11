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
    if(self._consume){

      if(self._consume.reliable){
        self._callback(message, function(err){
          if(err){
            self.stopConsuming();
          } else {
            self._consumeNextMessage();
          }
        });
      } else {
        self._callback(message);
        self._consumeNextMessage();
      }
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

consumer.prototype.getNextOpen = function( timeout ){
  this._client.getNextOpen(this._queue, timeout);
};

consumer.prototype.consume = function( options, callback ){
  
  if(typeof(options) == 'function'){
    callback = options;
    options = {
      reliable: false
    };
  }

  if(!options){
    throw new Error('options must be an object or left out');
  }

  if(!callback){
    throw new Error('callback to consume messages required');
  }

  if(!this._client){
    this._client = client(this._options);
    this.client.connect();
  }

  this._callback = callback;
  this._consume = options;

  this._consumeNextMessage();
};

consumer.prototype._consumeNextMessage = function(){
  if(this._consume.reliable){
    this.getNextOpen(this._timeout);
  } else {
    this.get(this._timeout);
  }
};

consumer.prototype.stopConsuming = function(){
  this._consume = false;
  this._client.close();
  this._client = null;
  this.emit('stop');
};

module.exports = consumer;
