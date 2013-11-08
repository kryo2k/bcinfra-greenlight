var
util = require('util'),
sqlite = require("sqlite3").verbose(),
crypto = require("crypto"),
config = require('./config'),
log = require('./log');

var
cfgDb = config.db,
debugging = config.devMode,
db = new sqlite.Database(cfgDb.path),
logTag = "db store";

function iterate(obj, fn) {
    if(!fn) return;

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            fn(key, obj[key]);
        }
    }
}
function generateId() {
    return crypto.createHash("sha1").update((new Date()).getTime().toString()).digest("hex");
}

function projectAndLastHistoryAreDifferent(project, lastHistory) {
    var
    R_DIFF = true,
    R_SAME = !R_DIFF;

    if(lastHistory === null) { // no history available (new data)
        return R_DIFF;
    }
    
    var
    tests = [
        project.isBroken  === (lastHistory.is_broken === 1),
        project.isAborted === (lastHistory.is_aborted === 1),
        project.isStable  === (lastHistory.is_stable === 1),
        project.isGreen   === (lastHistory.is_green === 1)
    ];

    // log.debug('tests:',tests);

    return tests.indexOf(false) > -1 ? R_DIFF : R_SAME;
}

exports.loadProject = function(project, callback){
    if(!callback) return;

    var
    uniqName = project.name;

    if(!uniqName) {
        callback(util.format("project (%s) does not contain a name",util.inspect(project)), null);
        return;
    }

    db.serialize(function(){
        db.get("SELECT id FROM project WHERE name = ?", [uniqName], function(err, row){
            if(err) {
                callback(err, null);
            }
            else if(!row) {
                db.run("INSERT INTO project (name) VALUES(?)",[uniqName], function(err, result){
                    if(err) {
                        callback(util.format('"%s" gave error: %j', uniqName, err), null);
                        return;
                    }
                    callback(null, this.lastID);
                });
            }
            else {
                callback(null, row.id);
            }
        });
    });
};

exports.getProjectInfo = function(projectId, callback) {
    db.serialize(function(){
        db.all("SELECT P.*, PH.* FROM project P " +
            "JOIN project_history PH ON PH.project_id = P.id " +
            "WHERE P.id = ? ORDER BY timestamp DESC", [projectId], function(err, rows){

            if(err || !rows) {
                callback(err, null);
                return;
            }

            callback(null, rows);
        });
    });
};

exports.getProjectLatestStatus = function(project, callback){
    if(!callback) return;

    exports.loadProject(project, function(err, projectId){
        if(err) {
            log.error("Error while loading project:", err);
            return;
        }

        db.get("SELECT * FROM project_history WHERE project_id = ? ORDER BY timestamp DESC LIMIT 1", [projectId], function(err, row){
            if(err || !row) {
                callback(err, projectId, null);
                return;
            }

            callback(null, projectId, row);
        });
    });
};

exports.updateProject = function(project, callback) {

    //  project properties            \\
    // - title     - raw title from feed
    // - id        - raw id from feed
    // - link      - raw project link from feed
    // - published - date published from feed
    // - updated   - date updated from feed
    // - name      - name of project
    // - buildNum  - latest build number of project
    // - state     - latest state of project
    // - isBroken  - if this build is broken
    // - isAborted - if this build was aborted
    // - isStable  - if project state is stable
    // - isGreen   - if project state is green
    // - lastGreen - last build number for this project was green

    exports.getProjectLatestStatus(project, function(err, projectId, historyRow){
        if(err) {
            log.error("Error while updating project:", err);
            return;
        }

        if(projectAndLastHistoryAreDifferent(project, historyRow)) { 

            log.info(util.format('project (%s:%d) has new status!', project.name, projectId));

            var
            values = [
                projectId,
                project.buildNum,
                project.isBroken ? 1 : null,
                project.isAborted ? 1 : null,
                project.isStable ? 1 : null,
                project.isGreen ? 1 : null,
                project.lastGreen || null
            ];

            // log.debug('values:', values);

            db.run("INSERT INTO project_history " +
               "(project_id, build_num, is_broken, is_aborted, is_stable, is_green, broken_since, timestamp) " +
               "VALUES(?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)", values, function(){
                callback(projectId, historyRow, true);
            });
        }
        else {
            callback(projectId, historyRow, false);
        }
    });
};

exports.removeProject = function(projectId, callback){
    db.serialize(function(){
        db.run('DELETE FROM project WHERE id = ?', [projectId], function(err){
            if(err) {
                log.warn(util.format('got error while removing project: %j', err));
                return callback(err, projectId, null);
            }
            log.debug(util.format('removed %d project %d', this.changes, projectId));
            callback(null, projectId, this.changes);
        });
    });
};

