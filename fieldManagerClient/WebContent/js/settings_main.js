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

/*
 * Purpose: Manage the panels that display graphs, maps etc of results data
 */

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

requirejs.config({
	baseUrl: 'js/libs',
	locale: gUserLocale,
	waitSeconds: 0,
	paths: {
		app: '../app',
		i18n: '../../../../js/libs/i18n',
		async: '../../../../js/libs/async',
		localise: '../../../../js/app/localise',
		bootstrapcolorpicker: '../../../../js/libs/bootstrap-colorpicker.min',
		datetimepicker: '../../../../js/libs/bootstrap-datetimepicker-4.17.47',
		common: '../../../../js/app/common',
		globals: '../../../../js/app/globals',
		crf: '../../../../js/libs/commonReportFunctions',
		moment: '../../../../js/libs/moment-with-locales.2.24.0',
		slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll',
		lang_location: '../../../../js'
	},
	shim: {
		'bootstrapcolorpicker': ['jquery'],
		'slimscroll': ['jquery'],
		'datetimepicker': ['moment'],
		'common': ['jquery']
	}
});

require([
	'jquery',
	'common',
	'localise',
	'globals',
	'moment',
	'slimscroll',
	'bootstrapcolorpicker',
	'datetimepicker'

], function($, common, localise, globals, moment) {

	var gUsers,
		gGroups,
		gOrganisationList,
		gCurrentProjectIndex,	// Set while editing a projects details
		gCurrentOrganisationIndex,
		gCurrentUserIndex,		// Set while editing a users details
		gCurrentDeleteUsers,    // Users that have been selected for deletion, waiting on approval
		gSmsType,
		gPanel,
		gCssFile;

	var limitTypes = [
		{
			id: 'o_translate_limit',
			name: 'translate',
			label: 'translate',
			default: 5000
		},
		{
			id: 'o_transcribe_limit',
			name: 'transcribe',
			label: 'transcribe',
			default: 250
		},
		{
			id: 'o_transcribe_medical_limit',
			name: 'transcribe_medical',
			label: 'transcribe_medical',
			default: 80
		},
		{
			id: 'o_rekognition_limit',
			name: 'rekognition',
			label: 'rekognition',
			default: 100
		},
		{
			id: 'o_submission_limit',
			name: 'submissions',
			label: 'submissions',
			default: 0
		}
		];

	$(document).ready(function() {

		setCustomUserMgmt();			// Apply custom javascript

		localise.setlang();		// Localise HTML
		setupUserProfile(true);
		window.moment = moment;		// Make moment global for use by common.js
		enableDebugging();

		getSmsType();
		getLoggedInUser(userKnown, false, false, undefined, false,
			false, undefined, getServerDetails);
		getDeviceSettings();
		getWebformSettings();
		getAppearanceSettings();
		getSensitiveSettings();

		// Set up the tabs
		$('#appearanceTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'appearance');
		});
		$('#serverTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'server');
		});
		$('#deviceTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'device');
		});
		$('#webformTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'webform');
		});
		$('#sensitiveTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'sensitive');
		});

		// Copy user ident to email if it is a valid email
		$('#user_ident').blur(function(){
			var ident = $('#user_ident').val();

			if(validateEmails(ident)) {
				$('#user_email').val(ident);
			}

		});

		/*
		 * Setting organisation theme
		 */
		$('#change_banner_logo').change(function(){
			displayAsImage($(this)[0].files[0], $('#o_banner_logo')[0]);
		});
		$('#change_main_logo').change(function(){
			displayAsImage($(this)[0].files[0], $('#o_main_logo')[0]);
		});

		// Function to save a users details
		$('#saveServer').click(function(e) {
			writeServerDetails();
		});

		/*
		 * Set focus to first element on opening modals
		 */
		$('.modal').on('shown.bs.modal', function() {
			$(this).find('input[type=text],textarea,select').filter(':visible:first').focus();
		});

		$('#saveSensitive').click(function() {

			var sensitiveObj = {
				signature: $('#sens_sig').val()
			};

			var sensitiveString = JSON.stringify(sensitiveObj);
			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/json",
				cache: false,
				url: "/surveyKPI/organisationList/sensitive",
				data: { sensitive: sensitiveString },
				success: function(data, status) {
					removeHourglass();
					getSensitiveSettings();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();

					if(xhr.readyState == 0 || xhr.status == 0) {
						$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
						return;  // Not an error
					} else {
						var msg = xhr.responseText;
						alert(localise.set["msg_err_upd"] + msg);
					}
				}
			});
		});

		/*
		 * Respond to change on password profile combo
		 */
		$('#ft_login_policy1').change(function() {
			if($(this).val() === 'periodic') {
				$('.pw_timeout').show();
			} else {
				$('.pw_timeout').hide();
			}
		});

		/*
		 * Save the device options
		 */
		$('#saveDevice').click(function() {
			var device = {},
				error = false,
				options=[],
				i;

			device.ft_send_location = $('#ft_send_location').val();
			device.ft_send = $('#ft_send').val();
			device.ft_delete = $('#ft_delete').val();
			device.ft_backward_navigation = $('#ft_backward_navigation').val();
			device.ft_high_res_video = $('#ft_high_res_video').val();
			device.ft_navigation = $('#ft_navigation').val();
			device.ft_guidance = $('#ft_guidance').val();
			device.ft_image_size = $('#ft_image_size').val();

			device.ft_number_tasks = $('#ft_number_tasks').val();
			if(typeof device.ft_number_tasks === "undefined" || device.ft_number_tasks == '') {
				device.ft_number_tasks = 20;
			}

			var pw_policy1 = $('#ft_login_policy1').val();
			if(pw_policy1 === 'never') {
				device.ft_pw_policy = -1;
			} else if(pw_policy1 === 'always') {
				device.ft_pw_policy = 0;
			} else {
				device.ft_pw_policy = parseInt($('#ft_login_policy2').val());
				if(!Number.isInteger(device.ft_pw_policy) || device.ft_pw_policy <= 0) {
					alert(localise.set["msg_pe"]);
					return false;
				}
			}

			options = $(".devoption:checked").map(function(){
				return $(this).val();
			}).toArray();

			for(i = 0; i < options.length; i++) {
				if(options[i] === "ft_odk_style_menus") {
					device.ft_odk_style_menus = true;
				} else if(options[i] === "ft_specify_instancename") {
					device.ft_specify_instancename = true;
				} else if(options[i] === "ft_prevent_disable_track") {
					device.ft_prevent_disable_track = true;
				}  else if(options[i] === "ft_enable_geofence") {
					device.ft_enable_geofence = true;
				} else if(options[i] === "ft_admin_menu") {
					device.ft_admin_menu = true;
				} else if(options[i] === "ft_server_menu") {
					device.ft_server_menu = true;
				} else if(options[i] === "ft_meta_menu") {
					device.ft_meta_menu = true;
				} else if(options[i] === "ft_exit_track_menu") {
					device.ft_exit_track_menu = true;
				} else if(options[i] === "ft_review_final") {
					device.ft_review_final = true;
				}
			}

			var deviceString = JSON.stringify(device);

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: {settings: deviceString},
				cache: false,
				contentType: "application/json",
				url: "/surveyKPI/organisationList/device",
				success: function(data, status) {
					removeHourglass();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
					getDeviceSettings();
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + xhr.responseText);
					}
				}
			});

		});

		/*
		 * Reset the webform options back to their defaults
		 */
		$('#resetWebform').click(function() {
			$('#wf_page_background').colorpicker('setValue', '#f0f0f0');
			$('#wf_paper_background').colorpicker('setValue', '#fff');
			$('#wf_footer_horizontal_offset').val(5);
			$('#wf_button_background_color').colorpicker('setValue', '#556B2F');
			$('#wf_button_text_color').colorpicker('setValue', '#fff');
			$('#wf_header_text_color').colorpicker('setValue', '#004200');
		});

		/*
         * Save the webform options
         */
		$('#saveWebform').click(function() {
			var webform = {},
				error = false,
				options=[],
				i;

			webform.page_background_color = $('#wf_page_background').val();
			webform.button_background_color = $('#wf_button_background_color').val();
			webform.button_text_color = $('#wf_button_text_color').val();
			webform.header_text_color = $('#wf_header_text_color').val();
			webform.paper_background_color = $('#wf_paper_background').val();
			webform.footer_horizontal_offset = $('#wf_footer_horizontal_offset').val();
			webform.footer_horizontal_offset = webform.footer_horizontal_offset || 0;

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: {settings: JSON.stringify(webform)},
				cache: false,
				contentType: "application/json",
				url: "/surveyKPI/organisationList/webform",
				success: function(data, status) {
					removeHourglass();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + xhr.responseText);
					}
				}
			});

		});

		/*
         * Save the appearance options
         */
		$('#saveAppearance').click(function() {
			var appearance = {
				set_as_theme: $('#app_set_as_theme').prop('checked'),
				navbar_color: $('#app_navbar_color').val()
			};

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: {settings: JSON.stringify(appearance)},
				cache: false,
				contentType: "application/json",
				url: "/surveyKPI/organisationList/appearance",
				success: function(data, status) {
					removeHourglass();
					$('.my_org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						$('.my_org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + xhr.responseText);
					}
				}
			});

		});
		// Disable style delete if style is set to none
		cssSelectChange();
		$('#cssSelect').change(function() {
			cssSelectChange();
		});

		/*
		 * Move a project to a new organisation
		 */
		$('#organisationMove').click(function(){
			var projects =[],
				h = [],
				i = -1,
				idx,
				orgId,
				orgName,
				hasProjects = false,
				projectsMoving = '',
				msg;

			$('#project_table').find('input:checked').each(function(index) {
				if(hasProjects){
					projectsMoving += ", ";
				}
				idx = $(this).val();
				projects[index] = {id: globals.gProjectList[idx].id};

				projectsMoving += globals.gProjectList[idx].name;
			});

			orgId = $('#target_organisation').val();
			orgName = $('#target_organisation :selected').text();

			msg = localise.set["u_check_mv_p"];
			msg = msg.replace("%s1", projectsMoving);
			msg = msg.replace("%s2", orgName);

			bootbox.confirm(msg, function(result){
				if(result) {
					moveToOrganisations(orgId, projects);
				}
			});

		});


		// Initialise the reset password checkbox
		$('#reset_password').click(function () {
			if($(this).is(':checked')) {
				$('#password_fields').show();
			} else {
				$('#password_fields').hide();
			}
		});

		/*
		 * Set up colour picker
		 */
		$('.colorpicker-component').colorpicker({
			format: 'hex'
		});

		$('input').focus(function() {
			$('.org_alert').hide();
		});

		// Set page defaults
		var currentTab = getFromLocalStorage("currentTab" + page);
		if(currentTab) {
			$(currentTab).trigger('click');
		}

		/*
         * Export
         */
		$('#m_export_xls').click(function () {	// Export to XLS

			var url;

			if(gPanel === 'users') {
				downloadFile('/surveyKPI/userList/xls');
			} else if(gPanel === 'projects') {
				downloadFile('/surveyKPI/projectList/xls');
			} else if(gPanel === 'role') {
				downloadFile('/surveyKPI/role/xls');
			} else {
				alert("Error unknown panel: " + gPanel);    // Would be programming error - no need for translation
			}
		});

		/*
		 * import
		 */
		$('#m_import_xls').click(function () {	// Import from XLS
			if(gPanel === 'users') {
				$('#fi_clear_label').html(localise.set["u_clear_u"]);
			} else if(gPanel === 'projects') {
				$('#fi_clear_label').html(localise.set["u_clear_p"]);
			} else if(gPanel === 'role') {
				$('#fi_clear_label').html(localise.set["u_clear_r"]);
			}

			$('#load_file_alert').hide();
			$('#import_file').modal("show");
		});

		// Respond to selection of a file for upload
		$('.custom-file-label').attr('data-browse', localise.set["c_browse"]);
		$('.custom-file-input').on('change',function(){
			var fileName = $(this).val();
			var endPath = fileName.lastIndexOf("\\");
			if(endPath > 0) {
				fileName = fileName.substring(endPath + 1);
			}
			$(this).next('.custom-file-label').html(fileName);
		});

		$(('#importFileGo')).click(function () {
			if(gPanel === "projects") {
				importXLS('/surveyKPI/projectList/xls', getProjects, undefined);
			} else if(gPanel === "users") {
				importXLS('/surveyKPI/userList/xls', getUsers, undefined);
			} else if(gPanel === "role") {
				importXLS('/surveyKPI/role/xls', getRoles, updateRoleTable);
			}
		});

		/*
         * Support uploading of a css file
         */
		$('#deleteCss').click(function() {
			var url = "/surveyKPI/css/" + encodeURIComponent($('#cssSelect').val());

			addHourglass();
			$.ajax({
				type: "DELETE",
				cache: false,
				url: url,
				success: function(data, status) {
					removeHourglass();
					getCustomCss();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_success"]);
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					var msg = xhr.responseText;
					if(msg && msg === "only csv") {
						msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
					} else {
						msg = localise.set["t_efnl"] + " " + xhr.responseText;
					}

					$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

				}
			});
		});

		/*
		 * Support uploading of a css file
		 */
		$('#uploadCss').click(function() {
			$('#file').val("");
			$('.load_file_alert').hide();
			$('#upload_css_popup').modal("show");
		});

		$('#cssSave').click(function(){
			var url = "/surveyKPI/css";
			var f = document.forms.namedItem("upload_css_form");
			var formData = new FormData(f);
			addHourglass();
			$.ajax({
				type: "POST",
				data: formData,
				cache: false,
				contentType: false,
				processData:false,
				url: url,
				success: function(data, status) {
					removeHourglass();
					getCustomCss();
					$('#upload_css_popup').modal("hide");

				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					var msg = xhr.responseText;
					if(msg && msg === "only csv") {
						msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
					} else {
						msg = localise.set["t_efnl"] + " " + xhr.responseText;
					}

					$('.load_file_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

				}
			});
		});


	});

	/*
	 * Respond to change of cssSelect
	 */
	function cssSelectChange() {
		let val = $('#cssSelect').val();
		if(val === "_none") {
			$('#deleteCss').prop("disabled", true);
		} else {
			$('#deleteCss').prop("disabled", false);
		}
	}
	/*
	 * Respond to a panel being changed
	 * panelChange($(this), 'userPanel', 'usersTab');
	 */
	function panelChange($this, name) {
		gPanel = name;

		$('.org_alert').hide();
		$this.tab('show');

		$(".usertab").hide();
		$('.panel' + name).show();
		$('#' + name + 'Panel').show();
		setInLocalStorage("currentTab" + page, '#' + name + 'Tab a');

		if(name === 'users' || name === 'projects' || name === 'role') {
			$('#m_import_xls, #m_export_xls').removeClass("disabled");
		} else {
			$('#m_import_xls, #m_export_xls').addClass("disabled");;
		}
	}

	/*
     * Import data from a spreadsheet
     */
	function importXLS(url, callback, p1) {

		var f = document.forms.namedItem("importFile");
		var formData = new FormData(f);

		$('#load_file_alert').hide();

		addHourglass();
		$.ajax({
			type: "POST",
			data: formData,
			dataType: "text",
			cache: false,
			contentType: false,
			processData: false,
			url: url,
			success: function (data) {
				removeHourglass();
				var cb = callback;
				var param1 = p1;
				$('#load_file_alert').removeClass('alert-danger').addClass('alert-success').html(data);
				$('#load_file_alert').show();
				cb(param1);

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				var msg = xhr.responseText;
				$('#load_file_alert').show().removeClass('alert-success').addClass('alert-danger').text(msg);

			}
		});
	}


	function userKnown() {
		getGroups();
		if(globals.gIsServerOwner) {
			getCustomCss();
		}

	}

	function getServerDetails() {
		// Get the server details
		addHourglass();
		$.ajax({
			url: "/surveyKPI/server",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				updateServerData(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	function getSmsType() {
		// Get the server details
		addHourglass();
		$.ajax({
			url: "/surveyKPI/server/sms",
			cache: false,
			success: function(data) {
				removeHourglass();
				gSmsType = data;
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	/*
	 * Populate the server tab
	 */
	function updateServerData(data) {
		$('#mapbox_key').val(data.mapbox_default);
		$('#google_key').val(data.google_key);
		$('#s_smtp_host').val(data.smtp_host);
		$('#s_email_domain').val(data.email_domain);
		$('#s_email_user').val(data.email_user);
		$('#s_email_password').val(data.email_password);
		$('#s_email_port').val(data.email_port);
		$('#s_sms_url').val(data.sms_url);
		gCssFile = data.css;

	}

	/*
	 * Update the server with the server config
	 */
	function writeServerDetails() {

		var url = "/surveyKPI/server",
			serverString,
			server = {
				mapbox_default: $('#mapbox_key').val(),
				google_key: $('#google_key').val(),
				smtp_host: $('#s_smtp_host').val(),
				email_domain: $('#s_email_domain').val(),
				email_user: $('#s_email_user').val(),
				email_password: $('#s_email_password').val(),
				email_port: $('#s_email_port').val(),
				sms_url: $('#s_sms_url').val(),
				css: $('#cssSelect').val()
			};

		var serverString = JSON.stringify(server);

		$('.org_alert').hide();
		addHourglass();
		$.ajax({
			type: "POST",
			data: {settings: serverString},
			cache: false,
			contentType: "application/json",
			url: url,
			success: function (data, status) {
				removeHourglass();
				gCssFile = $('#cssSelect').val();
				$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_saved"]);
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["t_ens"] + xhr.responseText);

			}
		});
	}

	/*
	 * Get a usage report
	 */
	function getUsage(oId, month, year, period) {


		docURL = "/surveyKPI/usage/" + oId + "?month=" + month + "&year=" + year + "&period=" + period;
		window.location.href = docURL;

	}

	/*
	 * Get the list of available groups from the server
	 */
	function getGroups() {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/groupList",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gGroups = data;
				updateGroupTable();
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	/*
	 * Update the group table with the current group list
	 */
	function updateGroupTable() {
		var $groupSelect = $('#group_name'),
			i,
			h = [],
			idx = -1;

		h[++idx] = '<option value="All">' + localise.set["c_all"] + '</option>';
		for(i = 0; i < gGroups.length; i++) {
			if((gGroups[i].id != globals.GROUP_ORG_ADMIN || globals.gIsOrgAdministrator) &&
				(gGroups[i].id != globals.GROUP_SECURITY || globals.gIsSecurityAdministrator || globals.gIsOrgAdministrator) &&
				(gGroups[i].id != globals.GROUP_ENTERPRISE || globals.gIsEnterpriseAdministrator) &&
				gGroups[i].id != globals.GROUP_OWNER
			) {
				h[++idx] = '<option value="';
				h[++idx] = gGroups[i].name;
				h[++idx] = '">';
				h[++idx] = localise.set[gGroups[i].name];
				h[++idx] = '</option>';
			}
		}
		$groupSelect.empty().append(h.join(''));
		$groupSelect.val("All");
	}

	/*
	 * Get the device settings
	 */
	function getDeviceSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/device",
			dataType: 'json',
			cache: false,
			success: function(device) {
				removeHourglass();

				$('.devoption').each(function() {
					if($(this).val() === "ft_odk_style_menus") {
						this.checked = device.ft_odk_style_menus;
					} else if($(this).val() === "ft_specify_instancename") {
						this.checked = device.ft_specify_instancename;
					} else if($(this).val() === "ft_prevent_disable_track") {
						this.checked = device.ft_prevent_disable_track;
					} else if($(this).val() === "ft_enable_geofence") {
						this.checked = device.ft_enable_geofence;
					} else if($(this).val() === "ft_admin_menu") {
						this.checked = device.ft_admin_menu;
					} else if($(this).val() === "ft_server_menu") {
						this.checked = device.ft_server_menu;
					} else if($(this).val() === "ft_meta_menu") {
						this.checked = device.ft_meta_menu;
					} else if($(this).val() === "ft_exit_track_menu") {
						this.checked = device.ft_exit_track_menu;
					} else if($(this).val() === "ft_review_final") {
						this.checked = device.ft_review_final;
					}
				});

				$('#ft_send').val(device.ft_send);
				$('#ft_send_location').val(device.ft_send_location);
				$('#ft_delete').val(device.ft_delete);
				$('#ft_backward_navigation').val(device.ft_backward_navigation);
				$('#ft_high_res_video').val(device.ft_high_res_video);
				$('#ft_navigation').val(device.ft_navigation);
				$('#ft_guidance').val(device.ft_guidance);
				$('#ft_image_size').val(device.ft_image_size);
				$('#ft_number_tasks').val(device.ft_number_tasks);

				if(device.ft_pw_policy > 0) {
					$('#ft_login_policy1').val("periodic");
					$('#ft_login_policy2').val(device.ft_pw_policy );
					$('.pw_timeout').show();
				} else {
					if(device.ft_pw_policy < 0) {
						$('#ft_login_policy1').val("never");
					} else {
						$('#ft_login_policy1').val("always");       // policy == 0
					}
					$('.pw_timeout').hide();
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	/*
     * Get the webform settings that can be modified by an administrator settings
     */
	function getWebformSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/webform",
			dataType: 'json',
			cache: false,
			success: function(webform) {
				removeHourglass();

				$('#wf_page_background').colorpicker('setValue', webform.page_background_color);
				$('#wf_paper_background').colorpicker('setValue', webform.paper_background_color);

				if(webform.button_background_color) {
					$('#wf_button_background_color').colorpicker('setValue', webform.button_background_color);
				} else {
					$('#wf_button_background_color').colorpicker('setValue', '#556B2F');
				}
				if(webform.button_text_color) {
					$('#wf_button_text_color').colorpicker('setValue', webform.button_text_color);
				} else {
					$('#wf_button_text_color').colorpicker('setValue', '#fff');
				}
				if(webform.header_text_color) {
					$('#wf_header_text_color').colorpicker('setValue', webform.header_text_color);
				} else {
					$('#wf_header_text_color').colorpicker('setValue', '#004200');
				}

				$('#wf_footer_horizontal_offset').val(webform.footer_horizontal_offset);

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	/*
     * Get the appearance settings that can be modified by an administrator settings
     */
	function getAppearanceSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/appearance",
			dataType: 'json',
			cache: false,
			success: function(appearance) {
				removeHourglass();

				$('#app_set_as_theme').prop('checked', appearance.set_as_theme);
				$('#app_navbar_color').colorpicker('setValue', appearance.navbar_color);

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}


	/*
	 * Get the sensitive question settings
	 */
	function getSensitiveSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/sensitive",
			dataType: 'json',
			cache: false,
			success: function(sensitive) {
				removeHourglass();
				$('#sens_sig').val(sensitive.signature);

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	/*
	 * Get the available custom css files
	 */
	function getCustomCss() {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/css",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				showCssNames(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});
	}

	function showCssNames(names) {
		let $elem = $('#cssSelect'),
			h = [],
			idx = -1;

		h[++idx] = '<option value="_none">';
		h[++idx] = localise.set["c_none"];
		h[++idx] = '</option>';

		if(names && names.length > 0) {
			for (i = 0; i < names.length; i++) {
				h[++idx] = '<option value="';
				h[++idx] = names[i]
				h[++idx] = '">';
				h[++idx] = names[i];
				h[++idx] = '</option>';
			}
		}
		$elem.html(h.join(''));
		if(!gCssFile) {
			gCssFile = '_none';
		}
		$elem.val(gCssFile);
		cssSelectChange();

	}


});

