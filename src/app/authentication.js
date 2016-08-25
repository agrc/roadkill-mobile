define([
    'dojo/dom',
    'dojo/dom-class',
    'dojo/Evented',
    'dojo/request/xhr',
    'dojo/_base/array',
    'dojo/_base/declare',
    'dojo/_base/lang',

    'dojox/validate/web'
], function (
    dom,
    domClass,
    Evented,
    xhr,
    array,
    declare,
    lang,

    validate
) {
    return declare([Evented], {
        // summary:
        //      This object is in charge of authenticating the user and
        //      disabling/enabling the appropriate functionality.

        // successMsg: string
        successMsg: 'Your registration has been successfully submitted to the administrator for approval. You should expect to recieve an email response within the next 2 business days.',


        // params passed into the constructor

        // app: app/App
        app: null,

        constructor: function (app) {
            console.log('module.id:constructor', arguments);

            this.app = app;

            if (localStorage.email && localStorage.pass && navigator.onLine) {
                this.logIn(localStorage.email, localStorage.pass);
            } else {
                this.refreshHomeLinks();
                app.getDomains(this.token);
            }

            this.wireEvents();
        },
        isLoggedIn: function () {
            // summary:
            //      checks for a token
            // returns: Boolean
            console.log('app/Authentication:isLoggedIn', arguments);

            if (this.token) {
                return true;
            } else {
                return false;
            }
        },
        refreshHomeLinks: function () {
            // summary:
            //      shows/hides the appropriate links depending on isLoggedIn()
            console.log('app/Authentication:refreshHomeLinks', arguments);

            if (this.isLoggedIn()) {
                domClass.remove(dom.byId('logout-div'), 'hidden');
                domClass.add(dom.byId('register-link'), 'hidden');
                domClass.add(dom.byId('creds-note'), 'hidden');
                domClass.add(dom.byId('login-link'), 'hidden');
            } else {
                domClass.add(dom.byId('logout-div'), 'hidden');
                domClass.remove(dom.byId('register-link'), 'hidden');
                domClass.remove(dom.byId('creds-note'), 'hidden');
                domClass.remove(dom.byId('login-link'), 'hidden');
            }
        },
        logOut: function () {
            // summary:
            //      clears the auth property and refreshes the list items on home page
            console.log('app/Authentication:logOut', arguments);
            delete this.token;
            delete this.userId;

            localStorage.removeItem('email');
            localStorage.removeItem('pass');

            this.refreshHomeLinks();
        },
        onLogInBtnClick: function () {
            // summary:
            //      Fires when the user clicks the log in btn
            console.log('app/Authentication:onLogInBtnClick', arguments);

            var form = dom.byId('login-form');
            var email = form.loginEmail.value;
            var pass = form.password.value;

            if (email.length === 0) {
                alert('Please provide an email address');
                return;
            }
            if (pass.length === 0) {
                alert('Please provide a password');
                return;
            }

            this.logIn(email, pass, function () {
                $.mobile.changePage('#home');
            });
        },
        logIn: function (email, pass, onSuccess) {
            // summary:
            //      Logs the user into the app and gets a token from the server
            // email: String
            // pass: String
            // onSuccess: function
            console.log('app/Authentication:logIn', arguments);

            $.mobile.loading('show', {
                text: 'logging in...',
                textVisible: true
            });

            // store locally so that the user does not have to enter them every time
            localStorage.email = email;
            localStorage.pass = pass;

            var data = {
                email: email,
                password: pass,
                application: this.app.appName
            };
            var params = {
                timeout: this.app.defaultXHRTimeout,
                data: data,
                handleAs: 'json'
            };
            var that = this;
            xhr.post(this.app.urls.login, params).then(function (response) {
                if (response.status && response.status !== 200) {
                    alert(response.message);
                    $.mobile.loading('hide');
                } else if (response.result.token) {
                    that.token = response.result.token.token;
                    that.userId = '{' + response.result.user.userId + '}';

                    $.mobile.loading('hide');

                    if (response.result.user.role === that.app.roles.Admin ||
                        response.result.user.role === that.app.roles.Submitter) {

                        that.logInSuccessful();

                        if (onSuccess) {
                            onSuccess();
                        }
                    } else {
                        alert('You do not have the appropriate role to submit reports. Please contact the admin to make sure that you are assigned the correct role.');
                        that.logInUnsuccessful();
                    }
                } else {
                    alert('There was a problem logging in.');
                    that.logInUnsuccessful();
                }
            }, function () {
                alert('There was a problem logging in. Please make sure that you have a connection to the internet.');
                that.logInUnsuccessful();
            });
        },
        wireEvents: function () {
            // summary:
            //      Wires the events
            console.log('app/Authentication:wireEvents', arguments);

            $('#home').on('pageshow', lang.hitch(this, 'refreshHomeLinks'));
            $('#logout-btn').click(lang.hitch(this, 'logOut'));
            $('#login-btn').click(lang.hitch(this, 'onLogInBtnClick'));
            $('#login-cancel-btn').click(lang.hitch(this, 'onLogInCancelBtnClick'));
            $('#register-btn').click(lang.hitch(this, 'onRegisterBtnClick'));
        },
        showLoginDialog: function (onSuccess, onFailure) {
            // summary:
            //      Drops down the log in dialog
            // onSuccess: function
            //      Function to fire when the user has successfully logged in
            // onFailure: function
            console.log('app/Authentication:showLoginDialog', arguments);

            $.mobile.changePage('#login', {
                transition: 'slidedown',
                role: 'dialog'
            });
            this.onLoginSuccess = onSuccess;
            this.onLoginFailure = onFailure;
        },
        onLogInCancelBtnClick: function () {
            // summary:
            //      Fires when the cancel button is clicked on the login dialog
            console.log('app/Authentication:onLogInCancelBtnClick', arguments);

            if (!this.onLoginFailure) {
                $.mobile.changePage('#home');
            } else {
                this.onLoginFailure();
            }
        },
        logInSuccessful: function () {
            // summary:
            //      something for other objects to bind to
            console.log('app/Authentication:logInSuccessful', arguments);

            this.emit('log-in-successful');

            this.refreshHomeLinks();
        },
        logInUnsuccessful: function () {
            // summary:
            //      something for other object to bind to
            console.info('app/Authentication:logInSuccessful', arguments);

            $.mobile.loading('hide');
            this.emit('log-in-unsuccessful');
        },
        onRegisterBtnClick: function () {
            // summary:
            //      validates the form and submits it to the web service
            console.log('app/Authentication:onRegisterBtnClick', arguments);

            var form = dom.byId('register-form');

            if (this.validateRegisterForm(form)) {
                $.mobile.loading('show', {
                    text: 'submitting registration',
                    textVisible: true
                });
                // send data to service
                var content = {
                    first: form.fName.value,
                    last: form.lName.value,
                    agency: form.agency.value,
                    email: form.email.value,
                    password: form.pass.value,
                    application: this.app.appName
                };
                var params = {
                    handleAs: 'json',
                    data: JSON.stringify(content),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
                xhr.post(this.app.urls.register, params).then(lang.hitch(this, 'onNewUserServiceReturn'),
                    function (status) {
                        console.error(status);
                        alert('There was an error sending your data to the server!\n' + status.message);
                        $.mobile.loading('hide');
                    }
                );
            }
        },
        onNewUserServiceReturn: function () {
            // summary:
            //      Handles the callback from the new user registration service
            // response: {Message: <number(see roadkill.auth.newUserMessages)>, Status: <number>}
            console.info('auth:onNewUserServiceReturn', arguments);

            $.mobile.loading('hide');
            var txt = dom.byId('register-confirm-msg');
            var btn = dom.byId('register-confirm-ok');
            txt.innerHTML = this.successMsg;
            btn.href = '#home';
            $.mobile.changePage('#register-confirm', {
                transition: 'slidedown',
                role: 'dialog'
            });
        },
        validateRegisterForm: function (form) {
            // summary:
            //      validates the form and returns a boolean
            // returns: Boolean
            console.info('auth:validateRegisterForm', arguments);

            var values = [
                ['First Name', form.fName.value],
                ['Last Name', form.lName.value],
                ['Agency', form.agency.value],
                ['Email', form.email.value],
                ['Verify Email', form.verifyEmail.value],
                ['Password', form.pass.value],
                ['Verify Password', form.verifyPass.value]
            ];

            function checkForSomething(name, value) {
                if (value === '' || value === undefined) {
                    alert(name + ' is required.');
                    return false;
                } else {
                    return true;
                }
            }

            function checkForMatch(value1, value2) {
                var match = value1[1] === value2[1];
                if (!match) {
                    alert(value1[0] + ' does not match ' + value2[0]);
                    return false;
                } else {
                    return true;
                }
            }

            var somethingResult = array.every(values, function (v) {
                return checkForSomething(v[0], v[1]);
            });
            if (!somethingResult) {
                return false;
            }

            var matchResult = checkForMatch(values[4], values[3]) && checkForMatch(values[6], values[5]);
            if (!matchResult) {
                return false;
            }

            if (!validate.isEmailAddress(form.email.value)) {
                alert('Your email address does not appear to be valid!');
                return false;
            }

            if (!this.validatePasswordRequirements(form.pass.value)) {
                return false;
            }

            return true;
        },
        validatePasswordRequirements: function () {
            // summary:
            //      Makes sure that the password meets all of the requirements defined in the web.config
            //      for server.
            // password: String
            // returns: Boolean
            console.info('auth:validatePasswordRequirement', arguments);

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
        }
    });
});
