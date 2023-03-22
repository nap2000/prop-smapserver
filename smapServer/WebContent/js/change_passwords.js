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
	'app/localise',
	'app/globals',
	'app/common'
], function($, localise, globals) {

	var gToken;

	$(document).ready(function() {

		setCustomUserForgottonPasswords();			// Apply custom javascript
		setTheme();
		localise.setlang();		// Localise HTML
		var params = location.search.substr(location.search.indexOf("?") + 1);
		if(params.indexOf('expired') >= 0) {
			$('.pwd_alert').show().removeClass('alert-danger alert-success').addClass('alert-info').html(localise.set["msg_pex"]);
		}
		$('#passwordConfirm, #passwordValue').keydown(function() {
			$('.pwd_alert').hide();
		});

		getLoggedInUser(gotuser, false, false, undefined, false, true);

		$('#changePasswordSubmit').click(function(e){
			e.preventDefault();

			if(!validate()) {
				return;
			}

			var pd = {
					password: $('#password').val()
				},
				pdString,
				user =

			pdString = JSON.stringify(pd);

			addHourglass();
			$.ajax({
				type: "POST",
				cache: false,
				dataType: 'text',
				contentType: "application/json",
				url: "/surveyKPI/user/password?lang=" + gUserLocale,
				data: { passwordDetails: pdString },
				success: function(data, status) {
					removeHourglass();

					if (window.PasswordCredential) {
						const creds = new PasswordCredential({
							id: $('#id').val(),
							password: $('#password').val()
						});
						navigator.credentials.store(creds).then((creds) => {

						});
					}

					$('.pwd_alert').show().removeClass('alert-danger alert-info').addClass('alert-success').html(localise.set["msg_pr"]);
					$('.pwd_home').show();

				}, error: function(data, status) {
					removeHourglass();
					$('.pwd_alert').show().removeClass('alert-success alert-info').addClass('alert-danger').html(localise.set["c_error"] + ": " + data.responseText);
				}
			});
		});

		$('#generate_password').change(function() {
			$('.pwd_alert').hide();
			if($(this).is(':checked')) {
				$('#genGroup').removeClass("d-none").show();
				getPassword(8);
			} else {
				$('#genGroup').hide();
			}
		})
		$('#genPassword').click(function(e){
			e.preventDefault();
			$('.pwd_alert').hide();
			getPassword(8);
		});

		$('#goback').click(function(){
			history.back();
		})
	});

	function gotuser() {
		$('#id').val(globals.gLoggedInUser.ident);
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

});



