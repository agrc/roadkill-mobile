require({
    packages: ['app', 'dojo', 'dojox', {
        name: 'jquery',
        location: './jquery',
        main: 'jquery'
    }, {
        name: 'jquerymobile',
        location: './jquery-mobile-bower/js',
        main: 'jquery.mobile-1.4.5'
    }, {
        name: 'proj4',
        location: './proj4/dist',
        main: 'proj4'
    }]
});
