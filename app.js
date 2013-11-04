var express = require('express')
  , requirejsMiddleware = require("requirejs-middleware")
  , connect = require('connect')
  , routes = require('./routes')
  , log = require('./lib/log')
  , config = require('./lib/config')
  , hudson = require('./lib/hudson')
  , project = require('./routes/project')
  , device = require('./routes/device')
  , util = require('util')
  , http = require('http')
  , path = require('path');

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
app.use(requirejsMiddleware(config.requireJs));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'build')));

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
app.get('/project/list', project.listAll);
app.get('/device/list', device.listAll);
app.get('/device/register', device.register);
app.get('/device/subscription/:id', device.subscription);
app.get('/device/config-show/:id', device.showConfig);
app.get('/device/config-update/:id', device.updateConfig);

// background watcher process -- checks hudson for project updates.
hudson.init();

// launch our express powered http server
http.createServer(app).listen(app.get('port'), function() {
    log.info('Express server listening on port:', app.get('port'));
});