exports.updateProjects = function(projects, callback){
    if(!projects.length) return;

    var
    finished = 0,
    changed = 0,
    changeHandler = function(projectId, historyRow, wasChanged){
        if(wasChanged) {
            changed++;
        }
        if(++finished === projects.length) {
            callback(finished, changed);
        }
    };

    db.serialize(function(){
        for(var i = 0; i < projects.length; i++) {
            exports.updateProject(projects[i], changeHandler);
        }
    });
};
exports.isSubscriptionGreen = function(subscription) {
    var sub, x, green = true;
    for(x = 0; x < subscription.length; x++) {
        sub = subscription[x];

        if((sub.is_broken || sub.is_aborted)||(!sub.is_green)) {
            green = false;
            break;
        }
    }

    return green;
};
exports.removeDevice = function(deviceId, callback){
    db.serialize(function(){
        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            db.run('DELETE FROM device WHERE id = ?', [devicePkId], function(err){
                if(err) {
                    log.warn(util.format('got error while removing device: %j', err));
                    return callback(err, devicePkId);
                }
                log.debug(util.format('removed %d device %s:%d', this.changes, deviceId, devicePkId));
                callback(null, devicePkId, this.changes);
            });
        });
    });
};
exports.deviceSubscription = function(deviceId, subscribeTo, unsubscribeFrom, firstClearAll, callback){
    subscribeTo = subscribeTo || [];
    unsubscribeFrom = unsubscribeFrom || [];
    if(!deviceId || !callback) return;

    var
    dummy = function(){},
    verifyIds = function(ids){
        var res = true;
        for(var i = 0; i < ids.length; i++) {
            if(!parseInt(ids[i],10)) {
                res = false;
                break;
            }
        }
        return res;
    },
    doClearAll = function(devicePkId, cb) {
        cb = cb || dummy;
        db.run('DELETE FROM device_subscription WHERE device_id = ?', [devicePkId], function(err){
            if(err) {
                log.warn(util.format('got error while clearing device subscription: %j', err));
                return cb(err);
            }
            log.debug(util.format('cleared %d device scriptions for device %s:%d', this.changes, deviceId, devicePkId));
            cb(null, this.changes);
        });
    },
    doSubscriptions = function(devicePkId, cb) {
        cb = cb || dummy;
        if(subscribeTo.length) { // new subscriptions:
            var
            query = db.prepare('INSERT INTO device_subscription (device_id, project_id) VALUES (?, ?)');

            for(var i = 0; i < subscribeTo.length; i++) {
                query.run([devicePkId, subscribeTo[i]]);
            }

            query.finalize(function(err){
                log.debug(util.format('added %d device scriptions for device %s:%d', this.changes, deviceId, devicePkId));
                cb(err);
            });
        }
        else {
            cb(null);
        }
    },
    doUnsubscriptions = function(devicePkId, cb) {
        cb = cb || dummy;
        if(unsubscribeFrom.length) { // remove subscriptions:
            db.run('DELETE FROM device_subscription WHERE device_id = ? and project_id in ('+unsubscribeFrom.join(',')+')',[devicePkId],function(err){
                if(err) {
                    log.warn(util.format('got error while removing device subscription: %j', err));
                    return cb(err);
                }

                log.debug(util.format('removed %d device scriptions for device %s:%d', this.changes, deviceId, devicePkId));
                cb(err);
            });
        }
        else {
            cb(null);
        }
    },
    doShowSubscription = function(devicePkId, cb) {
        cb = cb || dummy;
        db.all("SELECT P.*, H.*" +
                "FROM device_subscription S " +
                "LEFT JOIN project P ON P.id = S.project_id " +
                "LEFT JOIN (" +
                  "SELECT H2.project_id, MAX(\"timestamp\") AS latestCheck " +
                  "FROM project_history H2 GROUP BY H2.project_id" +
                ") AS L ON (L.project_id = P.id) " +
                "LEFT JOIN project_history AS H ON (H.project_id = P.id AND H.timestamp = L.latestCheck) " +
                "WHERE S.device_id = ?", [devicePkId], function(err, rows){
            cb(null, rows);
         });
    };

    if(!verifyIds(subscribeTo) || !verifyIds(unsubscribeFrom)) {
        callback("Project IDs must be numeric.");
        return;
    }

    db.serialize(function(){
        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            if(firstClearAll) { // clear existing subscriptions
                doClearAll(devicePkId,function(e1, changes){
                    doSubscriptions(devicePkId,function(){
                        doUnsubscriptions(devicePkId,function(){
                            doShowSubscription(devicePkId,callback);
                        });
                    });
                });
            }
            else {
                doSubscriptions(devicePkId,function(){
                    doUnsubscriptions(devicePkId,function(){
                        doShowSubscription(devicePkId,callback);
                    });
                });
            }
        });
    });
};

