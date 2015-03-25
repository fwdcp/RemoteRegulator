var expose = {
    consoles: []
};

nodecg.declareSyncedVar({
    name: 'clients',
    initialValue: [],
    setter: function(data) {

    }
});

rivets.formatters.prepend = function(value, prepend) {
    return prepend + value;
};

rivets.bind($('.RemoteRegulator'), {data: expose});
