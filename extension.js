module.exports = function(nodecg) {
    var io = nodecg.getSocketIOServer().of('/RemoteRegulator');

    io.on('connection', function(socket) {
    });
}
