/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/

"use strict";

import $ from "jquery";
import localise from "./app/localise.js";
import globals from "./app/globals.js";
import { addHourglass, getLoggedInUser, htmlEncode, removeHourglass } from "./app/common";

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		if (typeof Modernizr !== "undefined" ? Modernizr.localstorage : true) {
			gUserLocale = localStorage.getItem("user_locale") || navigator.language;
		}
	} catch (error) {
		gUserLocale = navigator.language;
	}
}

window.gUserLocale = gUserLocale;

	var gToken;
	var gReturnTo;		// Page to go on to after an expired password has been changed

	$(document).ready(function() {

		setCustomUserForgottonPasswords();			// Apply custom javascript
		if (typeof setTheme === "function") {
			setTheme();
		}
		localise.initLocale(gUserLocale).then(function () {
			localise.setlang();		// Localise HTML
			var params = location.search.substr(location.search.indexOf("?") + 1);
			if(params.indexOf('expired') >= 0) {
				$('.pwd_alert').show().removeClass('alert-danger alert-success').addClass('alert-info').html(localise.set["msg_pex"]);

				// Only a path on this server
				var returnTo = new URLSearchParams(location.search).get('return');
				if(returnTo && /^\/(?![\/\\])/.test(returnTo)) {
					gReturnTo = returnTo;
					$('#pwd_continue').attr('href', gReturnTo);
				}
			}
			$('#passwordConfirm, #passwordValue').keydown(function() {
				$('.pwd_alert').hide();
			});

			getLoggedInUser(gotuser, false, false, undefined, false, true);

			$('#generate_password').change(function() {
				$('.pwd_alert').hide();
				if($(this).is(':checked')) {
					$('#genGroup').removeClass("d-none").show();
					getPassword(8);
				} else {
					$('#genGroup').hide();
				}
			});
			$('#genPassword').click(function(e){
				e.preventDefault();
				$('.pwd_alert').hide();
				getPassword(8);
			});

			$('#goback').click(function(){
				history.back();
			});

			$('#changePasswordSubmit').click(function(e) {
				e.preventDefault();
				changePasswordSubmit(e);
			});
		});
	});

	function gotuser() {
		$('#id').val(globals.gLoggedInUser.ident);
	}

	/*
	 * The logon session holds the password and Apache checks it on every request, so the session ends
	 * when the password changes.  Log on again with the new one so the user is not asked to.
	 */
	function logonAgain(ident, password, callback) {
		$.ajax({
			type: "POST",
			cache: false,
			url: "/authenticate/login.txt",
			data: { httpd_username: ident, httpd_password: password },
			complete: callback		// If it fails the user is asked to log on as before
		});
	}

	/*
	 * Offer to save the new password in the browser.  The page changes it with an ajax call and stays
	 * where it is, so browsers do not see a form being submitted and would not offer to on their own.
	 * Browsers without the Credential Management API rely on the autocomplete attributes in the form.
	 */
	function savePassword(ident, password) {
		if(ident && window.PasswordCredential && navigator.credentials) {
			try {
				navigator.credentials.store(new PasswordCredential({id: ident, password: password})).catch(function () {});
			} catch (e) {
				// Not available, for example where the certificate is not trusted
			}
		}
	}

	function getPassword(length) {
		const chars = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*.=";
		let password = '';
		const array = new Uint8Array(length);
		self.crypto.getRandomValues(array);

		for (const num of array) {
			let i = Math.floor(num * (chars.length - 1) / 255);
			password += chars.charAt(i);
		}

		$('#passwordConfirm, #password, #generated_password').val(password);

	}

	function validate() {
		var pv =  $('#password').val();
		var pc = $('#passwordConfirm').val();
		if(pv.length < 2) {
			$('.pwd_alert').show().removeClass('alert-success alert-info').addClass('alert-danger').html(localise.set["msg_pwd_l"]);
			return false;
		} else if(pv !== pc) {
			$('.pwd_alert').show().removeClass('alert-success alert-info').addClass('alert-danger').html(localise.set["pw_mm"]);
			return false;
		}
		return true;
	}

	function changePasswordSubmit(event) {

		if(!validate()) {
			return false;
		}

		var pd = {
				password: $('#password').val()
			};
		var pdString = JSON.stringify(pd);

		addHourglass();
		$.ajax({
			type: "POST",
			cache: false,
			dataType: 'text',
			contentType: "application/x-www-form-urlencoded",
			url: "/surveyKPI/user/password?lang=" + gUserLocale,
			data: { passwordDetails: pdString },
			success: function(data, status) {
				var ident = $('#id').val();
				logonAgain(ident, pd.password, function() {
					removeHourglass();

					// Hiding the fields also tells the browser the form was submitted, so it offers to save the password
					$('#pwd_fields').hide();
					$('.pwd_alert').show().removeClass('alert-danger alert-info').addClass('alert-success').html(localise.set["msg_pr"]);
					$('.pwd_home').show();
					savePassword(ident, pd.password);
				});

			}, error: function(data, status) {
				removeHourglass();
				$('.pwd_alert').show().removeClass('alert-success alert-info').addClass('alert-danger').html(localise.set["c_error"] + ": " + htmlEncode(data.responseText));
			}
		});
		return false;

	}
