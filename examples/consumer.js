var kestrel = require('../');

var consumer = new kestrel.kestrelConsumer( 'test', {
    connectionType: kestrel.connectionType.ROUND_ROBIN,
    servers: ['127.0.0.1:22133']
});

function consumed(message){
    console.log('Consumed Message:');
    console.dir(message);
}

consumer.consume( consumed );

setTimeout( function(){
    consumer.stopConsuming();
}, 6000);