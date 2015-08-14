var testObject2;
beforeEach(function() {
	testObject2 = new roadkill.gpsController();
	spyOn(testObject2, "processPosition").andCallThrough();
});
afterEach(function() {
	testObject2 = null;
});
describe("GPSController", function() {
	describe("constructor", function() {
		it("constructor should create valid Proj4js Proj objects", function() {
			waitsFor(function() {
				return testObject2.srcProj.readyToUse && testObject2.destProj.readyToUse;
			});
			runs(function() {
				expect(testObject2.srcProj.datumCode).toEqual("WGS84");
				expect(testObject2.destProj.srsCode).toEqual("EPSG:26912");
			});
		});
	});
	
	it("processPosition should project to the appropriate utm coords and update the properties", function() {
		var testPoint = {
			coords: {
				longitude: -111.891047,
				latitude: 40.760779,
				accuracy: 22000
			}
		}
		testObject2.processPosition(testPoint);
		var utmPoint = {
			x: 424790.8420810478,
			y: 4512583.658118795,
			accuracy: 22000
		};
		expect({
			x: testObject2.x,
			y: testObject2.y,
			accuracy: testObject2.accuracy
		}).toEqual(utmPoint);
	});
});