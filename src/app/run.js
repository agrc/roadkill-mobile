(function () {
    require({baseUrl: './'}, ['app/App', 'dojo/domReady!', 'jquery-mobile-bower'], function (App) {
        new App();

        window.applicationCache.addEventListener('updateready', function () {
            if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
                console.log('new app cache downloaded');
                // Browser downloaded a new app cache.
                // Swap it in and reload the page to get the new version
                window.applicationCache.swapCache();
                if (confirm('A new version of this app is available. Please click OK to reload.')) {
                    window.location.reload();
                }
            }
        }, false);
    });
}())
