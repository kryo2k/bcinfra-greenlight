var
util = require('util'),
dbstore = require(__dirname + "/../lib/dbstore"),
log = require(__dirname + '/../lib/log');

// returns default configuration for a device
function defaultDeviceConfig() {
    return {
        enabled: true
    };
}

// calculate the number of local properties in an object
function numberOfProperties(obj) {
    var cnt = 0;

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            cnt++;
        }
    }

    return cnt;
}

// registers a new device
exports.register = function(req, res){
    dbstore.registerNewDevice(function(deviceId){

        // configure this device with default configurations:
        dbstore.updateDeviceConfig(deviceId, defaultDeviceConfig(), function(){

            res.render('page', {
                jsModule: 'app/device/register',
                title: 'Device Register Page',
                text: util.format('Unique device id: %s', deviceId)
            });
        });
    });
};

// displays/updates a devices subscription
exports.subscription = function(req, res) {
    var
    title = 'Device Subscription',
    deviceId = req.param('id'),
    addProjectId = req.param('add'),
    removeProjectId = req.param('remove'),
    clearAll = req.param('clearAll') == 1,
    prettyPrint = (parseInt(req.param("prettyPrint"), 10) === 1),
    subcribeTo = [],
    unsubcribeFrom = [];

    log.debug('subscription device: %s', deviceId);

    // projects to add to subscription
    if(typeof addProjectId === 'string') {
        subcribeTo.push(addProjectId);
    }
    else if(addProjectId && addProjectId.length) {
        subcribeTo = subcribeTo.concat(addProjectId);
    }

    // projects to remove from subscription
    if(typeof removeProjectId === 'string') {
        unsubcribeFrom.push(removeProjectId);
    }
    else if(removeProjectId && removeProjectId.length) {
        unsubcribeFrom = unsubcribeFrom.concat(removeProjectId);
    }

    if(clearAll) {
        log.debug('clearing subscription first');
    }

    if(subcribeTo.length) {
        log.debug('subscription add project id(s): %s', subcribeTo.join(', '));
    }
    if(unsubcribeFrom.length) {
        log.debug('subscription remove project id(s): %s', unsubcribeFrom.join(', '));
    }

    dbstore.deviceSubscription(deviceId, subcribeTo, unsubcribeFrom, clearAll, function(err, subscription){
        if(err) {
            res.status(404).render('error', {
                title: title,
                error: err
            });
            return;
        }

        var
        msg = util.format("Device (%s) subscribed to %d project(s)", deviceId, subscription.length),
        isSubscriptionGreen = dbstore.isSubscriptionGreen(subscription);

        if(prettyPrint) { // show as a pretty hash table:

//            var formSetup = {
//                action: req.url + '?prettyPrint=1',
//                method:'GET',
//                items: [
//                    {label:'Subscribe to:', type:'list', items: [
//                        {id:"1", caption: "one"},
//                        {id:"2", caption: "two"},
//                        {id:"3", caption: "three"}
//                    ]}
//                ]
//            };
//            req.app.render("form",formSetup,function(err, html){
//            });

            res.render('page-table-grid', {
                jsModule: 'app/device/subscription',
                title: title,
                data: subscription,
            //  form: html,
                message: msg,
                footer: (isSubscriptionGreen ? "Subscription has <font class='good'>green</font> light" : "Subscription is <font class='bad'>failing</font>"),
                columns: {
                    id: {
                        caption: "ID",
                        colClass: "row-id"
                    },
                    name: {
                        caption: "Project Name"
                    },
                    lastStatus: {
                        caption: "Status",
                        align: "center",
                        renderer: function(key, data){
                            var
                            is_red = data.is_broken || data.is_aborted,
                            is_green = data.is_green;

                            return is_red ? '<font class="bad">\u2717</font>' :
                                  (is_green ? '<font class="good">\u2713</font>' :
                                   '---' );
                        }
                    },
                    timestamp: {
                        caption: "Last Updated",
                        renderer: function(key, data){
                            return data[key] || '---';
                        }
                    },
                    "": {
                        renderer: function(key, data){
                            return util.format('<ul class="shortcuts" data-device-id="%s"><li>', deviceId) + [
                                '<a href="#device-info" class="btn icon device-info" title="Device Info"></a>',
                                '<a href="#project-info" class="btn icon project-info" title="Project Info"></a>',
                                '<a href="#unsubscribe" class="btn icon project-unsubscribe" title="Unsubscribe"></a>'
                            ].join('</li><li>') + '</li></ul>';
                        }
                    }
                }
            });
        }
        else { // show json encoded:
            res.render('page', {
                jsModule: 'app/device/subscription',
                title: title,
                message: msg,
                footer: util.inspect({isSubscriptionGreen: isSubscriptionGreen}),
                text: util.inspect(subscription)
            });
        }
    });
};

