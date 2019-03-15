/*eslint-disable no-unused-vars*/
var profile = {
    basePath: '../src',
    action: 'release',
    cssOptimize: 'comments',
    mini: true,
    optimize: false,
    layerOptimize: false,
    selectorEngine: 'acme',
    layers: {
        'dojo/dojo': {
            include: [
                'dojo/i18n',
                'dojo/domReady',
                'app/packages',
                'app/run',
                'app/App',
                'jquery-mobile-bower'
            ],
            includeLocales: ['en-us'],
            customBase: true,
            boot: true
        }
    },
    packages: ['dijit', {
        name: 'proj4',
        resourceTags: {
            amd: function () {
                return true;
            },
            miniExclude: function (filename, mid) {
                return mid !== 'proj4/proj4-src';
            }
        }
    }, {
        name: 'jquery',
        resourceTags: {
            copyOnly: function (filename, mid) {
                return mid !== 'jquery/jquery';
            }
        }
    }],
    staticHasFeatures: {
        // The trace & log APIs are used for debugging the loader, so we don’t need them in the build
        'dojo-trace-api': 0,
        'dojo-log-api': 0,

        // This causes normally private loader data to be exposed for debugging, so we don’t need that either
        'dojo-publish-privates': 0,

        // We’re fully async, so get rid of the legacy loader
        'dojo-sync-loader': 0,

        // dojo-xhr-factory relies on dojo-sync-loader
        'dojo-xhr-factory': 0,

        // We aren’t loading tests in production
        'dojo-test-sniff': 0
    },
    userConfig: {
        packages: ['app']
    }
};
