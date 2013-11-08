var express = require('express')
  , connect = require('connect')
  , routes = require('./routes')
  , log = require('./lib/log')
  , config = require('./lib/config')
  , hudson = require('./lib/hudson')
  , project = require('./routes/project')
  , device = require('./routes/device')
  , util = require('util')
  , http = require('http')
  , path = require('path')
  , url = require('url')
  , extend = require('extend');

util.alterUrl = function(urlStr, alter) {
    var
    altered = url.parse(urlStr, true);

    delete altered.href;
    delete altered.host;
    delete altered.path;
    delete altered.search;

    extend(true, altered, alter);

    return url.format(altered);
};

util.prettyPrintURL = function(url, prettyPrint) {
    if(prettyPrint === undefined) {
        prettyPrint = true;
    }

    return util.alterUrl(url, {
        query: {
            prettyPrint: prettyPrint ? "1" : "0"
        }
    });
};
util.requestIsPrettyPrint = function(req){
    return parseInt(req.param("prettyPrint"), 10) === 1;
};
util.projectStateRenderer = function(key, data){
    var
    is_red = data.is_broken || data.is_aborted,
    is_green = data.is_green;

    return is_red ? '<font class="bad">\u2717</font>' :
          (is_green ? '<font class="good">\u2713</font>' :
           '---' );
};

var app = express();

// all environments
app.set('env', config.environment);
app.set('port', config.express.port);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(new log.expressLogger());
app.use(connect.urlencoded());
app.use(connect.json());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// output the current environment settings to log:
log.debug("Current Environment:", app.get('env'));

// development only
if (config.isDev) { // development error handling:
  app.use(express.errorHandler());
}
else { // production error handling:

    app.use(function(req, res, next){ // handle missing pages:
        res.status(404).render('error', {
            title: 'Page not found',
            error: util.format("Page requested (%s) was not found.", req.path)
        });
    });

    app.use(function(err, req, res, next){ // handle system errors:
        res.status(500).render('error', {
            title: 'System Error',
            error: err,
            trace: err.stack
        });
    });
}

// configure routes for express http server:
app.get('/', routes.index);
app.get('/project/info/:id', project.info);
app.get('/project/remove/:id', project.remove);
app.get('/project/list', project.listAll);
app.get('/device/info/:id', device.info);
app.get('/device/list', device.listAll);
app.get('/device/register', device.register);
app.get('/device/remove/:id', device.remove);
app.get('/device/subscription/:id', device.subscription);
app.get('/device/config/:id', device.showConfig);
app.get('/device/config-update/:id', device.updateConfig);

// background watcher process -- checks hudson for project updates.
hudson.init();

// launch our express powered http server
http.createServer(app).listen(app.get('port'), function() {
    log.info('Express server listening on port:', app.get('port'));
});