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
                that.processPosition(pos);
            }, function (er) {
                console.info('problem with watchPosition', er);
                console.info('trying with lower accuracy');
                navigator.geolocation.clearWatch(timerid);
                navigator.geolocation.watchPosition(function (pos) {
                    console.info('low accuracy', pos);
                    that.processPosition(pos);
                }, function (er) {
                    console.info('problem with watchPosition:loweraccuracy', er);
                },
                {timeout: 10000, enableHighAccuracy: false});
            }, {
                enableHighAccuracy: true
            });
        },
        projectFromLatLng: function (coords) {
            return proj4(this.webMercProj, [coords.longitude, coords.latitude]);
        },
        processPosition: function (position) {
            // summary:
            //      Fires each time the position changes. Updates the
            //      gps accuracy label in the footer.
            // position: {coords:{longitude:Number, latitude:Number, accuracy:Number}}
            console.log('app/GPSController:processPosition', arguments);

            const p = this.projectFromLatLng(position.coords)

            this.x = p[0] || 0;
            this.y = p[1] || 0;
            this.accuracy = window.parseInt(position.coords.accuracy);
            this.time = Date.now();

            var that = this;
            query('.accuracy-text').forEach(function (node) {
                node.innerHTML = that.accuracy;
            });
        },
        getGeometry: function () {
            // summary:
            //      Resolves with the geometry in a format that the addFeatures service can use
            // returns: Deferred that resolves {x: Number, y: Number}
            console.log('app/GPSController:getGeometry', arguments);

            const isValid = () => {
                var age = Date.now() - this.time;
                return this.x !== 0 && this.y !== 0 &&
                    this.accuracy < this.maxError &&
                    this.accuracy > 0 &&
                    age < this.maxAge;
            }

            var def = new Deferred();
            if (isValid()) {
                def.resolve({
                    x: this.x,
                    y: this.y,
                    accuracy: this.accuracy
                });
            } else {
                navigator.geolocation.getCurrentPosition((position) => {
                    this.processPosition(position);
                    def.resolve(isValid() && {
                        x: this.x,
                        y: this.y,
                        accuracy: this.accuracy
                    });
                }, function (er) {
                    console.info(er);
                    def.resolve(false);
                }, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: this.maxAge
                });
            }
            return def;
        }
    });
});
