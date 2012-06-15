var kestrel = require('../');


//setup our client
var client = new kestrel.kestrelClient( {
    connectionType: kestrel.connectionType.RANDOM,
    servers: ['127.0.0.1:22133']
});

//make our connection(s)
client.connect();


//get the server version, same as running 'VERSION'
client.version().once('version', function(version){
    console.log('Version: ' + version);
});

//get the server stats, same as running 'STATS'
client.stats().once('stats', function(stats){
    console.dir(stats);
});


//input some data into the 'test' queue
client.set('test', 'some data');
console.log('Message Sent');

//do this for every message that we 'GET'
client.on('message', function(message){
    console.log('New Message:');
    console.dir(message);

    //make sure to get more if the queue has them
    client.get('test', 3000);
});


//get from the queue, wait up to 3 seconds for a response
client.get('test', 3000);


setTimeout(function(){
    //this will SHUTDOWN the server!
    //client.shutdown();
    
    //close all client connections to server(s)
    client.close();

}, 3000);