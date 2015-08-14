/*global dojo, describe, beforeEach, afterEach, it, expect, spyOn, waits, waitsFor, runs, localStorage, roadkill*/
describe("authentication.js", function() {
	var testObject;
	afterEach(function() {
		testObject = null;
		localStorage.clear();
	});
	it("isLoggedIn should return the appropriate value - no localStorage value", function() {
		testObject = new roadkill.auth();

		expect(testObject.isLoggedIn()).toBeFalsy();
	});
	it("isLoggedIn should return the appropriate value - false localStorage value", function() {
		localStorage.authenticated = false;
		testObject = new roadkill.auth();

		expect(testObject.isLoggedIn()).toBeFalsy();
	});
	describe("validateRegisterForm", function() {
		var form;

		beforeEach(function() {
			testObject = new roadkill.auth();
			
			form = dojo.byId("register-form");
			form.fName.value = "";
			form.lName.value = "";
			form.agency.value = "";
			form.email.value = "";
			form.verifyEmail.value = "";
			form.pass.value = "";
			form.verifyPass.value = "";
			
			spyOn(testObject, 'validatePasswordRequirements').andReturn(true);
			
			spyOn(window, "alert");
		});
		
		it("should only alert once - email only", function(){
			form.email.value = "email";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert.callCount).toEqual(1);
		});
		it("should only alert once - mismatches", function(){
			form.fName.value = "a";
			form.lName.value = "a";
			form.agency.value = "a";
			form.email.value = "a";
			form.verifyEmail.value = "b";
			form.pass.value = "a";
			form.verifyPass.value = "b";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert.callCount).toEqual(1);
		});
		it("should require every field to be populated", function(){
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("First Name is required.");
			
			form.fName.value = "Scott";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("Last Name is required.");
			
			form.lName.value = "Davis";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("Agency is required.");
			
			form.agency.value = "AGRC";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("Email is required.");
			
			form.pass.value = "password";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("Email is required.");
			
			expect(testObject.validateRegisterForm(form)).toEqual(false);
			
			form.email.value = "scott.sheri@gmail.com";
			form.verifyEmail.value = "scott.sheri@gmail.com";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith("Verify Password is required.");
			
			form.verifyPass.value = "password";
			
			expect(testObject.validateRegisterForm(form)).toEqual(true);
		});
		it("should make sure that the passwords and emails match with their verifies", function(){
			form.fName.value = "Scott";
			form.lName.value = "Davis";
			form.agency.value = "AGRC";
			form.email.value = "test";
			form.verifyEmail.value = "test1";
			form.pass.value = "pass";
			form.verifyPass.value = "pass1";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith('Verify Email does not match Email');
			expect(testObject.validateRegisterForm(form)).toEqual(false);
			
			form.verifyEmail.value = "test";
			
			testObject.validateRegisterForm(form);
			
			expect(window.alert).toHaveBeenCalledWith('Verify Password does not match Password');
			expect(testObject.validateRegisterForm(form)).toEqual(false);
			
			form.verifyPass.value = "pass";
			
			expect(testObject.validateRegisterForm(form)).toEqual(true);
		});
	});
	describe("validatePasswordRequirements", function(){
		beforeEach(function() {
			testObject = new roadkill.auth();
			spyOn(window, 'alert');
		});
		
		it("should require the length to be 7 or greater", function(){
			var result = testObject.validatePasswordRequirements('123456');
			
			expect(window.alert).toHaveBeenCalledWith('Password must be at least 7 characters.');
			expect(result).toEqual(false);
		});
		it("should require at least one non-alphanumeric character", function(){
			var result = testObject.validatePasswordRequirements('abcdefg');
			
			expect(window.alert).toHaveBeenCalledWith('Password must have at least one non-alphanumeric character.');
			expect(result).toEqual(false);
			
			result = testObject.validatePasswordRequirements('abcdefg!');
			expect(result).toEqual(true);
			result = testObject.validatePasswordRequirements('abc@defg');
			expect(result).toEqual(true);
			result = testObject.validatePasswordRequirements('%abcdefgg');
			expect(result).toEqual(true);
		});
	});
});
