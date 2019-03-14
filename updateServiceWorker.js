const workboxBuild = require('workbox-build');

const buildSW = () => {
  // This will return a Promise
    return workboxBuild.injectManifest({
        swSrc: 'src/sw.js',
        swDest: 'dest/sw.js',
        globDirectory: 'dest',
        globPatterns: [
            '**\/{core.css,ajax-loader.gif,dojo.js}'
        ]
    }).then(({ count, size, warnings }) => {
    // Optionally, log any warnings and details.
        warnings.forEach(console.warn);
        console.log(`${count} files will be precached, totaling ${size} bytes.`);
    });
}

buildSW();
