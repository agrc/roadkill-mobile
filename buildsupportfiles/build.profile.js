dependencies = {
	cssOptimize: "comments",
	optimize: "shrinksafe",
	layerOptimize: "shrinksafe",
	action: "clean,release",
	version: "1.6.1",
	internStrings: true,
	mini: true,
	stripConsole: "all",
	releaseName: "RoadkillReporter_Mobile",
    localeList: 'en-us',
	layers: [
		{
			name: "../roadkill/roadkill.js",
			dependencies: [
				"js.core"
			]
		},
		{
			name: "../roadkill/otherDojoStuff.js",
			dependencies: [
				"dojo.number",
				"dojo.io.script",
				'dojox.validate.web',
				'dijit.form.Form'
			]
		}
	],
	prefixes: [
		["css", "Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/css"],
		["data", "Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/data"],
		["images", "Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/images"],
		["js", "Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/js"],
		["roadkill", "Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/roadkill"],
		["dijit", "../dijit"],
		["dojox", "../dojox"],
		['agrc', 'Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/agrc'],
		['ijit', 'Z:/Documents/Projects/RoadkillReporter_Mobile/trunk/ijit']
	]
};