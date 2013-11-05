define(['jquery'],function($){
    console.log("This is the device subscription module.");

    // hook into table row links:
    $('table tbody .shortcuts').each(function(){
        var el = this, $el = $(el), projectId = $el.parent().siblings("td.row-id").html(),
        deviceId = $el.attr('data-device-id'), createShortcutEvtHandler = function(destUrl){
            return function(evt){
                evt.preventDefault();
                window.location.href = destUrl;
            };
        };

        $el.find('a[href="#project-info"]').click(createShortcutEvtHandler("/project/info/" + projectId + '?prettyPrint=1'));
        $el.find('a[href="#unsubscribe"]').click(createShortcutEvtHandler("?prettyPrint=1&remove=" + projectId));
    });
});