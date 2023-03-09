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

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

"use strict";
requirejs.config({
	baseUrl: '/js/libs',
	waitSeconds: 0,
	locale: gUserLocale,
	paths: {
		app: '/js/app',
		lang_location: '/js'
	},
	shim: {
		'app/common': ['jquery']
	}
});

require([
	'jquery',
	'bootstrapValidator.min',
	'app/localise',
	'app/globals',
	'app/common'
], function($, bv, localise, globals) {

	var gToken;

	$(document).ready(function() {

		setCustomUserForgottonPasswords();			// Apply custom javascript
		setTheme();
		localise.setlang();		// Localise HTML

		getLoggedInUser(gotuser, false, false, undefined, false, true);

		$('#resetPassword').bootstrapValidator({
			fields: {
				password: {
					validators: {
						identical: {
							field: 'confirmPassword',
							message: localise.set["pw_mm"]
						}
					}
				},
				confirmPassword: {
					validators: {
						identical: {
							field: 'password',
							message: localise.set["pw_mm"]
						}
					}
				}
			}
		});

		$('#changePasswordSubmit').click(function(e){
			e.preventDefault();

			var pd = {
					onetime: gToken,
					password: $('#passwordValue').val()
				},
				pdString;

			pdString = JSON.stringify(pd);


			addHourglass();
			$.ajax({
				type: "POST",
				cache: false,
				url: "/surveyKPI/onetimelogon?lang=" + gUserLocale,
				data: { passwordDetails: pdString },
				success: function(data, status) {
					removeHourglass();
					$('.pwd_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_pr"]);
					$('.pwd_home').show();
				}, error: function(data, status) {
					removeHourglass();
					$('.pwd_alert').show().addClass('alert-danger').removeClass('alert-success').html(localise.set["c_error"] + ": " + data.responseText);
				}
			});
		});

		$('#generate_password').change(function() {
			if($(this).is(':checked')) {
				$('#genGroup').removeClass("d-none").show();
			} else {
				$('#genGroup').hide();
			}
		})
		$('#genPassword').click(function(){
			getPassword(6);
		});
	});

	function gotuser() {
		$('#username').val(globals.gLoggedInUser.ident);
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

		$('#passwordConfirm, #passwordValue, #generated_password')
			.val(password).trigger('change');
		$('#resetPassword').validate();
	}


});



