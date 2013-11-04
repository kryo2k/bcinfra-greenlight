var
path = require('path'),
thisEnvironment = process.env.ENV || 'production',
basePath = path.normalize(__dirname + "/..");

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
    requireJs: {
        src: path.join(basePath, "public"),
        dest: path.join(basePath, "build"),
        build: true,
        debug: true,
        modules: {
            "/main.js": {
                baseUrl: path.join(basePath, "public"),
                include: "main"
            }
        }
    },
    log: {
        priority: 'info',
        filename: path.join(basePath, "log/application.log"),
        filePriority: 'debug'
    }
};