exports.info = function(req, res) {
    var deviceId = req.param('id');

    res.render('page', {
        jsModule: 'app/device/info',
        title: 'Device Info Page',
        text: util.format('This page will contain more detailed information about device (%s)', deviceId)
    });
};

// lists all registered devices
exports.listAll = function(req, res){
    var
    devices = [],
    prettyPrint = (parseInt(req.param("prettyPrint"), 10) === 1);

    dbstore.getAllDevices(function(err, row){
        devices.push(row);
    }, function(err, rowNum){
        var
        title = util.format('Device List (%d)', rowNum);

        if(prettyPrint) { // show as a pretty hash table:
            res.render('page-table-grid', {
                jsModule: 'app/device/list',
                title: title,
                data: devices,
                columns: {
                    id: {
                        caption: "ID",
                        colClass: "row-id"
                    },
                    unique_id: {
                        caption: "Unique ID"
                    },
                    registered: {
                        caption: "Registered"
                    },
                    "": {
                        renderer: function(key, data){
                            return '<ul class="shortcuts"><li>' + [
                                '<a href="#info-info" class="btn icon device-info" title="Device Info"></a>',
                                '<a href="#remove-device" class="btn icon device-delete" title="Remove Device"></a>'
                            ].join('</li><li>') + '</li></ul>';
                        }
                    }
                }
            });
        }
        else { // show json encoded:
            res.render('page', {
                jsModule: 'app/device/list',
                title: title,
                text: util.inspect(devices)
            });
        }
    });
};

// shows configuration for a device
exports.showConfig = function(req, res){

    var
    prettyPrint = (parseInt(req.param("prettyPrint"), 10) === 1),
    title = util.format('Device Config (%s)', req.params.id);

    dbstore.getDeviceConfig(req.params.id, function(err, config){
        if(err) {
            res.status(404).render('error', {
                title: title,
                error: err
            });
            return;
        }

        if(prettyPrint) { // show as a pretty hash table:
            res.render('page-table-hash', {
                jsModule: 'app/device/config-show',
                title: title,
                data: config,
                columns: {
                    key: {
                        caption: "key"
                    },
                    value: {
                        caption: "value"
                    }
                }
            });
        }
        else { // show json encoded:
            res.render('page', {
                jsModule: 'app/device/config-show',
                title: title,
                text: util.inspect(config)
            });
        }
    });
};

// updates configuration for a device
exports.updateConfig = function(req, res){
    var
    title = "Device Update Configuration",
    replace = (req.params.replace === true),
    deviceId = req.params.id,
    config = req.query,
    onComplete = function(err){
        if(err) {
            res.status(404).render('error', {
                title: title,
                error: err
            });
            return;
        }

        res.render('page', {
            jsModule: 'app/device/config-update',
            title: title,
            text: util.format('Configuration for "%s" was %s!', deviceId, (replace ? "replaced" : "updated"))
        });
    };
    
    if(numberOfProperties(config) === 0) {
        onComplete("No configuration provided to update.");
    }

    if(replace) {
        dbstore.replaceDeviceConfig(deviceId, config, onComplete);
    }
    else {
        dbstore.updateDeviceConfig(deviceId, config, onComplete);
    }
};