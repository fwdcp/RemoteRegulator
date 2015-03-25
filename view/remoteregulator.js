var externalExtensions;
var remoteRegulator = io('//' + nodecg.config.baseURL + '/RemoteRegulator');
var connectLoop;

var autocompleteRequests = [];

remoteRegulator.on('runCommand', function(data) {
    runCommand(data.command);
});

remoteRegulator.on('getAutocomplete', function(data) {
    requestAutocomplete(data.query).then(function(results) {
        remoteRegulator.emit('autocompleteResult', {
            query: data.query,
            results: results
        });
    }, console.log);
});

function runCommand(command) {
    if (externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'command', 'command': command}));
    }
}

function requestAutocomplete(query) {
    var deferred = Q.defer();

    autocompleteRequests.push({
        query: query,
        deferred: deferred
    });

    if (externalExtensions && externalExtensions.readyState == 1) {
        externalExtensions.send(JSON.stringify({'type': 'autocomplete', 'partial': query}));
    }
    else {
        deferred.reject(new Error('connection to ExternalExtensions is not available'));
    }

    return deferred.promise;
}

function processAutocompleteResult(message) {
    autocompleteRequests = _.reject(autocompleteRequests, function(request) {
        if (request.query == message.partial) {
            request.deferred.resolve(message.results);

            return true;
        }

        return false;
    });
}

function processMessage(event) {
    var data = JSON.parse(event.data);

    if (data.type == 'gameinfo') {
        if (remoteRegulator) {
            remoteRegulator.emit('clientUpdate', {
                steam: data.client.steam,
                name: data.client.name
            });
        }
    }
    else if (data.type == 'consoleprint') {
        if (remoteRegulator) {
            remoteRegulator.emit('consolePrint', data);
        }

        if (data.message.type == 'color') {
            $('#out').append('<span style="color: rgba(' + data.message.color.r + ',' + data.message.color.g + ',' + data.message.color.b + ',' + data.message.color.a + ')">' + he.encode(data.message.text) + '</span>')
        }
        else {
            $('#out').append(he.encode(data.message.text));
        }

        if (!window.getSelection().rangeCount || window.getSelection().getRangeAt(0).commonAncestorContainer != $('#out')[0]) {
            $('#out').scrollTop($('#out').prop('scrollHeight'));
        }
    }
    else if (data.type == 'autocompleteresults') {
        processAutocompleteResult(data);
    }
}

function connect() {
    if (externalExtensions) {
        if (externalExtensions.readyState != 3) {
            if (externalExtensions.readyState == 1) {
                if (connectLoop) {
                    clearInterval(connectLoop);
                    connectLoop = null;
                }
            }

            return;
        }
    }

    externalExtensions = new WebSocket('ws://' + (url('?host') || 'localhost') + ':' + (url('?post') || 2006));

    externalExtensions.onopen = function() {
        if (connectLoop) {
            clearInterval(connectLoop);
            connectLoop = null;
        }

        externalExtensions.send(JSON.stringify({'type': 'gameinforequest'}));

        $('#in').attr('disabled', false);
        $('#submit').attr('disabled', false);
    };

    externalExtensions.onclose = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }

        remoteRegulator.emit('clientUpdate', {
            steam: null,
            name: null
        });

        $('#in').attr('disabled', true);
        $('#submit').attr('disabled', true);
    };

    externalExtensions.onerror = function() {
        if (!connectLoop) {
            connectLoop = setInterval(connect, 1000);
        }

        $('#in').attr('disabled', true);
        $('#submit').attr('disabled', true);

        remoteRegulator.emit('clientUpdate', {
            steam: null,
            name: null
        });
    };

    externalExtensions.onmessage = processMessage;
}

connectLoop = setInterval(connect, 1000);

$(document).ready(function() {
    $('#in').typeahead({}, {
        name: 'autocomplete',
        source: getAutocomplete,
        displayKey: function(value) { return value; }
    });

    $('#in').attr('disabled', true);
    $('#submit').attr('disabled', true);

    $('#in').on('keypress', function(e) {
        if (e.keyCode == 13) {
            e.preventDefault();

            runCommand($('#in').val());

            $('#in').val('');
            $('#in').typeahead('close');
        }
    });

    $('#submit').click(function() {
        runCommand($('#in').val());

        $('#in').val('');
        $('#in').typeahead('close');
    });

    function getAutocomplete(query, cb) {
        requestAutocomplete(query).then(cb, console.log);
    }
});
