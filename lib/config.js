var
path = require('path'),
thisEnvironment = process.env.ENV || 'production',
basePath = path.normalize(__dirname + "/.."),
publicPath = path.join(basePath, "public");

module.exports = {
    environment: thisEnvironment,
    devMode: (thisEnvironment === 'development'),
    express: {
        port: 3000
    },
    db: {
        path: path.join(basePath, "data/storage.db")
    },
    hudson: {
        updateInterval: 30000, // every 30 seconds
        url: "http://hudson.bcinfra.net/",
        method: "GET"
    },
    log: {
        priority: 'info',
        filename: path.join(basePath, "log/application.log"),
        filePriority: 'debug'
    }
};