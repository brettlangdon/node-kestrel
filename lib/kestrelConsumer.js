'use strict';

var KestrelClient = require('./kestrelClient.js');
var ee2 = require('eventemitter2').EventEmitter2;
var util = require('util');


var consumer = function( queue, options ){
  this._queue = queue;
  this._options = options;
  
  this._callback = null;
  this._consume = false;
  this._timeout = 3000;

  this._client = connectToClient(this);

  ee2.call(this);
};
util.inherits(consumer,ee2);

function connectToClient(self){

  var client = new KestrelClient(self._options);
  client.connect();

  client.on('message', function(message){
    if(self._consume){

      if(self._consume.reliable){
        self._callback(message, function(err){
          if(err){
            var consumeOptions = self._consume;
            var consumeCallback = self._callback;

            self.stopConsuming(function(){
              self.consume(consumeOptions,consumeCallback);
            });
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

  client.on('empty', function(){
    self.get(self._timeout);
  });

  return client;
}

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
    this._client = connectToClient(this);
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

consumer.prototype.stopConsuming = function(cb){
  if(this._consume){
    this._consume = false;
    this._client.close();
    this._client = null;
    this.emit('stop');    
  }

  if(cb){
    cb();
  }
};

module.exports = consumer;