exports.deviceUniqueIdToPrimaryId = function(deviceId, callback) {
    if(!callback) return;

    if(typeof deviceId === 'number') { // already translated:
        callback(null, deviceId);
        return;
    }

    if(deviceId.length < 40 || deviceId.match(/[^A-F0-9]/i)) {
        callback(util.format("(%s) Invalid deviceId.", deviceId), null);
        return;
    }

    db.serialize(function(){
        db.get("SELECT id FROM device WHERE unique_id = ?", [deviceId], function(err, row){

            if(err) {
                callback(err, null);
                return;
            }

            if(!row) {
                callback(util.format("DeviceId (%s) could not be found.", deviceId));
                return;
            }

            callback(err, row.id);
        });
    });
};

exports.getDeviceConfig = function(deviceId, callback){
    if(!callback) return;
    db.serialize(function(){
        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            var
            config = {};

            db.all("SELECT setting_key, setting_value " +
                "FROM device_setting WHERE " +
                "device_id = ?", [ devicePkId ], function(err, rows){

                for(var i = 0; i < rows.length; i++) {
                    config[rows[i].setting_key] = JSON.parse(rows[i].setting_value);
                }

                callback(null, config);
            });
        });
    });
};

exports.clearDeviceConfig = function(deviceId, callback){
    if(!callback) return;
    db.serialize(function(){
        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            db.run("DELETE FROM device_setting WHERE device_id = ?", [ devicePkId ], callback);
        });
    });
};

exports.updateDeviceConfig = function(deviceId, config, callback) {
    if(!callback) return;
    db.serialize(function(){

        var
        insertQuery = db.prepare("REPLACE INTO device_setting (" +
            "device_id, setting_key, setting_value) " +
            "VALUES(?, ?, ?)");

        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            // iterate local keys in config, and store each as a row:
            iterate(config, function(k, v){

                if(typeof v === 'string') {
                    var tV = v.toUpperCase();

                    if(['TRUE','YES','FALSE','NO'].indexOf(tV) > -1) { // normalize booleans
                        v = (tV === 'TRUE' || tV === 'YES');
                    }
                }

                insertQuery.run([devicePkId, k, JSON.stringify(v)]);
            });

            // close the transaction and callback
            insertQuery.finalize(callback);
        });
    });
};

exports.replaceDeviceConfig = function(deviceId, config, callback){
    if(!callback) return;
    db.serialize(function(){
        exports.deviceUniqueIdToPrimaryId(deviceId, function(err, devicePkId){
            if(err) {
                callback(err);
                return;
            }

            // clear any previous configuration
            exports.clearDeviceConfig(devicePkId, function(){

                // insert new config
                exports.updateDeviceConfig(devicePkId, config, callback);
            });
        });
    });
};

exports.getAllProjects = function(joinLastState, rowCallback, completeCallback){
    db.serialize(function(){
        var
        query = "SELECT * FROM project as P";

        if(joinLastState) {
            /*jshint multistr: true */
            query = 'SELECT P.*, H.* FROM project AS P \
  LEFT JOIN ( \
    SELECT H2.project_id, MAX("timestamp") AS latestCheck \
      FROM project_history H2 \
      GROUP BY H2.project_id \
  ) AS L ON (L.project_id = P.id) \
  LEFT JOIN project_history AS H ON (H.project_id = P.id AND H.timestamp = L.latestCheck) \
  ORDER BY P.name;';
        }

        db.each(query, rowCallback, completeCallback);
    });
};

exports.getAllDevices = function(rowCallback, completeCallback){
    db.serialize(function(){
       db.each("SELECT * FROM device", rowCallback, completeCallback);
    });
};

exports.registerNewDevice = function(callback){
    if(!callback) return;
    db.serialize(function(){ // warning, this function has an issue with duplicate unique id constraint.

        var
        query = db.prepare("INSERT INTO device (unique_id, registered) VALUES (?, DATETIME())"),
        randomId;

        // run this query:
        query.run([randomId = generateId()]);

        // finalize the query and call our callback when completed:
        query.finalize(function(){
            if(callback && typeof callback === 'function'){
                callback(randomId);
            }
        });
    });
};