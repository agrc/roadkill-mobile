require({
    packages: [
        'app',
        'dojo',
        'dojox',
        {
            name: 'jquery',
            location: './jquery',
            main: 'jquery'
        }, {
            name: 'jquery-mobile-bower',
            location: './jquery-mobile-bower',
            main: 'js/jquery.mobile-1.4.5'
        }, {
            name: 'proj4',
            location: './proj4/dist',
            main: 'proj4-src'
        }
    ]
});
