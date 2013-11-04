var
util = require('util'),
url = require('url'),
http = require('http'),
xmldom = require('xmldom'),
xpath = require('xpath'),
config = require('./config'),
dbstore = require("./dbstore"),
log = require('./log');

var
cfgHudson = config.hudson,
debugging = config.devMode,
watchHandler,
hasInitialized = false,
logTag = "hudson";

// private: Gets the configured URL parsed and validated.
function getParsedUrl() {
    var
    cfgUrl = cfgHudson.url || false,
    urlParsed;

    if(!cfgUrl) {
        throw "Hudson does not have a URL configured.";
    }

    // parse the URL:
    urlParsed = url.parse(cfgUrl);

    if(!urlParsed) {
        throw "Invalid URL provided for hudson";
    }

    if(!urlParsed.host) {
        throw "URL does not contain a hostname. This is required.";
    }

    return urlParsed;
}

// creates a request to hudson
function hudsonRequest(path, callback) {

    var
    hUrl = getParsedUrl(),
    port = hUrl.port || 80;

    // normalize our request path
    path = path || hUrl.path || "/";

    if(debugging) {
        log.debug(logTag, util.format("request to %s:%d (%s)..", hUrl.host, port, path));
    }

    // perform the HTTP request:
    var
    buffer = '',
    req = http.request({
        hostname: hUrl.host,
        port: port,
        method: cfgHudson.method || "GET",
        auth: hUrl.auth,
        path: path
    }, function(res){
        res.setEncoding('utf8'); // always encode in utf-8
        res.on('data', function (chunk) {
            buffer += chunk;
        });
        res.on('end', function(){

            if(debugging) {
                log.debug(logTag, util.format("request completed (buffer size: %d bytes)", buffer.length));
            }

            callback(null, buffer);
        });
    });

    // handle errors:
    req.on('error', function(e){

        if(debugging) {
            log.debug(logTag, util.format("error while performing hudson request: %j", e));
        }

        callback(e, buffer);
    });

    return req;
}

// parses the hudson feed (xml)
function hudsonParseFeed(data) {

    if(!data.length) {
        log.error(logTag, "feed data is empty");
        return;
    }

    var
    // parse the XML data returned from feed:
    doc = (new xmldom.DOMParser()).parseFromString(data),
    nodeTitle   = xpath.select('/feed/title', doc),
    nodeUpdated = xpath.select('/feed/updated', doc),
    nodeAuthor  = xpath.select('/feed/author/name', doc),
    nodeId      = xpath.select('/feed/id', doc),
    nodeEntry   = xpath.select('/feed/entry', doc),
    entries     = [];

    if(!nodeTitle.length) {
        log.warn(logTag, "feed missing title");
    }
    else if(!nodeUpdated.length) {
        log.warn(logTag, "feed missing last updated");
    }
    else if(!nodeAuthor.length) {
        log.warn(logTag, "feed missing author");
    }
    else if(!nodeId.length) {
        log.warn(logTag, "feed missing id");
    }
    else if(!nodeEntry.length) {
        log.warn(logTag, "feed missing entries");
    }
    else {

        // parse entries and compute the state of each entry
        for(var i = 0; i < nodeEntry.length; i++) {
            var
            entryChildren = nodeEntry[i].childNodes,
            entry = {};

            iterateChild:
            for(var x = 0; x < entryChildren.length; x++) {
                var
                entryChild = entryChildren[x],
                childTag = entryChild.tagName,
                childData;

                switch(childTag) {
                    case 'link':
                        entry[childTag] = entryChild.getAttribute('href')||"";
                    break;

                    case 'title':
                    case 'id':
                        entry[childTag] = childData = entryChild.firstChild.data||"";

                        if(childTag === 'title') { // parse entry meta data from title:
                            var
                            matches = childData.match(/^([^#]+) (#\d+) \((.*?)\)$/);

                            if(childData.indexOf("\u00BB") > -1) { // skip sub-projects
                                entry = null;
                                break iterateChild;
                            }

                            if(!matches || matches.length === 1) { // couldn't parse title
                                continue;
                            }

                            // reference our matches into the entry object
                            entry.name = matches[1].trim();
                            entry.buildNum = matches[2].trim();
                            entry.state = matches[3].trim();

                            // determine the state of the build
                            entry.isBroken = /^broken.*/.test(entry.state);
                            entry.isAborted = /^aborted.*/.test(entry.state);
                            entry.isStable = /^stable.*/.test(entry.state);
                            entry.isGreen = (!entry.isBroken && !entry.isAborted);

                            if(entry.isBroken) { // see if indicates last green build:
                                var
                                sinceWhen = entry.state.match(/^broken since build (#\d+)$/);

                                if(sinceWhen && sinceWhen.length === 2) {
                                    entry.lastGreen = sinceWhen[1];
                                }
                            }
                        }
                    break;
                    case 'published':
                    case 'updated':
                        entry[childTag] = new Date(entryChild.firstChild.data);
                    break;
                }
            }

            if(entry !== null) { // add parsed entry to stack
                entries.push(entry);
            }
        }

        return {
            id: nodeId[0].firstChild.data,
            title: nodeTitle[0].firstChild.data,
            authorName: nodeAuthor[0].firstChild.data,
            updated: new Date(nodeUpdated[0].firstChild.data),
            entries: entries
        };
    }

    return false;
}

// update all the projects that hudson has remotely
exports.updateProjects = function(){
    hudsonRequest("/rssLatest", function(err, body, res){
        if(err) {
            log.error(logTag, "fetch error:", err);
            return;
        }

        var
        feed = hudsonParseFeed(body);

        if(!feed) {
            return;
        }

        if(debugging) { // debugging feed information, only displayed first time
            log.debug(logTag, "feed id:", feed.id);
            log.debug(logTag, "feed title:", feed.title);
            log.debug(logTag, "feed author:", feed.authorName);
            log.debug(logTag, "feed updated:", feed.updated);
            log.debug(logTag, "feed has", feed.entries.length, 'project entry(ies)');
        }

        // update all the projects we have in the store
        dbstore.updateProjects(feed.entries, function(finished, changed){
            if(changed > 0) {
                log.info(logTag, util.format("updated %d/%d project(s)",changed,finished));
            }
            else if(debugging) {
                log.debug(logTag, 'no changes');
            }
        });

    }).end();
};

// Hudson watcher process stopper
exports.stopWatcher = function(){
    if(watchHandler) {
        if(debugging) {
            log.debug(logTag, 'watcher stopping');
        }

        clearInterval(watchHandler);
    }
};

// Hudson watcher process starter
exports.startWatcher = function(){
    if(debugging) {
        log.debug(logTag, 'watcher starting');
    }

    watchHandler = setInterval(exports.updateProjects, cfgHudson.updateInterval);
};

exports.init = function(){

    if(debugging) {
        log.debug(logTag, 'watcher initializing');
    }

    if(!hasInitialized) { // update projects immediately on start-up
        exports.updateProjects();
        hasInitialized = true;
    }

    // start our watcher process
    exports.startWatcher();
};