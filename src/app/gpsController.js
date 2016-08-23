define([
    'dojo/Deferred',
    'dojo/has',
    'dojo/query',
    'dojo/_base/declare',

    'proj4'
], function (
    Deferred,
    has,
    query,
    declare,

    proj4
) {
    return declare(null, {
        // summary:
        //      The object in charge of working with the device gps

        // srcProj: proj4.Proj
        //      The source projection (WGS84)
        srcProj: null,

        // destProj: proj4.Proj
        //      The destination projection (UTM12)
        destProj: null,

        // maxError: Number
        //      The minimum number of meters we can accept in error
        maxError: null,

        // current UTM Coords
        // x: Number
        x: 0,
        // y: Number
        y: 0,
        // accuracy: Number
        accuracy: 0,

        // time: Date
        //      The time associated with the location
        time: null,

        // maxAge: Number
        //      The maximum age accepted for a location. 1 minute
        maxAge: 60000,

        // pauseUpdate: Boolean
        pauseUpdate: false,

        constructor: function () {
            // summary:
            //      The first function to run
            console.log('app/GPSController:constructor', arguments);

            if (has('agrc-build') === 'prod' || has('agrc-build') === 'stage') {
                this.maxError = 1600;
            } else {
                // allow for greater tolerance to allow for testing from desktop machine
                this.maxError = 25000;
            }

            // init proj4
            proj4.reportError = function (msg) {
                console.error(msg);
            };

            // feature service projection
            this.webMercProj = proj4('EPSG:3857');

            this.wireEvents();
        },
        wireEvents: function () {
            // summary:
            //      Wires all of the events
            console.log('app/GPSController:wireEvents', arguments);

            var that = this;
            var timerid = navigator.geolocation.watchPosition(function (pos) {
                if (!that.pauseUpdate) {
                    that.processPosition(pos);
                }
            }, function (er) {
                console.info('problem with watchPosition', er);
                console.info('trying with lower accuracy');
                navigator.geolocation.clearWatch(timerid);
                navigator.geolocation.watchPosition(function (pos) {
                    console.info('low accuracy', pos);
                    if (!that.pauseUpdate) {
                        that.processPosition(pos);
                    }
                }, function (er) {
                    console.info('problem with watchPosition:loweraccuracy', er);
                },
                {timeout: 10000, enableHighAccuracy: false});
            }, {
                enableHighAccuracy: true
            });
        },
        processPosition: function (position, pauseUpdate) {
            // summary:
            //      Fires each time the position changes. Updates the
            //      gps accuracy label in the footer.
            // position: {coords:{longitude:Number, latitude:Number, accuracy:Number}}
            // pauseUpdate: [optional] Boolean
            console.log('app/GPSController:processPosition', arguments);

            this.pauseUpdate = pauseUpdate || false;

            var p = proj4(this.webMercProj, [position.coords.longitude, position.coords.latitude]);

            this.x = p[0] || 0;
            this.y = p[1] || 0;
            this.accuracy = window.parseInt(position.coords.accuracy);
            this.time = Date.now();

            var that = this;
            query('.accuracy-text').forEach(function (node) {
                node.innerHTML = that.accuracy;
            });
        },
        hasValidLocation: function () {
            // summary:
            //      Returns True if there is a position available that is
            //      suitable for the database.
            // returns: dojo.Deferred
            console.log('app/GPSController:hasValidLocation', arguments);

            var that = this;
            function isValid() {
                var age = Date.now() - that.time;
                return that.x !== 0 && that.y !== 0 &&
                    that.accuracy < that.maxError &&
                    that.accuracy > 0 &&
                    age < that.maxAge;
            }

            var def = new Deferred();
            if (isValid()) {
                def.resolve(true);
            } else {
                navigator.geolocation.getCurrentPosition(function (position) {
                    that.processPosition(position);
                    def.resolve(isValid());
                }, function (er) {
                    console.info(er);
                    def.resolve(false);
                }, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: that.maxAge
                });
            }
            return def;
        },
        getGeometry: function () {
            // summary:
            //      Returns the geometry in a format that the addFeatures service can use
            // returns: {x: Number, y: Number}
            console.log('app/GPSController:getGeometry', arguments);

            this.pauseUpdate = false;

            return {
                x: this.x,
                y: this.y
            };
        },
        setWebMercatorPoint: function (point) {
            // summary:
            //      Sets the x and y directly with web mercator values
            // point: {x: Number, y: Number}
            console.log('app/GPSController:setWebMercatorPoint', arguments);

            this.pauseUpdate = true;

            this.x = point.x;
            this.y = point.y;
            this.accuracy = -2;
        }
    });
});
