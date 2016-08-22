/*jslint sub:true*/
/*global dojo, $, console, roadkill, localStorage, alert, app, dojox, document, navigator*/
dojo.provide("roadkill.authentication");

dojo.require("dojox.validate.web");

roadkill.auth = function() {
    // summary:
    //      This object is in charge of authenticating the user and
    //      disabling/enabling the appropriate functionality.
    var that = this;
    var token, userId;
    var onLoginSuccess, onLoginFailure;
    var successMsg = 'Your registration has been successfully submitted to the administrator for approval. You should expect to recieve an email response within the next 2 business days.';
    var failMsg = 'There was a problem with your registration submission: ';

    that.isLoggedIn = function() {
        // summary:
        //      checks for a token
        // returns: Boolean
        console.info("auth.isLoggedIn", arguments);
        console.info('token: ' + that.token);

        if (that.token) {
            return true;
        } else {
            return false;
        }
    };
    that.refreshHomeLinks = function() {
        // summary:
        //      shows/hides the appropriate links depending on isLoggedIn()
        console.info("auth.refreshHomeLinks", arguments);

        if (that.isLoggedIn()) {
            dojo.removeClass(dojo.byId("logout-div"), "hidden");
            dojo.addClass(dojo.byId("register-link"), "hidden");
            dojo.addClass(dojo.byId("creds-note"), "hidden");
            dojo.addClass(dojo.byId("login-link"), "hidden");
        } else {
            dojo.addClass(dojo.byId("logout-div"), "hidden");
            dojo.removeClass(dojo.byId("register-link"), "hidden");
            dojo.removeClass(dojo.byId("creds-note"), "hidden");
            dojo.removeClass(dojo.byId("login-link"), "hidden");
        }

        // $.mobile.fixedToolbars.show();
    };
    that.logOut = function() {
        // summary:
        //      clears the auth property and refreshes the list items on home page
        console.info("auth.logOut", arguments);
        delete that.token;
        delete that.userId;

        localStorage.removeItem("email");
        localStorage.removeItem("pass");

        that.refreshHomeLinks();
    };
    that.onLogInBtnClick = function() {
        // summary:
        //      Fires when the user clicks the log in btn
        console.info("auth.onLogInBtnClick", arguments);

        var form = dojo.byId("login-form");
        var email = form.loginEmail.value;
        var pass = form.password.value;

        if (email.length === 0) {
            alert("Please provide an email address");
            return;
        }
        if (pass.length === 0) {
            alert("Please provide a password");
            return;
        }

        if (!onLoginSuccess) {
            onLoginSuccess = function() {
                $.mobile.changePage("#home");
            };
        }

        that.logIn(email, pass, onLoginSuccess);
        onLoginSuccess = null;
    };
    that.logIn = function(email, pass, onSuccess) {
        // summary:
        //      Logs the user into the app and gets a token from the server
        // email: String
        // pass: String
        // onSuccess: function
        console.info("auth.logIn", arguments);

        $.mobile.loading('show', {
            text: "logging in...",
            textVisible: true
        });

        // store locally so that the user does not have to enter them every time
        localStorage.email = email;
        localStorage.pass = pass;

        var data = {
            email: email,
            password: pass,
            application: app.appName
        };
        var params = {
            url: app.urls.login,
            timeout: app.defaultXHRTimeout,
            content: data,
            handleAs: "json"
        };
        dojo.xhrPost(params).then(function(response) {
            if (response.status && response.status !== 200) {
                alert(response.message);
                $.mobile.loading('hide');
            } else if (response.result.token) {
                that.token = response.result.token.token;
                that.userId = '{' + response.result.user.userId + '}';

                $.mobile.loading('hide');

                if (response.result.user.role === app.roles.Admin ||
                    response.result.user.role === app.roles.Submitter) {
                    onSuccess();

                    that.logInSuccessful();
                } else {
                    alert('You do not have the appropriate role to submit reports. Please contact the admin to make sure that you are assigned the correct role.');
                    that.logInUnsuccessful();
                }
            } else {
                alert("There was a problem logging in.");
                that.logInUnsuccessful();
            }
        }, function(e) {
            alert("There was a problem logging in. Please make sure that you have a connection to the internet.");
            that.logInUnsuccessful();
        });
    };
    that.wireEvents = function() {
        // summary:
        //      Wires the events
        console.info("auth.wireEvents", arguments);

        $('#home').on('pageshow', that.refreshHomeLinks);
        // $("#home").live("pageshow", that.refreshHomeLinks);
        $("#logout-btn").click(that.logOut);
        $("#login-btn").click(that.onLogInBtnClick);
        $("#login-cancel-btn").click(that.onLogInCancelBtnClick);
        $("#register-btn").click(that.onRegisterBtnClick);
    };
    that.showLoginDialog = function(onSuccess, onFailure) {
        // summary:
        //      Drops down the log in dialog
        // onSuccess: function
        //      Function to fire when the user has successfully logged in
        // onFailure: function
        console.info("auth.showLoginDialog", arguments);

        $.mobile.changePage("#login", {
            transition: "slidedown",
            role: "dialog"
        });
        onLoginSuccess = onSuccess;
        onLoginFailure = onFailure;
    };
    that.onLogInCancelBtnClick = function() {
        // summary:
        //      Fires when the cancel button is clicked on the login dialog
        console.info("auth.onLogInCancelBtnClick", arguments);

        if (!onLoginFailure) {
            $.mobile.changePage("#home");
        } else {
            onLoginFailure();
        }
    };
    that.logInSuccessful = function() {
        // summary:
        //      something for other objects to bind to
        console.info("auth:logInSuccessful", arguments);
    };
    that.logInUnsuccessful = function() {
        // summary:
        //      something for other object to bind to
        console.info("auth:logInSuccessful", arguments);

        $.mobile.loading('hide');
    };
    that.onRegisterBtnClick = function() {
        // summary:
        //      validates the form and submits it to the web service
        console.info("auth.onRegisterBtnClick", arguments);

        var form = dojo.byId("register-form");

        if (that.validateRegisterForm(form)) {
            $.mobile.loading('show', {
                text: "submitting registration",
                textVisible: true
            });
            // send data to service
            var content = {
                first: form.fName.value,
                last: form.lName.value,
                agency: form.agency.value,
                email: form.email.value,
                password: form.pass.value,
                application: app.appName
            };
            var params = {
                url: app.urls.register,
                handleAs: 'json',
                postData: JSON.stringify(content),
                headers: {
                    'Content-Type': 'application/json'
                },
                load: that.onNewUserServiceReturn,
                'error': function(status) {
                    console.error(status);
                    alert('There was an error sending your data to the server!\n' + status.message);
                    $.mobile.loading('hide');
                }
            };
            dojo.xhrPost(params);
        }
    };
    that.onNewUserServiceReturn = function(response) {
        // summary:
        //      Handles the callback from the new user registration service
        // response: {Message: <number(see roadkill.auth.newUserMessages)>, Status: <number>}
        console.info("auth:onNewUserServiceReturn", arguments);

        $.mobile.loading('hide');
        var txt = dojo.byId('register-confirm-msg');
        var btn = dojo.byId('register-confirm-ok');
        // if (response.Status === 200) {
            txt.innerHTML = successMsg;
            btn.href = "#home";
        // } else {
        //     txt.innerHTML = failMsg + roadkill.auth.newUserMessages[response.Message];
        //     btn.href = "#register";
        // }
        $.mobile.changePage("#register-confirm", {
            transition: "slidedown",
            role: "dialog"
        });
    };
    that.validateRegisterForm = function(form) {
        // summary:
        //      validates the form and returns a boolean
        // returns: Boolean
        console.info("auth:validateRegisterForm", arguments);

        var values = [
            ["First Name", form.fName.value],
            ["Last Name", form.lName.value],
            ["Agency", form.agency.value],
            ["Email", form.email.value],
            ["Verify Email", form.verifyEmail.value],
            ["Password", form.pass.value],
            ["Verify Password", form.verifyPass.value]
        ];

        function checkForSomething(name, value) {
            if (value === "" || value === undefined) {
                alert(name + " is required.");
                return false;
            } else {
                return true;
            }
        }

        function checkForMatch(value1, value2) {
            var match = value1[1] === value2[1];
            if (!match) {
                alert(value1[0] + " does not match " + value2[0]);
                return false;
            } else {
                return true;
            }
        }

        var somethingResult = dojo.every(values, function(v) {
            return checkForSomething(v[0], v[1]);
        });
        if (!somethingResult) {
            return false;
        }

        var matchResult = checkForMatch(values[4], values[3]) && checkForMatch(values[6], values[5]);
        if (!matchResult) {
            return false;
        }

        if (!dojox.validate.isEmailAddress(form.email.value)) {
            alert("Your email address does not appear to be valid!");
            return false;
        }

        if (!that.validatePasswordRequirements(form.pass.value)) {
            return false;
        }

        return true;
    };
    that.validatePasswordRequirements = function(password) {
        // summary:
        //      Makes sure that the password meets all of the requirements defined in the web.config
        //      for server.
        // password: String
        // returns: Boolean
        console.info("auth:validatePasswordRequirement", arguments);

        // if (password.length < 7) {
        //     alert('Password must be at least 7 characters.');
        //     return false;
        // }

        // var reg = /\W/;
        // if (!password.match(reg)) {
        //     alert('Password must have at least one non-alphanumeric character.');
        //     return false;
        // }

        return true;
    };

    if (localStorage.email && localStorage.pass && navigator.onLine) {
        that.logIn(localStorage.email, localStorage.pass, function() {
            that.refreshHomeLinks();
        });
    } else {
        that.refreshHomeLinks();
        app.getDomains(that.token);
    }

    that.wireEvents();
};
