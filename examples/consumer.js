'use strict';

var kestrel = require('..');

var consumer = new kestrel.kestrelConsumer( 'test', {
  connectionType: kestrel.connectionType.ROUND_ROBIN,
  servers: ['127.0.0.1:22133']
});

var counter = 0;

function consumed(message,cb){
  console.log('Consumed Message:');
  console.dir(message);

  if(counter++>1){
    //produce failure;
    return process.exit(1);
  }

  if(cb){
    cb();
  }
}

consumer.consume( {reliable:true}, consumed );
//unreliable still possible as before: consumer.consume( consumed );

setTimeout( function(){
  consumer.stopConsuming();
}, 6000);