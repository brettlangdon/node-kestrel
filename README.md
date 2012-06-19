Node-Kestrel
============

This module contains Kestrel client, producer and consumer classes.

This module is NOT a wrapper around a Memcached Client, this a wrapper around all of the available commands for Kestrel using the net library.

## Installation
`npm install node-kestrel`

Not to be mistaken with `npm install kestrel`, two different modules.

## Usage
Check out the `examples` folder

## Kestrel Client
The Kestrel Client class is a wrapper around all available Kestrel commands.

#### new kestrelClient( [options] )
Creates a new instance of kestrelClient.

`options` is an optional object containing any default settings that you wish to override.

* `connectionType`: kestrel.connectionType, default: `ROUND_ROBIN`
* `servers`: string array containing `host:port` definitions

#### connect()
Opens all server connections.

#### close()
Closes all server connections.

#### set(queue, value, lifetime)
Send sthe Kestrel `SET` command

`queue` is the string name of the queue you wish to append to.

`value` is the string message that you wish to append to `queue`.

`lifetime` is an interger value to represent the TTL of the message in seconds.

#### get(queue, timeout)
Tries to get a message from `queue`

`queue` is the string name of the queue you with to retrieve from.

`timeout` is an integer value to represent the time in milliseconds you wish to try and wait for an item from `queue`.

#### delete(queue)
Deletes the provided `queue`.

`queue` is the string representation of the queue you wsh to delete.

#### flush(queue)
Flushes the provided `queue`

`queue` is the string representation of the queue you wsh to flush.

#### flushAll()
Flushes all the `queues` in the server.

#### version()
Returns the version number of the server

#### shutdown()
Tries to shutdown the server.

#### reload()
Tells the server to reload its configs.

#### stats()
Get the stats for the server.

#### dumpStats()
Get the stats in a more readable fashion, they are organized by queue.

#### monitor(queue, seconds, maxItems)
**Currently NOT Implemented**

#### confirm(queue, count)
**Currently NOT Implemented**


## Kestrel Producer
This class is mearly a convenience class, it does not provide any extra functionality.

#### new kestrelProducer(queue, options)
Constructor to create a new instance of `kestrelProducer`.

`queue` is the string name of the queue you wish to work with. With a `kestrelProducer` you are locking yourself into a single queue (for now)

`options` this is the same as the options for `new kestrelClient`.

#### send(message, lifetime)
Appends a message onto the queue provided in the constructor

`message` string message to append to the queue

`lifetime` is the TTL for the message in seconds.

#### close()
Closes all server connections.


## Kestrel Consumer
This is purely a convenience class.

#### new kestrelConsumer(queue, options)
Creates a new instance of a kestrelConsumer

`queue` is the string name of the queue you wish to bind to.

`options` same as the options passed to `new kestrelClient`.

#### get(timeout)
Tries to get a new message from the bound to queue.

`timeout` the timeout in seconds, how long to wait until giving up on getting.

#### consume(callback)
Tell the consumer to continuous consume messages 1 by 1 and calling `callback` on each of them.

`callback` is a callback that you wish to have called on each and every message that is returned by `consume`

#### stopConsuming()
It tells the server to stop consuming.

You may receive 1 extra message after this is called.

#### close()
Closes all open server connections.



## TODO
* I need ot finish working on the `monitor` and `confirm` commands, then I will probably push version `0.0.1` to npm.
* After that I am going to work on setting up transactions for consumes. Block consumes and just improving any place where I might of messed up.
* I have not done too much testing or stress testing the module.
* If I get enough people who are using this and are interested in this module then I might even write it in C to try and get some better performance.