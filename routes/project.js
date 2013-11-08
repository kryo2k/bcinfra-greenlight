var
util = require('util'),
dbstore = require(__dirname + "/../lib/dbstore.js"),
log = require(__dirname + '/../lib/log');

exports.info = function(req, res) {
    var 
    title = "Project Info",
    projectId = req.param('id');

    dbstore.getProjectInfo(projectId, function(err, history){
        if(err) {
            res.status(404).render('error', {
                title: title,
                error: err
            });
            return;
        }

        var
        sample = history[0]||{},
        renderBool = function(key, data){
            return data[key] ?
                "<font color='white'>\u2713</font>" :
                "<font color='#444'>\u2717</font>";
        };

        title = util.format("Project Info (%s: %d)", sample.name, sample.id);

        if(util.requestIsPrettyPrint(req)) {
            res.render('page-table-grid', {
                jsModule: 'app/project/info',
                title: title,
                data: history,
                links: [
                    {label: "List Projects", icon: 'project-list', href: "/project/list?prettyPrint=1"}
                ],
                columns: {
                    is_broken: {
                        caption: "Broken",
                        align: "center",
                        renderer: renderBool
                    },
                    is_aborted: {
                        caption: "Aborted",
                        align: "center",
                        renderer: renderBool
                    },
                    is_stable: {
                        caption: "Stable",
                        align: "center",
                        renderer: renderBool
                    },
                    is_green: {
                        caption: "Green",
                        align: "center",
                        renderer: renderBool
                    },
                    lastStatus: {
                        caption: "Status",
                        align: "center",
                        renderer: util.projectStateRenderer
                    },
                    timestamp: {
                        caption: "Event Time",
                        renderer: function(key, data){
                            return data[key] || '---';
                        }
                    }
                }
            });
        }
        else {
            res.render('page', {
                jsModule: 'app/project/info',
                title: title,
                text: util.inspect(history)
            });
        }
    });
};

exports.remove = function(req, res) {
    var title = "Project Removal Page",
    pPrint = req.param('prettyPrint');

    dbstore.removeProject(req.param('id'), function(err, projectId, removed){

        if(!err) {
            res.redirect("/project/list?prettyPrint="+(pPrint ? "1" : "0"));
        }
        else {
            res.render('error', {
                jsModule: 'app/project/remove',
                title: title,
                error: err
            });
        }
    });
};

// lists all registered projects
exports.listAll = function(req, res){
    var
    projects = [],
    prettyPrint = (parseInt(req.param("prettyPrint"), 10) === 1);

    dbstore.getAllProjects(true, function(err, row){
        projects.push(row);
    }, function(err, rowNum){
        var
        title = util.format('Project List (%d)', rowNum);

        if(prettyPrint) { // show as a pretty hash table:
            res.render('page-table-grid', {
                jsModule: 'app/project/list',
                title: title,
                data: projects,
                links: [
                    {label: "List Devices", icon: 'device-list', href: "/device/list?prettyPrint=1"}
                ],
                columns: {
                    id: {
                        caption: "ID",
                        colClass: "row-id"
                    },
                    name: {
                        caption: "Name",
                        colClass: "project-name"
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
                            return '<ul class="shortcuts"><li>' + [
                                '<a href="#project-info" class="btn icon project-info" title="Project Info"></a>',
                                '<a href="#remove-project" class="btn icon project-delete" title="Remove Project"></a>'
                            ].join('</li><li>') + '</li></ul>';
                        }
                    }
                }
            });
        }
        else { // show json encoded:
            res.render('page', {
                jsModule: 'app/project/list',
                title: title,
                text: util.inspect(projects)
            });
        }
    });
};