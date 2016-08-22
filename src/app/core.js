define([
    'jquerymobile'
], function (

) {

});

// /*jslint sub:true*/
// /*global dojo, console, roadkillapp, window, google, confirm, roadkill, localStorage,
// $, alert, jQuery, agrc, ijit, navigator, setTimeout, document*/
// dojo.require("dojo.io.script");
// dojo.require("roadkill.gpsController");
// dojo.require("roadkill.authentication");
// dojo.require("js.libs.proj4js-compressed");
// dojo.require("data.species");
// dojo.require("dijit.form.Form");
// dojo.require("js.libs.jquery");
// dojo.require("js.libs.jquerymobile");
//
// var app;
//
// window.addEventListener('load', function(e) {
//     window.applicationCache.addEventListener("updateready", function(e) {
//         if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
//             console.log("new app cache downloaded");
//             // Browser downloaded a new app cache.
//             // Swap it in and reload the page to get the new version
//             window.applicationCache.swapCache();
//             if (confirm("A new version of this app is available. Please click OK to reload.")) {
//                 window.location.reload();
//             }
//         }
//     }, false);
// }, false);
//
// dojo.declare("roadkillapp", null, {
//     // summary:
//     //      The main object that controls the application
//
//     // version: String
//     version: "1.3.0",
//
//     // gpsController: GPSController
//     gpsController: null,
//
//     // fields: Object
//     fieldNames: {
//         // Reports feature class
//         REPORT_DATE: "REPORT_DATE",
//         SPECIES: "SPECIES",
//         GPS_ACCURACY: "GPS_ACCURACY",
//         AGE_CLASS: "AGE_CLASS",
//         GENDER: "GENDER",
//         XYPHOID: "XYPHOID",
//         COMMENTS: "COMMENTS",
//         RESPONDER_ID: "RESPONDER_ID",
//         UDOT_REGION: "UDOT_REGION",
//         UDWR_REGION: "UDWR_REGION",
//         HIGHWAY_ROAD: "HIGHWAY_ROAD",
//         ADDRESS: "ADDRESS",
//
//         // UDOT_Regions feature class
//         REGION: "REGION",
//
//         // Roads feature class
//         ALT_NAME: "ALT_NAME",
//         LABEL: "LABEL"
//     },
//
//     // defaultXHRTimeout: Number
//     defaultXHRTimeout: 120000,
//
//     // tapToSelect: String
//     //      The prompt text for drop downs
//     tapToSelect: "tap to select",
//
//     // auth: roadkill.auth
//     //      The authentication object
//     auth: null,
//
//     // domainsGot: Boolean
//     //      A switch to tell if the domains have been requested or not
//     domainsGot: false,
//
//     // offlineMsg: String
//     //      The message displayed on the confirmation page when a report is
//     //      stored offline due to a network connection problem.
//     offlineMsg: "There was no network connection available. Your report has been stored on your device and will be ready to submit when a network connection is present again.",
//
//     // loggedOutMsg: String
//     //      The message displayed on teh confirmation page when a report is
//     //      stored offline due to the user not being logged in.
//     loggedOutMsg: "Your report has been stored on your device because you are not logged in.",
//
//     // appName: String
//     //     Used in UserManagement service
//     appName: 'roadkill',
//
//     // roles: {}
//     //     The roles in the roadkill user database
//     roles: {
//         Admin: 'admin',
//         Submitter: 'submitter',
//         Viewer: 'viewer'
//     },
//
//     // urls: {}
//     //      All of the urls used in this app
//     urls: {
//         login: "/permissionproxy/api/authenticate/user",
//         register: '/permissionproxy/api/user/register',
//         mapService: '/ArcGIS/rest/services/Roadkill/MapService',
//         featureService: '/ArcGIS/rest/services/Roadkill/FeatureService',
//         sendDiagnostics: '/ArcGIS/rest/services/Roadkill/PublicToolbox/GPServer/SendDiagnostics'
//     },
//
//     constructor: function() {
//         // summary:
//         //      The first function to run
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//         app = this;
//
//         this.auth = new roadkill.auth();
//
//         this.gpsController = new roadkill.gpsController();
//
//         dojo.connect(this.auth, "logInSuccessful", this, function() {
//             this.getDomains(this.auth.token);
//         });
//         dojo.connect(this.auth, "logInUnsuccessful", this, "getDomains");
//
//         this.wireEvents();
//
//         this.updateLocallyStoredReportsNumber();
//
//         dojo.byId("version").innerHTML = "Version: " + this.version;
//
//         // turn off toolbar toggling
//         // $("[data-role=footer]").fixedtoolbar({
//         //  tapToggle: true
//         // });
//
//         // default transition set to slide
//
//     },
//     getDomains: function(token) {
//         // summary:
//         //      Gets the domains from the feature service and
//         //      updates the corresponding controls on the form
//         // token: String
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         if (this.domainsGot) {
//             return;
//         }
//
//         var that = this;
//
//         function useLocal() {
//             // use offline storage. if none, then use text box for drop-downs?
//             if (localStorage["speciesDomainValues"]) {
//                 console.log("using offline storage to populate select menus");
//                 that.populateSelect("species", dojo.fromJson(localStorage["speciesDomainValues"]));
//             } else {
//                 console.log("using hard-coded domains");
//                 that.populateSelect("species", roadkill.speciesDomainValues);
//             }
//         }
//
//         if (navigator.onLine && token) {
//             var params = {
//                 url: that.urls.mapService + "/FeatureServer/0/?f=pjson",
//                 callbackParamName: "callback",
//                 timeout: that.defaultXHRTimeout,
//                 content: {
//                     token: token
//                 }
//             };
//             dojo.io.script.get(params).then(function(data) {
//                 if (data.error) {
//                     useLocal();
//                 } else {
//                     try {
//                         var speciesDomainValues = that.getDomainValues(that.fieldNames.SPECIES, data);
//                         that.populateSelect("species", speciesDomainValues);
//                     } catch (er) {
//                         useLocal();
//                     }
//                 }
//             }, function(er) {
//                 useLocal();
//             });
//         } else {
//             useLocal();
//         }
//
//         this.domainsGot = true;
//     },
//     populateSelect: function(selectid, values) {
//         // summary:
//         //    adds options for each value to the select
//         // selectid: String
//         //      The id of the select element
//         // values: []
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         localStorage[selectid + "DomainValues"] = dojo.toJson(values);
//
//         var speciesSelect = dojo.byId(selectid);
//         dojo.forEach(values, function(value) {
//             var o = dojo.create('option', {
//                 value: value.code,
//                 innerHTML: value.name
//             });
//             speciesSelect.add(o, null);
//         }, this);
//     },
//     getDomainValues: function(fieldName, dataObject) {
//         // summary:
//         //    returns the list of names and codes for the given domain
//         // fieldName: String
//         // dataObject: Object
//         // returns: []
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var field;
//         dojo.some(dataObject.fields, function(f) {
//             if (f.name === fieldName) {
//                 field = f;
//                 return true;
//             }
//         });
//         if (field.domain.codedValues.length > 0) {
//             return field.domain.codedValues;
//         } else {
//             throw 'No coded values found!';
//         }
//     },
//     wireEvents: function() {
//         // summary:
//         //      Wires all of the events
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var that = this;
//         $("#xyphoidCheckbox").change(function() {
//             if (this.checked) {
//                 $("#xyphoidSlider").val(0).slider("refresh");
//                 $("#xyphoidSlider").slider("disable");
//             } else {
//                 $("#xyphoidSlider").slider("enable");
//             }
//         });
//         $("#cancel-btn").click(function() {
//             that.clearForm();
//         });
//         $("#submit-btn").click(function() {
//             that.onSubmitForm();
//         });
//         $("#submit-reports-btn").click(function() {
//             that.submitLocallyStoredReports();
//         });
//         $("#species").change(function() {
//             $("#speciesTxt").val("");
//         });
//         $("#speciesTxt").change(function() {
//             dojo.byId("species").selectedIndex = 0;
//             $("#species").selectmenu("refresh");
//         });
//         // var fired = false;
//         // $('#form').on('pageshow', function (event, ui){
//         // // $("#form").live("pageshow", function(event, ui) {
//         //  if (!fired) {
//         //      $("#xyphoidSlider").slider("disable");
//         //      fired = true;
//         //      $("select").selectmenu("refresh");
//         //  }
//         // });
//         $("#submit-location").click(function() {
//             that.submitLocation();
//         });
//         $("#login-link").click(function() {
//             $.mobile.changePage("#login", {
//                 transition: "slidedown",
//                 role: "dialog"
//             });
//         });
//         $('#location-btn').click(function() {
//             if (that.validateForm()) {
//                 $.mobile.changePage('#location', {
//                     transition: 'slidedown',
//                     role: 'dialog'
//                 });
//             }
//         });
//         $('#send-diagnostics-btn').click(function() {
//             that.sendDiagnostics();
//         });
//         $('#init-debug-btn').click(function() {
//             that.initDebugSession();
//         });
//     },
//     updateLocallyStoredReportsNumber: function() {
//         // summary:
//         //      Queries local storage for any reports and updates the number on the
//         //      appropriate pages
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var num = (localStorage.reports) ? dojo.fromJson(localStorage.reports).length : 0;
//
//         dojo.query(".num-reports").forEach(function(node) {
//             node.innerHTML = num;
//         });
//         var btn = $("#submit-reports-btn");
//         btn.button();
//         if (num > 0) {
//             btn.button("enable");
//             dojo.query(".unsubmitted-reports").forEach(function(node) {
//                 dojo.removeClass(node, "hidden");
//             });
//         } else {
//             btn.button("disable");
//             dojo.query(".unsubmitted-reports").forEach(function(node) {
//                 dojo.addClass(node, "hidden");
//             });
//         }
//     },
//     clearForm: function() {
//         // summary:
//         //      Clears the form element values and refreshes the jquery.mobile
//         //      plugins
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var form = dojo.byId("report-form");
//
//         function resetSelector(selectorid) {
//             form[selectorid].selectedIndex = 0;
//         }
//
//         resetSelector("species");
//         $("select").selectmenu("refresh");
//
//         $("input[type='radio']").attr("checked", false).checkboxradio("refresh");
//         $('[type|="radio"],[type|="checkbox"]').checkboxradio("refresh");
//         $("input[type='text'],textarea, input[type='number']").val("");
//         $("#xyphoidSlider").val(0).slider("refresh").slider("disable");
//         $("#xyphoidCheckbox").attr("checked", true).checkboxradio("refresh");
//     },
//     validateForm: function() {
//         // summary:
//         //      Validates the form to make sure that all required fields have
//         //      valid values before submitting the form.
//         // returns: Boolean
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var form = dojo.byId("report-form");
//
//         // species
//         if (form.species.value === this.tapToSelect && form.speciesTxt.value.length === 0) {
//             alert("Please provide a species value");
//             return false;
//         }
//         // gender
//         if (this.getSelectedRadioValue(form.radioGender) === "") {
//             alert("Please provide a gender value");
//             return false;
//         }
//         // age class
//         if (this.getSelectedRadioValue(form.radioAge) === "") {
//             alert("Please provide an age class value");
//             return false;
//         }
//         return true;
//     },
//     onSubmitForm: function() {
//         // summary:
//         //      Validates the location and form values and submits the form
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         if (!this.validateForm()) {
//             return;
//         }
//
//         $.mobile.loading('show', {
//             text: 'submitting data...',
//             textVisible: true
//         });
//         $("#submit-btn").disabled = true;
//
//         var def = this.gpsController.hasValidLocation();
//
//         var that = this;
//         def.then(function(isValid) {
//             if (!isValid) {
//                 $.mobile.loading('hide');
//                 $.mobile.changePage("#location", {
//                     transition: "slidedown",
//                     role: "dialog"
//                 });
//                 return;
//             } else {
//                 that.submitForm();
//             }
//         });
//     },
//     submitForm: function(routeMilepost, address) {
//         // summary:
//         //      Submits the data to the server or stores it
//         //      locally for later retrieval.
//         // routeMilepost: [optional]String
//         // address: [optional]String
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var that = this;
//
//         var features;
//         if (routeMilepost) {
//             features = this.buildFeatureObject(routeMilepost);
//         } else if (address) {
//             features = this.buildFeatureObject(null, address);
//         } else {
//             features = this.buildFeatureObject();
//         }
//
//         var data = {
//             f: "json",
//             features: dojo.toJson([features])
//         };
//
//         function onFailure() {
//             that.storeDataOffline(features, that.offlineMsg);
//             $("#submit-btn").disabled = false;
//         }
//
//         function onSuccess(response) {
//             console.log("Success!", response);
//             that.clearForm();
//             dojo.style("confirm-content", "background", "#BDF9C8");
//             dojo.byId("confirm-msg").innerHTML = "Your report was submitted successfully!";
//             $.mobile.changePage("#confirm");
//
//             var num = (localStorage.reports) ? dojo.fromJson(localStorage.reports).length : 0;
//             if (num > 0) {
//                 $.mobile.changePage("#offline-prompt", {
//                     transition: "slidedown",
//                     role: "dialog"
//                 });
//             }
//             $("#submit-btn").disabled = false;
//         }
//
//         if (navigator.onLine) {
//             if (!this.auth.isLoggedIn()) {
//                 that.storeDataOffline(features, that.loggedOutMsg);
//             } else {
//                 this.sendDataToDatabase(data, onSuccess, onFailure);
//             }
//         } else {
//             onFailure();
//         }
//     },
//     buildFeatureObject: function(routeMilepost, address) {
//         // summary:
//         //      Creates the feature object
//         // routeMilepost: [optional]String
//         // address: [optional]String
//         // returns: {}
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var form = dojo.byId("report-form");
//
//         var userid = this.auth.userId || "none";
//
//         var data = {
//             attributes: {
//                 REPORT_DATE: Date.now(),
//                 SPECIES: (form.species.value === this.tapToSelect) ? form.speciesTxt.value : form.species.value,
//                 GPS_ACCURACY: this.gpsController.accuracy + "",
//                 AGE_CLASS: this.getSelectedRadioValue(form.radioAge),
//                 GENDER: this.getSelectedRadioValue(form.radioGender),
//                 XYPHOID: form.xyphoidCheckbox.checked ? -999 : form.xyphoidSlider.value,
//                 COMMENTS: form.comments.value,
//                 RESPONDER_ID: userid,
//                 TAG_COLLAR_NUM: form.collar.value
//             },
//             geometry: this.gpsController.getGeometry()
//         };
//
//         if (address) {
//             data.attributes.ADDRESS = address;
//         }
//         // let the nightly script add route/milepost since the format is better.
//
//         return data;
//     },
//     getSelectedRadioValue: function(buttonGroup) {
//         // summary:
//         //      Gets the value of the selected radio button in the group.
//         // buttonGroup:[radioButtons]
//         // returns: String
//         //      Returns "" if no button is selected
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         function getSelectedRadio(buttonGroup) {
//             // returns the array number of the selected radio button or -1 if no button is selected
//             if (buttonGroup[0]) { // if the button group is an array (one button is not an array)
//                 for (var i = 0; i < buttonGroup.length; i++) {
//                     if (buttonGroup[i].checked) {
//                         return i;
//                     }
//                 }
//             } else {
//                 if (buttonGroup.checked) {
//                     return 0;
//                 } // if the one button is checked, return zero
//             }
//             // if we get to this point, no radio button is selected
//             return -1;
//         }
//
//         // returns the value of the selected radio button or "" if no button is selected
//         var i = getSelectedRadio(buttonGroup);
//         if (i == -1) {
//             return "";
//         } else {
//             if (buttonGroup[i]) { // Make sure the button group is an array (not just one button)
//                 return buttonGroup[i].value;
//             } else { // The button group is just the one button, and it is checked
//                 return buttonGroup.value;
//             }
//         }
//     },
//     sendDataToDatabase: function(data, onSuccess, onFailure) {
//         // summary:
//         //      Sends the data to the addFeatures web service after querying for regions and roads.
//         // data: Object
//         //      The data object used to send features to the server.
//         // onSuccess: Function
//         //      Fires when the reports are successfully submitted.
//         // onFailure: Function
//         //      Fires when there is an error.
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var that = this;
//         var f = dojo.fromJson(data.features)[0];
//
//         function SubmitReport() {
//             console.log("Submit Report: ", data.features);
//             data.features = dojo.toJson([f]);
//             data.token = that.auth.token;
//
//             var params = {
//                 url: that.urls.featureService + "/FeatureServer/0/addFeatures",
//                 content: data,
//                 handleAs: "json",
//                 callbackParamName: "callback",
//                 headers: {
//                     "X-Requested-With": ""
//                 },
//                 timeout: that.defaultXHRTimeout
//             };
//
//             dojo.xhrPost(params).then(function(response) {
//                 $.mobile.loading('hide');
//                 console.log(response);
//                 if (response.addResults && response.addResults[0].success) {
//                     onSuccess(response);
//                 } else {
//                     console.log("Error!", response);
//                     onFailure();
//                 }
//             }, function(e) {
//                 onFailure();
//             });
//         }
//
//         // populate responder_id
//         if (f.attributes[that.fieldNames.RESPONDER_ID] === "none") {
//             if (that.auth.userId) {
//                 f.attributes[that.fieldNames.RESPONDER_ID] = that.auth.userId;
//             } else {
//                 that.auth.getUserId(localStorage.email, function() {
//                     that.sendDataToDatabase(data, onSuccess, onFailure);
//                 });
//                 return;
//             }
//         }
//
//         SubmitReport();
//     },
//     storeDataOffline: function(feature, msg) {
//         // summary:
//         //      Stores the report data in localStorage for later submittion
//         // feature: Object
//         //      The data object used to send features to the server.
//         // msg: String
//         //      The message displayed on the confirmation page.
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         // $.mobile.loadingMessage = "No network available. Storing report locally.";
//
//         var reports = (localStorage.reports) ? dojo.fromJson(localStorage.reports) : [];
//
//         reports.push(feature);
//
//         localStorage.reports = dojo.toJson(reports);
//
//         $.mobile.loading('hide');
//
//         dojo.byId("confirm-msg").innerHTML = msg;
//
//         dojo.style("confirm-content", "background", "#fcf2bf");
//         $.mobile.changePage("#confirm");
//
//         this.updateLocallyStoredReportsNumber();
//
//         this.clearForm();
//     },
//     submitLocallyStoredReports: function() {
//         // summary:
//         //      submits any locally stored reports to the server
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         if (!navigator.onLine) {
//             alert('You must be connected to the internet to submit reports!');
//             return;
//         }
//
//         var that = this;
//
//         $.mobile.loading('show', {
//             text: "submitting reports",
//             textVisible: true
//         });
//
//         var reports = dojo.fromJson(localStorage.reports);
//
//         var numReports = reports.length;
//
//         function onFailure() {
//             $.mobile.loading('hide');
//             alert("There was a problem sending the data to the server. Please try again when you have a better network connection");
//         }
//
//         var submitReports;
//
//         function submitReport(report) {
//             // check to make sure that there is a valid value for RESPONDER_ID
//             if (report.attributes[that.fieldNames.RESPONDER_ID] === 'none' ||
//                 typeof report.attributes[that.fieldNames.RESPONDER_ID] == 'object') {
//                 report.attributes[that.fieldNames.RESPONDER_ID] = that.auth.userId;
//             }
//             var data = {
//                 f: "json",
//                 features: dojo.toJson([report])
//             };
//             that.sendDataToDatabase(data, function() {
//                 reports.pop();
//                 $.mobile.loading('show', {
//                     text: numReports - reports.length + " of " + numReports + " submitted",
//                     textVisible: true
//                 });
//                 localStorage.reports = dojo.toJson(reports);
//                 that.updateLocallyStoredReportsNumber();
//                 submitReports();
//             }, function() {
//                 onFailure();
//             });
//         }
//
//         submitReports = function() {
//             if (reports.length > 0) {
//                 var report = reports[reports.length - 1];
//                 submitReport(report);
//             } else {
//                 $.mobile.loading('hide');
//
//                 dojo.style("confirm-content", "background", "#A9E098");
//                 dojo.byId("confirm-msg").innerHTML = "Your reports were submitted successfully!";
//                 $.mobile.changePage("#confirm");
//             }
//         };
//
//         if (!this.auth.isLoggedIn()) {
//             that.auth.showLoginDialog(function() {
//                 $.mobile.changePage("#queue", {
//                     transition: "slideup"
//                 });
//                 submitReports();
//             }, function() {
//                 $.mobile.loading('hide');
//                 $.mobile.changePage("#queue", {
//                     transition: "slideup"
//                 });
//             });
//             return;
//         }
//
//         submitReports();
//     },
//     submitLocation: function() {
//         // summary:
//         //      Fires when the user clicks the submit button on the location form.
//         //      Validates that the user entered valid values for either lat/long or route/milepost
//         //      Projects lat/long to UTM or stores route/milepost
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var that = this;
//         var params, data;
//
//         // validate form
//         var form = dojo.byId("form-location");
//         var lat = form.lat.valueAsNumber;
//         var lng = form.lng.valueAsNumber;
//         var route = form.route.value;
//         var mp = form.milepost.value;
//         var add = form.street.value;
//         var zone = form.zone.value;
//
//         if (lat && lng) {
//             // make sure that lat and lng are in Utah (approx)
//             if (lat < 36 || lat > 43) {
//                 alert("Your latitude value is invalid!");
//             } else if (lng < -114 || lng > -109) {
//                 alert("Your longitude value is invalid!");
//                 return;
//             } else {
//                 // project and store
//                 this.gpsController.processPosition({
//                     coords: {
//                         latitude: lat,
//                         longitude: lng,
//                         accuracy: -1
//                     }
//                 }, true);
//                 this.submitForm();
//             }
//         } else if (route && mp) {
//             $.mobile.loading('show', {
//                 text: "matching route and milepost...",
//                 textVisible: true
//             });
//
//             if (navigator.onLine) {
//                 // try to hit locator
//                 params = {
//                     url: this.locatorServiceUrl + mp + ")zone(" + route + ")",
//                     callbackParamName: "callback",
//                     handleAs: "json",
//                     timeout: this.defaultXHRTimeout,
//                     preventCache: true
//                 };
//                 dojo.io.script.get(params).then(function(result) {
//                     console.log("match found.", result);
//
//                     that.gpsController.setUTMPoint(result);
//
//                     that.submitForm(result.MatchAddress);
//                 }, function(er) {
//                     console.log("problem with locator service", er);
//                     $.mobile.loading('hide');
//                     alert("No match found for that route and milepost. Please check your entries and try again.");
//                 });
//             } else {
//                 // store data locally
//                 data = that.buildFeatureObject("Route: " + route + ", Milepost: " + mp);
//                 that.storeDataOffline(data, that.offlineMsg);
//             }
//         } else if (add && zone) {
//             $.mobile.loading('show', {
//                 text: "matching address...",
//                 textVisible: true
//             });
//
//             if (navigator.onLine) {
//                 // try to hit locator
//                 params = {
//                     url: this.locatorServiceUrl + add + ")zone(" + zone + ")",
//                     callbackParamName: "callback",
//                     handleAs: "json",
//                     timeout: this.defaultXHRTimeout,
//                     preventCache: true
//                 };
//                 dojo.io.script.get(params).then(function(result) {
//                     console.log("match found.", result);
//
//                     that.gpsController.setUTMPoint(result);
//
//                     that.submitForm(null, result.MatchAddress);
//                 }, function(er) {
//                     $.mobile.loading('hide');
//                     alert("No match found for that address. Please check your entries and try again.");
//                 });
//             } else {
//                 // store data locally
//                 data = that.buildFeatureObject(null, add + ", " + zone);
//                 that.storeDataOffline(data, that.offlineMsg);
//             }
//         } else {
//             // display invalid message
//             alert("You must input a valid combination of either lat/long, route/milepost, or street address.");
//         }
//     },
//     sendDiagnostics: function() {
//         // summary:
//         //      Sends data to SendDiagnostics gp task.
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var that = this,
//             msg = dojo.byId('diagnostics-msg');
//
//         if (!navigator.onLine) {
//             alert('You must have a connection to the internet!');
//         }
//
//         $.mobile.loading('show', {
//             text: "submitting diagnostics...",
//             textVisible: true
//         });
//
//         var url = that.urls.sendDiagnostics;
//         var params = {
//             url: url + '/submitJob',
//             content: {
//                 username: localStorage.email || '',
//                 unsubmittedReports: localStorage.reports || '',
//                 platform: navigator.platform || '',
//                 f: 'json'
//             },
//             timeout: this.defaultXHRTimeout,
//             handleAs: 'json'
//         };
//
//         function onError(er) {
//             $.mobile.loading('hide');
//             msg.innerHTML = 'There was an error submitting diagnostics.';
//         }
//
//         function checkStatus(id) {
//             dojo.xhrGet({
//                 url: url + '/jobs/' + id,
//                 timeout: that.defaultXHRTimeout,
//                 handleAs: 'json',
//                 content: {
//                     f: 'json',
//                     returnMessages: false,
//                     token: that.auth.token
//                 }
//             }).then(function(response) {
//                 console.log(response);
//                 if (response.jobStatus === 'esriJobSucceeded') {
//                     $.mobile.loading('hide');
//                     msg.innerHTML = 'Diagnostics sent successfully!';
//                 } else if (response.error || response.jobStatus === 'esriJobFailed') {
//                     onError(response.error || response.jobStatus);
//                 } else {
//                     setTimeout(function() {
//                         checkStatus(id);
//                     }, 1000);
//                 }
//             }, function(er) {
//                 onError(er);
//             });
//         }
//
//         dojo.xhrPost(params).then(function(response) {
//             checkStatus(response.jobId);
//         }, function(er) {
//             onError(er);
//         });
//     },
//     initDebugSession: function() {
//         // summary:
//         //      injects the weinre script (dagrc.utah.gov:8080) into the page
//         console.log(this.declaredClass + "::" + arguments.callee.nom, arguments);
//
//         var head = document.getElementsByTagName("head").item(0);
//         var script = document.createElement("script");
//         script.type = "text/javascript";
//         script.src = 'http://debug.phonegap.com/target/target-script-min.js#roadkillreporter';
//         head.appendChild(script);
//     }
// });
//
// dojo.ready(function() {
//     app = new roadkillapp();
//     // window.setTimeout(function() {
//     //  var parameter = "bmb=1";
//     //  var bubble = new google.bookmarkbubble.Bubble();
//
//     //  bubble.hasHashParameter = function() {
//     //      return window.location.hash.indexOf(parameter) != -1;
//     //  };
//     //  bubble.setHashParameter = function() {
//     //      if (!this.hasHashParameter()) {
//     //          window.localStorage += parameter;
//     //      }
//     //  };
//     //  bubble.showIfAllowed();
//     // }, 3000);
// });
