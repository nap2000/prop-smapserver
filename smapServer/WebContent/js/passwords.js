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
	'app/common'
], function($, localise) {

	var gToken;

	$(document).ready(function() {

		var i,
			params,
			pArray = [],
			param = [];

		setCustomUserForgottonPasswords();			// Apply custom javascript
		localise.setlang();

		// Add the organisation to the title
		if(window.location.hostname.indexOf("smap") > 0) {
			$('#website_id').text("Smap");
		}

		// Get the authentication token if it has been passed in parameters
		params = location.search.substr(location.search.indexOf("?") + 1)
		pArray = params.split("&");
		for (i = 0; i < pArray.length; i++) {
			param = pArray[i].split("=");
			if ( param[0] === "token" ) {
				gToken = param[1];
			}
		}

		$('#forgottenPasswordEmail, #passwordValue').change(function(){
			$('.pwd_alert, .pwd_home').hide();
		});
	});

	$('#forgottenPasswordSubmit').click(function(e){
		e.preventDefault();

		if (! $('#emailForm')[0].checkValidity()) {
			$('#emailForm')[0].reportValidity()
		} else {

			var email = $('#forgottenPasswordEmail').val();
			$('.pwd_alert, .pwd_home').hide();
			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/x-www-form-urlencoded",
				dataType: 'text',
				cache: false,
				data: email,
				url: "/surveyKPI/onetimelogon",
				success: function (data, status) {
					removeHourglass();
					var msg = localise.set["msg_es"];
					msg = msg.replace('%s1', htmlEncode(email));
					$('.pwd_alert').show().removeClass('alert-danger').addClass('alert-success').html(msg);
					$('.pwd_home').show();
				}, error: function (data, status) {
					removeHourglass();
					var msg = data.responseText;
					var idx1 = msg.indexOf('ApplicationException:');
					var idx2 = msg.indexOf('<', idx1);
					if (idx1 > 0 && idx2 > idx1) {
						msg = msg.substring(idx1, idx2);
					}
					$('.pwd_alert').show().addClass('alert-danger').removeClass('alert-success').text(localise.set["c_error"] + ": " + htmlEncode(msg));
				}
			});
		}

	});

});



