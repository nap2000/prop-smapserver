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
import localise from "./app/localise";
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
		});
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

	$('#changePasswordSubmit').click( function(event) {

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
				removeHourglass();

				$('.pwd_alert').show().removeClass('alert-danger alert-info').addClass('alert-success').html(localise.set["msg_pr"]);
				$('.pwd_home').show();

			}, error: function(data, status) {
				removeHourglass();
				$('.pwd_alert').show().removeClass('alert-success alert-info').addClass('alert-danger').html(localise.set["c_error"] + ": " + htmlEncode(data.responseText));
			}
		});
		return false;

	});
