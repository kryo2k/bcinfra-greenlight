define(['jquery'],function($){
    console.log("This is the device list module.");

    // hook into table row links:
    $('table tbody .shortcuts').each(function(){
        var el = this, $el = $(el), rowId = $el.parent().siblings("td.row-id").html(),
        deviceId = $el.parent().siblings("td.device-id").html(),
        createShortcutEvtHandler = function(destUrl){
            return function(evt){
                evt.preventDefault();
                window.location.href = destUrl;
            };
        };

        $el.find('a[href="#device-config"]').click(createShortcutEvtHandler("/device/config-show/" + deviceId + '?prettyPrint=1'));
        $el.find('a[href="#device-subscription"]').click(createShortcutEvtHandler("/device/subscription/" + deviceId + '?prettyPrint=1'));
        $el.find('a[href="#device-info"]').click(createShortcutEvtHandler("/device/info/" + deviceId + '?prettyPrint=1'));
        $el.find('a[href="#remove-device"]').click(createShortcutEvtHandler("/device/remove/" + deviceId));
    });
});