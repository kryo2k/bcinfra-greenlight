define(['jquery'],function($){
    console.log("This is the project list module.");

    // hook into table row links:
    $('table tbody .shortcuts').each(function(){
        var el = this, $el = $(el), rowId = $el.parent().siblings("td.row-id").html(),
        createShortcutEvtHandler = function(destUrl){
            return function(evt){
                evt.preventDefault();
                window.location.href = destUrl;
            };
        };

        $el.find('a[href="#project-info"]').click(createShortcutEvtHandler("/project/info/" + rowId + '?prettyPrint=1'));
        $el.find('a[href="#remove-project"]').click(createShortcutEvtHandler("/project/remove/" + rowId + '?prettyPrint=1'));
    });
});