/*global dojo, roadkill, console, Proj4js, window, navigator*/
dojo.provide("roadkill.gpsController");

dojo.require("dojo.number");

dojo.declare("roadkill.gpsController", null, {
    // summary:
    //      The object in charge of working with the device gps

    // srcProj: Proj4js.Proj
    //      The source projection (WGS84)
    srcProj: null,

    // destProj: Proj4js.Proj
    //      The destination projection (UTM12)
    destProj: null,

    // maxError: Number
    //      The minimum number of meters we can accept in error
    //      1600 for production
    maxError: 1600,
    // maxError: 25000,

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

    constructor: function() {
        // summary:
        //      The first function to run
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        // init Proj4js
        Proj4js.defs["EPSG:26912"] = "+title=NAD83 / UTM zone 12N +proj=utm +zone=12 +a=6378137.0 +b=6356752.3141403";
        Proj4js.reportError = function(msg) {
            console.info(msg);
        };
        this.srcProj = new Proj4js.Proj('WGS84');
        this.destProj = new Proj4js.Proj("EPSG:26912");

        this.wireEvents();
    },
    wireEvents: function() {
        // summary:
        //      Wires all of the events
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        var that = this;
        var timerid = navigator.geolocation.watchPosition(function(pos){
            if (!that.pauseUpdate) {
                that.processPosition(pos);
            }
        }, function(er) {
            console.info("problem with watchPosition", er);
            console.info("trying with lower accuracy");
            navigator.geolocation.clearWatch(timerid);
            navigator.geolocation.watchPosition(function(pos){
                console.info("low accuracy", pos);
                if (!that.pauseUpdate) {
                    that.processPosition(pos);
                }
            }, function(er){
                console.info("problem with watchPosition:loweraccuracy", er);
            },
            {timeout: 10000, enableHighAccuracy: false});
        }, {
            enableHighAccuracy: true
        });
    },
    processPosition: function(position, pauseUpdate) {
        // summary:
        //      Fires each time the position changes. Updates the
        //      gps accuracy label in the footer.
        // position: {coords:{longitude:Number, latitude:Number, accuracy:Number}}
        // pauseUpdate: [optional] Boolean
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        this.pauseUpdate = pauseUpdate || false;

        var p = new Proj4js.Point(position.coords.longitude, position.coords.latitude);

        Proj4js.transform(this.srcProj, this.destProj, p);

        this.x = p.x || 0;
        this.y = p.y || 0;
        this.accuracy = window.parseInt(position.coords.accuracy);
        this.time = Date.now();

        var that = this;
        dojo.query(".accuracy-text").forEach(function(node){
            node.innerHTML = that.accuracy;
        });
    },
    hasValidLocation: function() {
        // summary:
        //      Returns True if there is a position available that is
        //      suitable for the database.
        // returns: dojo.Deferred
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        var that = this;
        function isValid() {
            var age = Date.now() - that.time;
            return that.x !== 0 && that.y !== 0 &&
                that.accuracy < that.maxError &&
                that.accuracy > 0 &&
                age < that.maxAge;
        }

        var def = new dojo.Deferred();
        if(isValid()) {
            def.resolve(true);
        } else {
            navigator.geolocation.getCurrentPosition(function(position) {
                that.processPosition(position);
                def.resolve(isValid());
            }, function(er) {
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
    getGeometry: function() {
        // summary:
        //      Returns the geometry in a format that the addFeatures service can use
        // returns: {x: Number, y: Number}
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        this.pauseUpdate = false;

        return {
            x: this.x,
            y: this.y
        };
    },
    setUTMPoint: function(point){
        // summary:
        //      Sets the x and y directly with UTM values
        // point: {UTM_X: Number, UTM_Y: Number}
        console.info(this.declaredClass + "::" + arguments.callee.nom, arguments);

        this.pauseUpdate = true;

        this.x = point.UTM_X;
        this.y = point.UTM_Y;
        this.accuracy = -2;
    }
});
