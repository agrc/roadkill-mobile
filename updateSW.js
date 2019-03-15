const workboxBuild = require('workbox-build');

const buildSW = () => {
  // This will return a Promise
    return workboxBuild.injectManifest({
        swSrc: 'src/sw.template.js',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
        globIgnores: ['dojox/*', 'dijit/*', 'dojo-themes/*', 'proj4/*', 'util/*'],
        globPatterns: [
            'app/css/core.css',
            'app/css/images/ajax-loader.{gif,png}',
            'app/css/images/icons-??-{black,white}.png',
            'app/images/icon.png',
            'app/images/splash.png',
            'jquery-mobile-bower/css/images/ajax-loader.gif',
            'dojo/dojo.js',
            'index.html'
        ]
    }).then(({ count, size, warnings }) => {
    // Optionally, log any warnings and details.
        warnings.forEach(console.warn);
        console.log(`${count} files will be precached, totaling ${size} bytes.`);
    });
}

buildSW();
