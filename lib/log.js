var
util = require('util'),
winston = require("winston"),
config = require('./config');

function padZero(n, amnt) {
    amnt = amnt || 2;

    var
    nStr = n.toString(),
    offset = amnt - nStr.length;

    if(offset < 1) {
        return nStr;
    }

    return Array(offset + 1).join("0") + nStr;
}

function timestamp(now){
    now = now || new Date();

    return util.format('%s %s.%s',
        [ now.getFullYear(), padZero(now.getMonth()), padZero(now.getDate()) ].join('/'),
        [ padZero(now.getHours()), padZero(now.getMinutes()), padZero(now.getSeconds()) ].join(':'),
        padZero(now.getMilliseconds(),3)
    );
}

var
logger = null,
cfgLog = config.log,
transports = [new winston.transports.Console({
    json : false,
    timestamp : timestamp,
    level : cfgLog.priority,
    colorize : 'true'
})];

if(cfgLog.filename) {
    transports.push(new winston.transports.File({
        filename: cfgLog.filename,
        timestamp : timestamp,
        level: cfgLog.filePriority,
        json: false
    }));
}

logger = new winston.Logger({
    transports : transports,
    exceptionHandlers : transports,
    exitOnError : false
});

logger.expressLogger = function(){
    
    var
    statCodeToString = function(code) {
        switch(code){
        case 200: return 'OK';
        case 403: return 'NO AUTH';
        case 404: return 'NOT FOUND';
        case 500: return 'SYSTEM ERROR';
        }
        return 'unknown';
    },
    statCodeToLevel = function(code) {
        switch(code){
        case 200: return 'debug';
        case 500: return 'error';
        }
        return 'warn';
    },
    createMessage = function(req, res) {
        var
        code = res.statusCode;

        return util.format("express http [addr: %s, code: %d (%s)] %s %s",
                req.ip,
                code,
                statCodeToString(code),
                req.method,
                req.url
            );
    };

    return function(req, res, next){
        logger.log(statCodeToLevel(res.statusCode), createMessage(req, res));
        next();
    };
};

module.exports = logger;