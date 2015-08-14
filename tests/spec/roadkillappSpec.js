var testObject1;
var testFeatureServiceLayerData = {
	fields: [{
		"name": "OBJECTID",
		"type": "esriFieldTypeOID",
		"alias": "OBJECTID",
		"editable": false,
		"domain": null
	}, {
		"name": "REPORT_DATE",
		"type": "esriFieldTypeDate",
		"alias": "Date",
		"editable": true,
		"length": 36,
		"domain": null
	}, {
		"name": "SPECIES",
		"type": "esriFieldTypeString",
		"alias": "SPECIES",
		"editable": true,
		"length": 50,
		"domain": {
			"type": "codedValue",
			"name": "roadkill_species",
			"codedValues": [{
				"name": "Deer",
				"code": "Deer"
			}, {
				"name": "Elk",
				"code": "Elk"
			}, {
				"name": "Moose",
				"code": "Moose"
			}, {
				"name": "Pronghorn",
				"code": "Pronghorn"
			}]
		}
	}]
};
var testExpectedCodedValues = [{
	"name": "Deer",
	"code": "Deer"
}, {
	"name": "Elk",
	"code": "Elk"
}, {
	"name": "Moose",
	"code": "Moose"
}, {
	"name": "Pronghorn",
	"code": "Pronghorn"
}];

beforeEach(function(){
	testObject1 = new roadkillapp();
});
afterEach(function(){
	testObject1 = null;
});

describe("roadkillapp object", function() {
	describe("getDomainValues", function() {
		it("should return the correct list of values", function() {
			expect(testObject1.getDomainValues("SPECIES", testFeatureServiceLayerData)).toEqual(testExpectedCodedValues);
		});
	});
	describe("populateSelect", function() {
		it("should create the appropriate number of options", function() {
			var select = dojo.create("select", {
				id: "test-select"
			}, dojo.body());
			
			testObject1.populateSelect("test-select", testExpectedCodedValues);
			
			expect(select.options.length).toEqual(4);
			
			dojo.destroy(select);
		});
	});
});
