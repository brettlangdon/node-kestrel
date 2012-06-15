module.exports = {
    ROUND_ROBIN: 'ROUND_ROBIN', //use all connections in order
    RANDOM: 'RANDOM', //use all connections in random order
    FAILOVER: 'FAILOVER' //use only one connection, unless there is a connection problem
}