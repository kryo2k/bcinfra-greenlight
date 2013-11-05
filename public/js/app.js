(function(r){
    var requirements = [
      'jquery'
    ];

    r.config({
        baseUrl: '/js',
        paths: {
            app: 'app'
        }
    });

    function onReady() {
        console.log('app is loaded');
    }

    r(requirements, function($) {
        var
        module = $('script[src="/js/requirejs.js"]')
            .attr('data-invoke-module');

        if(module) {
            r([module], onReady);
        }
        else {
            onReady();
        }
    });
})(requirejs);