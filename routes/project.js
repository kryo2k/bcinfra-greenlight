var
util = require('util'),
dbstore = require(__dirname + "/../lib/dbstore.js"),
log = require(__dirname + '/../lib/log');

exports.info = function(req, res) {
    var projectId = req.param('id');

    res.render('page', {
        jsModule: 'app/project/info',
        title: 'Project Info Page',
        text: util.format('This page will contain more detailed information about project (%d)', projectId)
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
                columns: {
                    id: {
                        caption: "ID"
                    },
                    name: {
                        caption: "Name"
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