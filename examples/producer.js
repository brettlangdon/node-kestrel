'use strict';

var kestrel = require('../');


//create our producer
var producer = new kestrel.kestrelProducer( 'test', {
    connectionType: kestrel.connectionType.FAILOVER,
    servers: ['127.0.0.1:22133']
});


//capture all 'stored' events
producer.on('stored', function(stored){
    console.log('Stored: ' + stored);
});


//lets input some data
var interval = setInterval( function(){
  var message = (new Date().getTime()) + ' - New Message';

  producer.send( message , function(err){
    if(err){
      console.log('ERR',err);
    } else {
      console.log('STORED:' + message);
    }
  } );
}, 100);


//close connection
setTimeout( function(){
    clearInterval(interval);
    producer.close();
}, 6000);