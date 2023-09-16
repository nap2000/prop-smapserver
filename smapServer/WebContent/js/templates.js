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

		var gTemplates,
			gEditTemplate;

		$(document).ready(function() {

			setTheme();
			setupUserProfile(true);
			localise.setlang();		// Localise HTML

			$('#addTemplate').click( function(e) {
				$('#up_alert, #up_warnings').hide();
				$('#template_add').modal('show');
			});

			$('#templateLoad').click( function(e) {
				templateLoad();
			});

			$('#ruleSave').click( function(e) {
				updateTemplateProperty(gEditTemplate.id, 'rule', $('#templateRule').val());
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
			getLoggedInUser(getUserDone, false, true, undefined, false, false);

		});

		function getUserDone() {
			getTemplates();
		}

		/*
         * Get a survey details - depends on globals being set
         */
		function getTemplates() {

			var tz = globals.gTimezone;
			var url="/surveyKPI/surveys/templates/" + globals.gCurrentSurvey;
			url += "?get_not_available=true";
			url += "&tz=" + encodeURIComponent(tz);

			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function(data) {
					removeHourglass();
					gTemplates = data;
					setTemplatesHtml();
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert("Error: Failed to get templates: " + err);
					}
				}
			});
		}

		/*
         * Convert change log JSON to html
         */
		function setTemplatesHtml() {
			var h =[],
				idx = -1,
				i;

			if(gTemplates) {

				h[++idx] = '<table class="table table-responsive-sm table-striped">';

				// write the table headings
				h[++idx] = '<thead>';
				h[++idx] = '<tr>';
				h[++idx] = '<th>';
				h[++idx] = localise.set["c_name"];
				h[++idx] = '</th>';
				h[++idx] = '<th>' + localise.set["ed_na"] + '</th>';	// Disable Checkbox
				h[++idx] = '<th>' + localise.set["c_default"] + '</th>';	// Default Checkbox
				h[++idx] = '<th>' + localise.set["c_rule"] + '</th>';
				h[++idx] = '<th></th>';		// delete and edit button
				h[++idx] = '</tr>';
				h[++idx] = '</thead>';

				// Write the table body
				h[++idx] = '<body>';
				for(i = 0; i < gTemplates.length; i++) {
					h[++idx] = '<tr';
					if (gTemplates[i].not_available) {
						h[++idx] = ' class="blocked"';
					}
					h[++idx] = '>';
					h[++idx] = '<td>';
					h[++idx] = htmlEncode(gTemplates[i].name);
					h[++idx] = '</td>';

					// Not available checkbox
					if (!gTemplates[i].fromSettings) {

						h[++idx] = '<td class="not_available"><input type="checkbox" name="block" value="';
						h[++idx] = gTemplates[i].id;
						h[++idx] = '" ';
						if (gTemplates[i].not_available) {
							h[++idx] = 'checked="checked"';
						}
						h[++idx] = '></td>';

						// Default checkbox
						h[++idx] = '<td class="default_template"><input type="checkbox" name="block" value="';
						h[++idx] = gTemplates[i].id;
						h[++idx] = '" ';
						if (gTemplates[i].default_template) {
							h[++idx] = 'checked="checked"';
						}
						h[++idx] = '></td>';
					} else {
						h[++idx] = '<td colspan="2">';
						h[++idx] = localise.set["ed_s_templates"],
						h[++idx] = '</td>';
					}

					// rule
					h[++idx] = '<td style="text-align: center; word-break: break-all;">';
					h[++idx] = htmlEncode(gTemplates[i].rule);
					h[++idx] = '</td>';

					// Actions
					h[++idx] = '<td>';

					// Download button
					h[++idx] = '<a href="';
					if (!gTemplates[i].fromSettings) {
						h[++idx] = '/surveyKPI/file/' + encodeURIComponent(gTemplates[i].name) + '/pdfTemplate/' + globals.gCurrentSurvey;
					} else {
						h[++idx] = '/surveyKPI/file/pdf/surveyPdfTemplate/' + globals.gCurrentSurvey;
					}
					h[++idx] = "?_v=" + new Date().getTime().toString();	// cache buster
					h[++idx] = '" type="button" data-idx="';
					h[++idx] = i;
					h[++idx] = '" class="btn btn-info mx-2 btn-sm">';
					h[++idx] = '<i class="fa fa-arrow-down" aria-hidden="true"></i></a>';

					// Delete button
					h[++idx] = '<button type="button" data-idx="';
					h[++idx] = i;
					h[++idx] = '" class="btn btn-danger mx-2 btn-sm rm_template danger">';
					h[++idx] = '<i class="fas fa-trash-alt" aria-hidden="true"></i></button>';

					if (!gTemplates[i].fromSettings) {
						h[++idx] = '<button type="button" data-idx="';
						h[++idx] = i;
						h[++idx] = '" class="btn btn-info btn-sm edit_temp">';
						h[++idx] = '<i class="fa fa-edit"></i></button>';
					}

					h[++idx] = '</td>';

					h[++idx] = '</tr>';
				}
				h[++idx] = '</body>';

				h[++idx] = '</table>';
			}

			$('#templates').html(h.join(''));

			$(".rm_template", '#templates').click(function(){
				var idx = $(this).data("idx");
				deleteTemplate(gTemplates[idx]);
			});

			$(".edit_temp", '#templates').click(function(){
				var idx = $(this).data("idx");
				gEditTemplate = gTemplates[idx];
				$('#templateRule').val(gTemplates[idx].rule);
				$('#template_edit').modal("show");
			});

			$('.not_available').find('input').click(function() {

				var $template,
					$this = $(this),
					id;

				$template = $this.closest('tr');
				id=$this.val();

				if($this.is(':checked')) {
					$template.addClass('blocked');
					updateTemplateProperty(id, 'not_available', true);
				} else {
					$template.removeClass('blocked');
					updateTemplateProperty(id, 'not_available', false);
				}

			});

			$('.default_template').find('input').click(function() {

				var $template,
					$this = $(this),
					id;

				$template = $this.closest('tr');
				id=$this.val();

				updateTemplateProperty(id, 'default_template', $this.is(':checked'));

			});
		}

		/*
  		 * Upload a template
  		 */
		function templateLoad() {

			$('#templateLoad').prop("disabled", true);  // debounce
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
					$('#template_add').modal('hide');
					getTemplates();
					$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error

				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					$('#submitFileGroup').prop("disabled", false);  // debounce

					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						$('#up_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_u_f"] + ": " + htmlEncode(xhr.responseText));
						$('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					}
				}
			});
		}

		/*
 		 * Delete a template
 		 */
		function deleteTemplate(template) {

			if(confirm(localise.set["msg_confirm_del"] + " " + template.name)) {
				addHourglass();
				$.ajax({
					type: "DELETE",
					async: false,
					url: "/surveyKPI/surveys/delete_template/" + globals.gCurrentSurvey + "/" + template.id,
					success: function (data, status) {
						removeHourglass();
						getTemplates();
					},
					error: function (xhr, textStatus, err) {
						removeHourglass();
						if (xhr.readyState == 0 || xhr.status == 0) {
							return;  // Not an error
						} else {
							alert(localise.set["msg_err_del"] + xhr.responseText);
						}
					}
				});
			}
		}

		/*
 		 * Update a property for the specified template
 		 */
		function updateTemplateProperty(id, property, value) {

			var prop = {
				id: id,
				property: property,
				value: value
			};

			var propString = JSON.stringify(prop);

			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/json",
				url: "/surveyKPI/surveys/update_template_property",
				cache: false,
				data: { prop: propString },
				success: function() {
					removeHourglass();
					$('#template_edit').modal("hide");
					getTemplates();	// Reload templates view
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					('#edit_warnings').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["msg_err_del"] + xhr.responseText);
				}
			});
		}

	});