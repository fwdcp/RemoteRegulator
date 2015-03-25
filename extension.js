var underscore = require('underscore');

module.exports = function(nodecg) {
    nodecg.declareSyncedVar({
        name: 'clients',
        initialValue: []
    });

    var autocompleteRequests = [];

    var clients = {};
    var dashboards = {};

    function getClientSocketIDFromSteam(steam) {
        return underscore.findKey(clients, function(client) {
            return client.steam == steam;
        })
    }

    function updateClients() {
        underscore.each(clients, function(client, socketID) {
            if (client) {
                if (!client.following) {
                    clients[socketID].following = "0";
                }

                clients[socketID].authorized = (!nodecg.bundleConfig.authorizedClients && client.steam) || underscore.contains(nodecg.bundleConfig.authorizedClients, client.steam);
            }
        });

        nodecg.variables.clients = underscore.where(clients, {authorized: true});
    }

    var io = nodecg.getSocketIOServer().of('/RemoteRegulator');

    io.on('connection', function(socket) {
        socket.on('clientUpdate', function(data) {
            if (!clients[socket.id]) {
                clients[socket.id] = {};
            }

            underscore.extend(clients[socket.id], data);

            updateClients();
        });
    });
}
