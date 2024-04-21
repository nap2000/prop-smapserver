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

		setTheme();
		$('#passwordConfirm, #passwordValue').keydown(function () {
			$('.pwd_alert').hide();
		});

		/*
 		* Check to see if a reset is needed
 		*/
		$.ajax({
			url: '/surveyKPI/login/basic',
			cache: false,
			dataType: 'json',
			success: function (data) {
				if (data && data.hasBasicPassword) {
					$('.noreset').removeClass("d-none").show();
					$('.complete').removeClass("d-none").show();
				} else {
					$('.reset').removeClass("d-none").show();
				}
			},
			error: function (xhr, textStatus, err) {

				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log(htmlEncode(xhr.responseText));
				}
			}
		});

	});


	function validate() {
		var pv =  $('#password').val();
		var pc = $('#passwordConfirm').val();
		if(pv.length < 2) {
			$('.pwd_alert').show().removeClass('d-none alert-success alert-info').addClass('alert-danger').html(localise.set["msg_pwd_l"]);
			return false;
		} else if(pv !== pc) {
			$('.pwd_alert').show().removeClass('d-none alert-success alert-info').addClass('alert-danger').html(localise.set["pw_mm"]);
			return false;
		}
		return true;
	}

	$('#resetPasswordSubmit').click( function(event) {

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
			url: "/surveyKPI/login/basic/password?lang=" + gUserLocale,
			data: { passwordDetails: pdString },
			success: function(data, status) {
				removeHourglass();

				$('.pwd_alert').show().removeClass('d-none alert-danger alert-info').addClass('alert-success').html(localise.set["msg_pr"]);
				$('.complete').show().removeClass('d-none');

			}, error: function(data, status) {
				removeHourglass();
				$('.pwd_alert').show().removeClass('d-none alert-success alert-info').addClass('alert-danger').html(localise.set["c_error"] + ": " + htmlEncode(data.responseText));
			}
		});
		return false;

	});

});



