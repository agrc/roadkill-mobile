define([
    'app/authentication',
    'app/data/species',
    'app/gpsController',

    'dojo/dom',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/has',
    'dojo/query',
    'dojo/request/xhr',
    'dojo/sniff',
    'dojo/_base/array',
    'dojo/_base/declare',
    'dojo/_base/lang'
], function (
    Authentication,
    hardCodedSpecies,
    GPSController,

    dom,
    domClass,
    domConstruct,
    domStyle,
    has,
    query,
    xhr,
    has,
    array,
    declare,
    lang
) {
    return declare(null, {
        // summary:
        //      The main object that controls the application

        // version: String
        version: '2.0.4',

        // gpsController: GPSController
        gpsController: null,

        // fields: Object
        fieldNames: {
            // Reports feature class
            REPORT_DATE: 'REPORT_DATE',
            SPECIES: 'SPECIES',
            GPS_ACCURACY: 'GPS_ACCURACY',
            AGE_CLASS: 'AGE_CLASS',
            GENDER: 'GENDER',
            XYPHOID: 'XYPHOID',
            COMMENTS: 'COMMENTS',
            RESPONDER_ID: 'RESPONDER_ID',
            UDOT_REGION: 'UDOT_REGION',
            UDWR_REGION: 'UDWR_REGION',
            HIGHWAY_ROAD: 'HIGHWAY_ROAD',
            ADDRESS: 'ADDRESS',

            // UDOT_Regions feature class
            REGION: 'REGION',

            // Roads feature class
            ALT_NAME: 'ALT_NAME',
            LABEL: 'LABEL'
        },

        // defaultXHRTimeout: Number
        defaultXHRTimeout: 120000,

        // addressMilepostAccuracyCode: Number
        addressMilepostAccuracyCode: -2,

        // manualCoordsAccuracyCode: Number
        manualCoordsAccuracyCode: -1,

        // tapToSelect: String
        //      The prompt text for drop downs
        tapToSelect: 'tap to select',

        // auth: roadkill.auth
        //      The authentication object
        auth: null,

        // domainsGot: Boolean
        //      A switch to tell if the domains have been requested or not
        domainsGot: false,

        // offlineMsg: String
        //      The message displayed on the confirmation page when a report is
        //      stored offline due to a network connection problem.
        offlineMsg: 'There was no network connection available. Your report has been stored on your device and will be ready to submit when a network connection is present again.',

        // safariAdditionalOfflineMsg: String
        safariAdditionalOfflineMsg: '<p><strong>Important Note</strong>: Due to a recent update to Safari, reports stored offline for longer than 7 days will automatically be deleted. <strong>Please make sure to submit this report to the server within seven days of recording it to avoid data loss.</strong></p>',

        // loggedOutMsg: String
        //      The message displayed on teh confirmation page when a report is
        //      stored offline due to the user not being logged in.
        loggedOutMsg: 'Your report has been stored on your device because you are not logged in.',

        // appName: String
        //     Used in UserManagement service
        appName: 'roadkill',

        // roles: {}
        //     The roles in the roadkill user database
        roles: {
            Admin: 'admin',
            Submitter: 'submitter',
            Viewer: 'viewer'
        },

        // urls: {}
        //      All of the urls used in this app
        urls: {
            login: '/permissionproxy/api/authenticate/user',
            register: '/permissionproxy/api/user/register',
            mapService: '/ArcGIS/rest/services/Roadkill/MapService',
            featureService: '/ArcGIS/rest/services/Roadkill/FeatureService',
            sendDiagnostics: '/ArcGIS/rest/services/Roadkill/PublicToolbox/GPServer/SendDiagnostics',
            locatorService: '//api.mapserv.utah.gov/api/v1/geocode/'
        },

        constructor: function () {
            // summary:
            //      The first function to run
            console.log('app/App:constructor', arguments);

            var that = this;
            if (has('agrc-build') === 'prod') {
                // mapserv.utah.gov
                this.apiKey = 'AGRC-1B07B497348512';
            } else if (has('agrc-build') === 'stage') {
                // test.mapserv.utah.gov
                this.apiKey = 'AGRC-AC122FA9671436';
            } else {
                // localhost
                xhr(require.baseUrl + 'secrets.json', {
                    handleAs: 'json',
                    sync: true
                }).then(function (secrets) {
                    that.apiKey = secrets.apiKey;
                }, function () {
                    throw 'Error getting secrets!';
                });
            }

            this.auth = new Authentication(this);

            this.gpsController = new GPSController();

            this.auth.on('log-in-successful', function () {
                that.getDomains(that.auth.token);
            });
            this.auth.on('log-in-unsuccessful', lang.hitch(this, 'getDomains'));

            this.wireEvents();

            this.updateLocallyStoredReportsNumber();

            dom.byId('version').innerHTML = 'Version: ' + this.version;
        },
        getDomains: function (token) {
            // summary:
            //      Gets the domains from the feature service and
            //      updates the corresponding controls on the form
            // token: String
            console.log('app/App:getDomains', arguments);

            if (this.domainsGot) {
                return;
            }

            var that = this;

            function useLocal() {
                // use offline storage. if none, then use text box for drop-downs?
                if (localStorage.speciesDomainValues) {
                    console.log('using offline storage to populate select menus');
                    that.populateSelect('species', JSON.parse(localStorage.speciesDomainValues));
                } else {
                    console.log('using hard-coded domains');
                    that.populateSelect('species', hardCodedSpecies);
                }
            }

            if (navigator.onLine && token) {
                var params = {
                    timeout: that.defaultXHRTimeout,
                    query: {
                        token: token,
                        f: 'json'
                    },
                    handleAs: 'json'
                };
                xhr.get(that.urls.mapService + '/FeatureServer/0', params).then(function (data) {
                    if (data.error) {
                        useLocal();
                    } else {
                        try {
                            var speciesDomainValues = that.getDomainValues(that.fieldNames.SPECIES, data);
                            that.populateSelect('species', speciesDomainValues);
                        } catch (er) {
                            useLocal();
                        }
                    }
                }, function () {
                    useLocal();
                });
            } else {
                useLocal();
            }

            this.domainsGot = true;
        },
        populateSelect: function (selectid, values) {
            // summary:
            //    adds options for each value to the select
            // selectid: String
            //      The id of the select element
            // values: []
            console.log('app/App:populateSelect', arguments);

            localStorage[selectid + 'DomainValues'] = JSON.stringify(values);

            var speciesSelect = dom.byId(selectid);
            values.forEach(function (value) {
                var o = domConstruct.create('option', {
                    value: value.code,
                    innerHTML: value.name
                });
                speciesSelect.add(o, null);
            }, this);
        },
        getDomainValues: function (fieldName, dataObject) {
            // summary:
            //    returns the list of names and codes for the given domain
            // fieldName: String
            // dataObject: Object
            // returns: []
            console.log('app/App:getDomainValues', arguments);

            var field;
            array.some(dataObject.fields, function (f) {
                if (f.name === fieldName) {
                    field = f;
                    return true;
                }
            });
            if (field.domain.codedValues.length > 0) {
                return field.domain.codedValues;
            } else {
                throw 'No coded values found!';
            }
        },
        wireEvents: function () {
            // summary:
            //      Wires all of the events
            console.log('app/App:wireEvents', arguments);

            var that = this;
            $('#xyphoidCheckbox').change(function () {
                if (this.checked) {
                    $('#xyphoidSlider').val(0).slider('refresh');
                    $('#xyphoidSlider').slider('disable');
                } else {
                    $('#xyphoidSlider').slider('enable');
                }
            });
            $('#cancel-btn').click(function () {
                that.clearForm();
            });
            $('#submit-btn').click(function () {
                that.onSubmitForm();
            });
            $('#submit-reports-btn').click(function () {
                that.submitLocallyStoredReports();
            });
            $('#species').change(function () {
                $('#speciesTxt').val('');
            });
            $('#speciesTxt').change(function () {
                dom.byId('species').selectedIndex = 0;
                $('#species').selectmenu('refresh');
            });
            $('#submit-location').click(function () {
                that.submitLocation();
            });
            $('#login-link').click(function () {
                $.mobile.changePage('#login', {
                    transition: 'slidedown',
                    role: 'dialog'
                });
            });
            $('#location-btn').click(function () {
                if (that.validateForm()) {
                    $.mobile.changePage('#location', {
                        transition: 'slidedown',
                        role: 'dialog'
                    });
                }
            });
            $('#send-diagnostics-btn').click(function () {
                that.sendDiagnostics();
            });
        },
        updateLocallyStoredReportsNumber: function () {
            // summary:
            //      Queries local storage for any reports and updates the number on the
            //      appropriate pages
            console.log('app/App:updateLocallyStoredReportsNumber', arguments);

            var num = (localStorage.reports) ? JSON.parse(localStorage.reports).length : 0;

            query('.num-reports').forEach(function (node) {
                node.innerHTML = num;
            });
            var btn = $('#submit-reports-btn');
            btn.button();
            if (num > 0) {
                btn.button('enable');
                query('.unsubmitted-reports').forEach(function (node) {
                    domClass.remove(node, 'hidden');
                });
            } else {
                btn.button('disable');
                query('.unsubmitted-reports').forEach(function (node) {
                    domClass.add(node, 'hidden');
                });
            }
        },
        clearForm: function () {
            // summary:
            //      Clears the form element values and refreshes the jquery.mobile
            //      plugins
            console.log('app/App:clearForm', arguments);

            var form = dom.byId('report-form');

            function resetSelector(selectorid) {
                form[selectorid].selectedIndex = 0;
            }

            resetSelector('species');
            $('select').selectmenu('refresh');

            $('input[type="radio"]').attr('checked', false).checkboxradio('refresh');
            $('[type|="radio"],[type|="checkbox"]').checkboxradio('refresh');
            $('input[type="text"],textarea, input[type="number"]').val('');
            $('#xyphoidSlider').val(0).slider('refresh').slider('disable');
            $('#xyphoidCheckbox').attr('checked', true).checkboxradio('refresh');
        },
        validateForm: function () {
            // summary:
            //      Validates the form to make sure that all required fields have
            //      valid values before submitting the form.
            // returns: Boolean
            console.log('app/App:validateForm', arguments);

            var form = dom.byId('report-form');

            // species
            if (form.species.value === this.tapToSelect && form.speciesTxt.value.length === 0) {
                alert('Please provide a species value');
                return false;
            }
            // gender
            if (this.getSelectedRadioValue(form.radioGender) === '') {
                alert('Please provide a gender value');
                return false;
            }
            // age class
            if (this.getSelectedRadioValue(form.radioAge) === '') {
                alert('Please provide an age class value');
                return false;
            }
            return true;
        },
        onSubmitForm: function () {
            // summary:
            //      Validates the location and form values and submits the form
            console.log('app/App:onSubmitForm', arguments);

            if (!this.validateForm()) {
                return;
            }

            $.mobile.loading('show', {
                text: 'submitting data...',
                textVisible: true
            });
            $('#submit-btn').disabled = true;

            var def = this.gpsController.getGeometry();

            var that = this;
            def.then((location) => {
                if (!location) {
                    $.mobile.loading('hide');
                    $.mobile.changePage('#location', {
                        transition: 'slidedown',
                        role: 'dialog'
                    });
                    return;
                } else {
                    that.submitForm(location);
                }
            });
        },
        submitForm: function (location, address) {
            // summary:
            //      Submits the data to the server or stores it
            //      locally for later retrieval.
            // location: {x, y, accuracy}
            // address: [optional]String
            console.log('app/App:submitForm', arguments);

            var that = this;

            var features;
            if (address) {
                features = this.buildFeatureObject(location, address);
            } else {
                features = this.buildFeatureObject(location);
            }

            var data = {
                f: 'json',
                features: JSON.stringify([features])
            };

            function onFailure() {
                that.storeDataOffline(features, that.offlineMsg);
                $('#submit-btn').disabled = false;
            }

            function onSuccess(response) {
                console.log('Success!', response);
                that.clearForm();
                domStyle.set('confirm-content', 'background', '#BDF9C8');
                dom.byId('confirm-msg').innerHTML = 'Your report was submitted successfully!';
                $.mobile.changePage('#confirm');

                var num = (localStorage.reports) ? JSON.parse(localStorage.reports).length : 0;
                if (num > 0) {
                    $.mobile.changePage('#offline-prompt', {
                        transition: 'slidedown',
                        role: 'dialog'
                    });
                }
                $('#submit-btn').disabled = false;
            }

            if (navigator.onLine) {
                if (!this.auth.isLoggedIn()) {
                    that.storeDataOffline(features, that.loggedOutMsg);
                } else {
                    this.sendDataToDatabase(data, onSuccess, onFailure);
                }
            } else {
                onFailure();
            }
        },
        buildFeatureObject: function (location, address) {
            // summary:
            //      Creates the feature object
            // location: {x, y, accuracy} // coordinates should be in web mercator
            // address: [optional]String

            // returns: {}
            console.log('app/App:buildFeatureObject', arguments);

            var form = dom.byId('report-form');

            var userid = this.auth.userId || 'none';

            var data = {
                attributes: {
                    REPORT_DATE: Date.now(),
                    SPECIES: (form.species.value === this.tapToSelect) ? form.speciesTxt.value : form.species.value,
                    GPS_ACCURACY: location.accuracy,
                    AGE_CLASS: this.getSelectedRadioValue(form.radioAge),
                    GENDER: this.getSelectedRadioValue(form.radioGender),
                    XYPHOID: form.xyphoidCheckbox.checked ? -999 : form.xyphoidSlider.value,
                    COMMENTS: form.comments.value,
                    RESPONDER_ID: userid,
                    TAG_COLLAR_NUM: form.collar.value
                },
                geometry: {
                    x: location.x,
                    y: location.y
                }
            };

            if (address) {
                data.attributes.ADDRESS = address;
            }
            // let the nightly script add route/milepost since the format is better.

            return data;
        },
        getSelectedRadioValue: function (buttonGroup) {
            // summary:
            //      Gets the value of the selected radio button in the group.
            // buttonGroup:[radioButtons]
            // returns: String
            //      Returns ' if no button is selected
            console.log('app/App:getSelectedRadioValue', arguments);

            function getSelectedRadio(buttonGroup) {
                // returns the array number of the selected radio button or -1 if no button is selected
                if (buttonGroup[0]) { // if the button group is an array (one button is not an array)
                    for (var i = 0; i < buttonGroup.length; i++) {
                        if (buttonGroup[i].checked) {
                            return i;
                        }
                    }
                } else {
                    if (buttonGroup.checked) {
                        return 0;
                    } // if the one button is checked, return zero
                }
                // if we get to this point, no radio button is selected
                return -1;
            }

            // returns the value of the selected radio button or ' if no button is selected
            var i = getSelectedRadio(buttonGroup);
            if (i === -1) {
                return '';
            } else {
                if (buttonGroup[i]) { // Make sure the button group is an array (not just one button)
                    return buttonGroup[i].value;
                } else { // The button group is just the one button, and it is checked
                    return buttonGroup.value;
                }
            }
        },
        sendDataToDatabase: function (data, onSuccess, onFailure) {
            // summary:
            //      Sends the data to the addFeatures web service after querying for regions and roads.
            // data: Object
            //      The data object used to send features to the server.
            // onSuccess: Function
            //      Fires when the reports are successfully submitted.
            // onFailure: Function
            //      Fires when there is an error.
            console.log('app/App:sendDataToDatabase', arguments);

            var that = this;
            var f = JSON.parse(data.features)[0];

            function submitReport() {
                console.log('Submit Report: ', data.features);
                data.features = JSON.stringify([f]);
                data.token = that.auth.token;

                var params = {
                    data: data,
                    handleAs: 'json',
                    headers: {
                        'X-Requested-With': ''
                    },
                    timeout: that.defaultXHRTimeout
                };

                xhr.post(that.urls.featureService + '/FeatureServer/0/addFeatures', params).then(function (response) {
                    $.mobile.loading('hide');
                    if (response.addResults && response.addResults[0].success) {
                        onSuccess(response);
                    } else {
                        console.log('Error!', response);
                        onFailure();
                    }
                }, function () {
                    onFailure();
                });
            }

            // populate responder_id
            if (f.attributes[this.fieldNames.RESPONDER_ID] === 'none') {
                if (this.auth.userId) {
                    f.attributes[this.fieldNames.RESPONDER_ID] = this.auth.userId;
                } else {
                    this.auth.getUserId(localStorage.email, function () {
                        this.sendDataToDatabase(data, onSuccess, onFailure);
                    });
                    return;
                }
            }

            submitReport();
        },
        storeDataOffline: function (feature, msg) {
            // summary:
            //      Stores the report data in localStorage for later submission
            // feature: Object
            //      The data object used to send features to the server.
            // msg: String
            //      The message displayed on the confirmation page.
            console.log('app/App:storeDataOffline', arguments);

            var reports = (localStorage.reports) ? JSON.parse(localStorage.reports) : [];

            reports.push(feature);

            localStorage.reports = JSON.stringify(reports);

            $.mobile.loading('hide');

            if (has('safari') || has('ios')) {
                msg += this.safariAdditionalOfflineMsg;
            }
            dom.byId('confirm-msg').innerHTML = msg;

            domStyle.set('confirm-content', 'background', '#fcf2bf');
            $.mobile.changePage('#confirm');

            this.updateLocallyStoredReportsNumber();

            this.clearForm();
        },
        submitLocallyStoredReports: function () {
            // summary:
            //      submits any locally stored reports to the server
            console.log('app/App:submitLocallyStoredReports', arguments);

            if (!navigator.onLine) {
                alert('You must be connected to the internet to submit reports!');
                return;
            }

            var that = this;

            $.mobile.loading('show', {
                text: 'submitting reports',
                textVisible: true
            });

            var reports = JSON.parse(localStorage.reports);

            var numReports = reports.length;

            function onFailure() {
                $.mobile.loading('hide');
                alert('There was a problem sending the data to the server. Please try again when you have a better network connection');
            }

            var submitReports;

            function submitReport(report) {
                // check to make sure that there is a valid value for RESPONDER_ID
                if (report.attributes[that.fieldNames.RESPONDER_ID] === 'none' ||
                    typeof report.attributes[that.fieldNames.RESPONDER_ID] === 'object') {
                    report.attributes[that.fieldNames.RESPONDER_ID] = that.auth.userId;
                }
                var data = {
                    f: 'json',
                    features: JSON.stringify([report])
                };
                that.sendDataToDatabase(data, function () {
                    reports.pop();
                    $.mobile.loading('show', {
                        text: numReports - reports.length + ' of ' + numReports + ' submitted',
                        textVisible: true
                    });
                    localStorage.reports = JSON.stringify(reports);
                    that.updateLocallyStoredReportsNumber();
                    submitReports();
                }, function () {
                    onFailure();
                });
            }

            submitReports = function () {
                if (reports.length > 0) {
                    var report = reports[reports.length - 1];
                    submitReport(report);
                } else {
                    $.mobile.loading('hide');

                    domStyle.set('confirm-content', 'background', '#A9E098');
                    dom.byId('confirm-msg').innerHTML = 'Your reports were submitted successfully!';
                    $.mobile.changePage('#confirm');
                }
            };

            if (!this.auth.isLoggedIn()) {
                that.auth.showLoginDialog(function () {
                    $.mobile.changePage('#queue', {
                        transition: 'slideup'
                    });
                    submitReports();
                }, function () {
                    $.mobile.loading('hide');
                    $.mobile.changePage('#queue', {
                        transition: 'slideup'
                    });
                });
                return;
            }

            submitReports();
        },
        submitLocation: function () {
            // summary:
            //      Fires when the user clicks the submit button on the location form.
            //      Validates that the user entered valid values for either lat/long or route/milepost
            //      Projects lat/long to UTM or stores route/milepost
            console.log('app/App:submitLocation', arguments);

            var that = this;
            var params;
            var data;

            // validate form
            var form = dom.byId('form-location');
            var lat = form.lat.valueAsNumber;
            var lng = form.lng.valueAsNumber;
            var route = form.route.value;
            var mp = form.milepost.value;
            var add = form.street.value;
            var zone = form.zone.value;

            if (lat && lng) {
                // make sure that lat and lng are in Utah (approx)
                if (lat < 36 || lat > 43) {
                    alert('Your latitude value is invalid!');
                } else if (lng < -114 || lng > -109) {
                    alert('Your longitude value is invalid!');
                    return;
                } else {
                    // project and store
                    const projectedCoords = this.gpsController.projectFromLatLng({
                        latitude: lat,
                        longitude: lng
                    });
                    this.submitForm({
                        x: projectedCoords[0],
                        y: projectedCoords[1],
                        accuracy: this.manualCoordsAccuracyCode
                    });
                }
            } else if (route && mp) {
                $.mobile.loading('show', {
                    text: 'matching route and milepost...',
                    textVisible: true
                });

                if (navigator.onLine) {
                    // try to hit locator
                    params = {
                        handleAs: 'json',
                        timeout: this.defaultXHRTimeout,
                        query: {
                            apiKey: this.apiKey,
                            spatialReference: 3857
                        },
                        headers: {
                            'X-Requested-With': ''
                        }
                    };
                    xhr.get(this.urls.locatorService + 'milepost/' + route + '/' + mp, params).then(function (response) {
                        console.log('match found.', response);

                        response.result.location.accuracy = that.addressMilepostAccuracyCode;

                        that.submitForm(response.result.location, response.result.MatchAddress);
                    }, function (er) {
                        console.log('problem with locator service', er);
                        $.mobile.loading('hide');
                        alert('No match found for that route and milepost. Please check your entries and try again.');
                    });
                } else {
                    // store data locally
                    data = that.buildFeatureObject('Route: ' + route + ', Milepost: ' + mp);
                    that.storeDataOffline(data, that.offlineMsg);
                }
            } else if (add && zone) {
                $.mobile.loading('show', {
                    text: 'matching address...',
                    textVisible: true
                });

                if (navigator.onLine) {
                    // try to hit locator
                    params = {
                        handleAs: 'json',
                        timeout: this.defaultXHRTimeout,
                        query: {
                            apiKey: this.apiKey,
                            spatialReference: 3857
                        },
                        headers: {
                            'X-Requested-With': ''
                        }
                    };
                    xhr.get(this.urls.locatorService + add + '/' + zone, params).then(function (response) {
                        console.log('match found.', response);

                        response.result.location.accuracy = that.addressMilepostAccuracyCode;

                        that.submitForm(response.result.location, response.result.MatchAddress);
                    }, function () {
                        $.mobile.loading('hide');
                        alert('No match found for that address. Please check your entries and try again.');
                    });
                } else {
                    // store data locally
                    data = that.buildFeatureObject(null, add + ', ' + zone);
                    that.storeDataOffline(data, that.offlineMsg);
                }
            } else {
                // display invalid message
                alert('You must input a valid combination of either lat/long, route/milepost, or street address.');
            }
        },
        sendDiagnostics: function () {
            // summary:
            //      Sends data to SendDiagnostics gp task.
            console.log('app/App:sendDiagnostics', arguments);

            var that = this;
            var msg = dom.byId('diagnostics-msg');

            if (!navigator.onLine) {
                alert('You must have a connection to the internet!');
            }

            $.mobile.loading('show', {
                text: 'submitting diagnostics...',
                textVisible: true
            });

            var url = that.urls.sendDiagnostics;
            var params = {
                data: {
                    username: localStorage.email || '',
                    unsubmittedReports: localStorage.reports || '',
                    platform: navigator.platform || '',
                    f: 'json'
                },
                timeout: this.defaultXHRTimeout,
                handleAs: 'json'
            };

            function onError() {
                $.mobile.loading('hide');
                msg.innerHTML = 'There was an error submitting diagnostics.';
            }

            function checkStatus(id) {
                xhr.get(url + '/jobs/' + id, {
                    timeout: that.defaultXHRTimeout,
                    handleAs: 'json',
                    query: {
                        f: 'json',
                        returnMessages: false,
                        token: that.auth.token
                    }
                }).then(function (response) {
                    console.log(response);
                    if (response.jobStatus === 'esriJobSucceeded') {
                        $.mobile.loading('hide');
                        msg.innerHTML = 'Diagnostics sent successfully!';
                    } else if (response.error || response.jobStatus === 'esriJobFailed') {
                        onError(response.error || response.jobStatus);
                    } else {
                        setTimeout(function () {
                            checkStatus(id);
                        }, 1000);
                    }
                }, function (er) {
                    onError(er);
                });
            }

            xhr.post(url + '/submitJob', params).then(function (response) {
                checkStatus(response.jobId);
            }, function (er) {
                onError(er);
            });
        }
    });
});
