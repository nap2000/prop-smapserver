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
require.config({
	baseUrl: '/js/libs',
	waitSeconds: 0,
	locale: gUserLocale,
	paths: {
		app: '/js/app',
		lang_location: '/js'
	},
	shim: {
		'app/common': ['jquery'],
		'jquery.autosize.min': ['jquery']
	}
});

require([
		'jquery',
		'app/common',
		'app/localise',
		'app/globals'],
	function($, common, lang, globals) {

		$(document).ready(function() {

			setupUserProfile(true);
			localise.setlang();		// Localise HTML

			$('#addTemplate').click( function(e) {
				$('#template_add').modal('show');
			});

			$('#templateLoad').click( function(e) {
				templateLoad();
			});

			$('#templateName').keydown(function(){
				$('#up_alert, #up_warnings').hide();
			});

			// Change function on file selected
			$('#file').change(function(){
				var templateName = $('#templateName').val();
				var $this = $(this);
				var fileName = $this[0].files[0].name;
				var newTemplateName;

				$('#up_alert, #up_warnings').hide();

				if(templateName && templateName.trim().length > 0) {
					// ignore - leave user specified name
				} else {
					var lastDot = fileName.lastIndexOf(".");
					if (lastDot === -1) {
						newTemplateName = fileName;
					} else {
						newTemplateName = fileName.substr(0, lastDot);
					}
					$('#templateName').val(newTemplateName);
				}
			});


			// Get the user details
			globals.gIsAdministrator = false;
			getLoggedInUser(surveyListDone, false, true, undefined, false, false);

		});

		function surveyListDone() {
			getTemplates();
		}

		/*
         * Get a survey details - depends on globals being set
         */
		function getTemplates() {

			var tz = globals.gTimezone;
			var url="/surveyKPI/surveys/templates/" + globals.gCurrentSurvey;
			url += "?tz=" + encodeURIComponent(tz);

			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function(data) {
					removeHourglass();
					setTemplatesHtml(data);
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						if(xhr.status == 404) {
							// The current survey has probably been deleted or the user no longer has access
							globals.gCurrentSurvey = undefined;
							return;
						}
						alert("Error: Failed to get templates: " + err);
					}
				}
			});
		}

		/*
         * Convert change log JSON to html
         */
		function setTemplatesHtml(templates) {
			var h =[],
				idx = -1,
				i;

			if(templates) {

				h[++idx] = '<table class="table table-responsive-sm table-striped">';

				// write the table headings
				h[++idx] = '<thead>';
				h[++idx] = '<tr>';
				h[++idx] = '<th>';
				h[++idx] = localise.set["c_name"];
				h[++idx] = '</th>';
				h[++idx] = '</tr>';
				h[++idx] = '</thead>';

				// Write the table body
				h[++idx] = '<body>';
				for(i = 0; i < templates.length; i++) {
					h[++idx] = '</tr>';
					h[++idx] = '<td>';
					h[++idx] = templates[i].name;
					h[++idx] = '</td>';
					h[++idx] = '</tr>';
				}
				h[++idx] = '</body>';

				h[++idx] = '</table>';
			}

			$('#templates').html(h.join(''));
		}

		/*
  		 * Upload a template
  		 */
		function templateLoad() {

			$('#up_alert, #up_warnings').hide();
			var f = document.forms.namedItem("uploadTemplate");
			var formData = new FormData(f);
			var url;

			let file = $('#templateName').val();
			if(!file || file.trim().length == 0) {
				$('#up_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["msg_val_nm"]);
				$('#templateLoad').prop("disabled", false);  // debounce
				return false;
			}

			url = '/surveyKPI/surveys/add_template/' + globals.gCurrentSurvey;

			addHourglass();
			$.ajax({
				url: url,
				type: 'POST',
				data: formData,
				dataType: 'json',
				cache: false,
				contentType: false,
				processData:false,
				success: function() {
					removeHourglass();
					$('#templateLoad').prop("disabled", false);  // debounce

					document.forms.namedItem("uploadTemplate").reset();
					getTemplates();
					$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error

				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					$('#submitFileGroup').prop("disabled", false);  // debounce

					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = xhr.responseText;

						$('#up_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_u_f"] + ": " + msg);
						$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					}
				}
			});
		}

	});