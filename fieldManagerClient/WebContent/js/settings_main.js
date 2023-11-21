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

	var
		gGroups,
		gSmsType,
		gPanel,
		gCssFile,
		gCssOrgFile,
		gCssModal,
		gResetWebformPressed = false,
		page = 'settings';

	$(document).ready(function() {

		setCustomUserMgmt();			// Apply custom javascript

		setTheme();
		localise.setlang();		// Localise HTML
		setupUserProfile(true);
		window.moment = moment;		// Make moment global for use by common.js
		enableDebugging();

		getSmsType();
		getLoggedInUser(userKnown, false, false, undefined, false,
			false, undefined, getServerDetails);
		getDeviceSettings();
		getEmailSettings();
		getWebformSettings();
		getAppearanceSettings();
		getSensitiveSettings();
		getOtherSettings();		// miscellaneous settings

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
		$('#caseManagementTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'caseManagement');
		});
		$('#emailTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'email');
		});
		$('#otherTab a').click(function (e) {
			e.preventDefault();
			panelChange($(this), 'other');
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

		// Function to save server details
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
				contentType: "application/x-www-form-urlencoded",
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
						alert(localise.set["msg_err_upd"] + msg);  // Alerts htmlencode text already
					}
				}
			});
		});

		$('#saveOtherSettings').click(function() {

			var otherObj = {
				password_strength: $('#o_p_strength').val()
			};

			var otherString = JSON.stringify(otherObj);
			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/x-www-form-urlencoded",
				cache: false,
				url: "/surveyKPI/organisationList/other",
				data: { other: otherString },
				success: function(data, status) {
					removeHourglass();
					getOtherSettings();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();

					if(xhr.readyState == 0 || xhr.status == 0) {
						$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
						return;  // Not an error
					} else {
						var msg = xhr.responseText;
						alert(localise.set["msg_err_upd"] + msg);    // Alerts htmlencode text already
					}
				}
			});
		});

		/*
		 * Respond to change on password profile combo
		 */
		$('#ft_login_policy1').change(function() {
			if($(this).val() === 'periodic') {
				$('.pw_timeout').removeClass("d-none").show();
			} else {
				$('.pw_timeout').hide();
			}
		});

		/*
		 * Respond to change on GeoPoly input method
		 */
		$('#ft_input_method').change(function() {
			if($(this).val() === 'auto') {
				$('.u_ft_im_auto').removeClass("d-none").show();
			} else {
				$('.u_ft_im_auto').hide();
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
			device.ft_input_method = $('#ft_input_method').val();
			device.ft_im_ri = $('#ft_im_ri').val();
			device.ft_im_acc = $('#ft_im_acc').val();
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
				} else if(options[i] === "ft_mark_finalized") {
					device.ft_mark_finalized = true;
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
				} else if(options[i] === "ft_bg_stop_menu") {
					device.ft_bg_stop_menu = true;
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
				contentType: "application/x-www-form-urlencoded",
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
						$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));
					}
				}
			});

		});

		/*
         * Save the email options
         */
		$('#saveEmailSettings').click(function() {
			var email = {},
				error = false;

			email.admin_email = $('#o_admin_email').val();
			email.smtp_host = $('#o_smtp_host').val();
			email.email_domain = $('#o_email_domain').val();

			var eu = $('#o_email_user').val();      // avoid autofill
			if(eu === '-') {
				eu = undefined;
			}
			email.email_user = eu;

			email.email_password = $('#o_email_password').val();
			email.email_port = parseInt($('#o_email_port').val());
			email.default_email_content = $('#o_default_email_content').val();
			email.server_description = $('#o_server_description').val();

			var emailString = JSON.stringify(email);

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: {settings: emailString},
				cache: false,
				contentType: "application/x-www-form-urlencoded",
				url: "/surveyKPI/organisationList/email",
				success: function(data, status) {
					removeHourglass();
					$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
					getEmailSettings();
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));
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
			$('#o_banner_logo').attr("src", "/images/smap_logo.png");
			$('.wfoption').each(function() {
				this.checked = false;
			});
			gResetWebformPressed = true;
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
			webform.resetPressed = gResetWebformPressed;

			var options = $(".wfoption:checked").map(function(){
				return $(this).val();
			}).toArray();

			for(i = 0; i < options.length; i++) {
				if(options[i] === "wf_hide_draft") {
					webform.wf_hide_draft = true;
				}
			}

			var webformString = JSON.stringify(webform);

			$('#webformSettings').val(webformString);
			var f = document.forms.namedItem("webformsave");
			var formData = new FormData(f);

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: formData,
				cache: false,
				contentType: false,
				processData:false,
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
						$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));
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
				navbar_color: $('#app_navbar_color').val(),
				navbar_text_color: $('#app_navbar_text_color').val(),
				css: $('#cssSelectOrg').val()
			};

			var appearanceString = JSON.stringify(appearance);

			$('#appearanceSettings').val(appearanceString);
			var f = document.forms.namedItem("appearancesave");
			var formData = new FormData(f);

			$('.org_alert').hide();
			addHourglass();
			$.ajax({
				type: 'POST',
				data: formData,
				cache: false,
				contentType: false,
				processData:false,
				url: "/surveyKPI/organisationList/appearance",
				success: function(data, status) {
					removeHourglass();
					gCssOrgFile = $('#cssSelectOrg').val();
					$('.my_org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						$('.my_org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + htmlEncode(xhr.responseText));
					}
				}
			});

		});
		// Disable style delete if style is set to none
		cssSelectChange();
		$('#cssSelect').change(function() {
			cssSelectChange();
		});
		cssSelectOrgChange();
		$('#cssSelectOrg').change(function() {
			cssSelectOrgChange();
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
         * Support deletion of a css file
         */
		$('#deleteCss').click(function() {
			deleteCss();
		});
		$('#deleteCssOrg').click(function() {
			deleteCss(globals.gOrgId);
		});

		/*
		 * Support uploading of a css file
		 */
		$('#uploadCss').click(function() {
			$('#cssUpload').val("");
			$('.load_file_alert').hide();
			gCssModal = "server";
			$('#upload_css_popup').modal("show");
		});

		$('#uploadCssOrg').click(function() {
			$('#cssUploadOrg').val("");
			$('.load_file_alert').hide();
			gCssModal = "org";
			$('#upload_css_popup_org').modal("show");
		});

		$('#cssSave, #cssSaveOrg').click(function(){
			let url = "/surveyKPI/css";
			let f;

			if(gCssModal === "server") {
				f = document.forms.namedItem("upload_css_form");
			} else {
				f = document.forms.namedItem("upload_css_form_org");
				url += "?org=true";
			}


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
					if(gCssModal === "server") {
						getCustomCss();
					} else {
						getCustomCssOrg();
					}
					$('#upload_css_popup, #upload_css_popup_org').modal("hide");

				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					var msg = htmlEncode(xhr.responseText);
					if(msg && msg === "only csv") {
						msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
					} else {
						msg = localise.set["t_efnl"] + " " + htmlEncode(xhr.responseText);
					}

					$('.load_file_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

				}
			});
		});

	});

	function deleteCss(org) {
		var url = "/surveyKPI/css/";
		if(org) {
			url += encodeURIComponent($('#cssSelectOrg').val());
			url += "?org=true";
		} else {
			url += encodeURIComponent($('#cssSelect').val());
		}

		addHourglass();
		$.ajax({
			type: "DELETE",
			cache: false,
			url: url,
			success: function(data, status) {
				removeHourglass();
				if(org) {
					getCustomCssOrg();
				} else {
					getCustomCss();
				}
				$('.org_alert, .my_org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_success"]);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				var msg = htmlEncode(xhr.responseText);
				if(msg && msg === "only csv") {
					msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
				} else {
					msg = localise.set["t_efnl"] + " " + htmlEncode(xhr.responseText);
				}

				$('.org_alert,.my_org_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

			}
		});
	}
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

	function cssSelectOrgChange() {
		let val = $('#cssSelectOrg').val();
		if(val === "_none") {
			$('#deleteCssOrg').prop("disabled", true);
		} else {
			$('#deleteCssOrg').prop("disabled", false);
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

	}

	function userKnown() {
		getGroups();
		if(globals.gIsServerOwner) {
			getCustomCss();
		}
		getCustomCssOrg();
		setLogos(globals.gOrgId);
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
		$('#maptiler_key').val(data.maptiler_key);
		$('#s_smtp_host').val(data.smtp_host);
		$('#s_email_domain').val(data.email_domain);
		$('#s_email_user').val(data.email_user);
		$('#s_email_password').val(data.email_password);
		$('#s_email_port').val(data.email_port);
		$('#s_sms_url').val(data.sms_url);
		$('#s_ratelimit').val(data.ratelimit);
		$('#s_p_strength').val(data.password_strength);
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
				maptiler_key: $('#maptiler_key').val(),
				smtp_host: $('#s_smtp_host').val(),
				email_domain: $('#s_email_domain').val(),
				email_user: $('#s_email_user').val(),
				email_password: $('#s_email_password').val(),
				email_port: $('#s_email_port').val(),
				sms_url: $('#s_sms_url').val(),
				ratelimit: $('#s_ratelimit').val(),
				password_strength: $('#s_p_strength').val(),
				css: $('#cssSelect').val()
			};

		var serverString = JSON.stringify(server);

		$('.org_alert').hide();
		addHourglass();
		$.ajax({
			type: "POST",
			data: {settings: serverString},
			cache: false,
			contentType: "application/x-www-form-urlencoded",
			url: url,
			success: function (data, status) {
				removeHourglass();
				gCssFile = $('#cssSelect').val();
				$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_saved"]);
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["t_ens"] + htmlEncode(xhr.responseText));

			}
		});
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
					} else if($(this).val() === "ft_mark_finalized") {
						this.checked = device.ft_mark_finalized;
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
					} else if($(this).val() === "ft_bg_stop_menu") {
						this.checked = device.ft_bg_stop_menu;
					} else if($(this).val() === "ft_review_final") {
						this.checked = device.ft_review_final;
					}
				});

				$('#ft_send').val(device.ft_send);
				$('#ft_send_location').val(device.ft_send_location);
				$('#ft_input_method').val(device.ft_input_method);
				$('#ft_im_ri').val(device.ft_im_ri);
				$('#ft_im_acc').val(device.ft_im_acc);
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
					$('.pw_timeout').removeClass("d-none").show();
				} else {
					if(device.ft_pw_policy < 0) {
						$('#ft_login_policy1').val("never");
					} else {
						$('#ft_login_policy1').val("always");       // policy == 0
					}
					$('.pw_timeout').hide();
				}

				if(device.ft_input_method === 'auto') {
					$('.u_ft_im_auto').removeClass("d-none").show();
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
     * Get the device settings
     */
	function getEmailSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/email",
			dataType: 'json',
			cache: false,
			success: function(org) {
				removeHourglass();

				$('#o_admin_email').val(org.admin_email);
				$('#o_smtp_host').val(org.smtp_host);
				$('#o_email_domain').val(org.email_domain);

				if(typeof org.email_user === "undefined" || org.email_user.trim() === '') {
					$('#o_email_user').val('-');
				} else {
					$('#o_email_user').val(org.email_user);
				}
				$('#o_email_password').val(org.email_password);
				$('#o_email_port').val(org.email_port);
				$('#o_default_email_content').val(org.default_email_content);
				$('#o_server_description').val(org.server_description);
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

				$('.wfoption').each(function() {
					if($(this).val() === "wf_hide_draft") {
						this.checked = webform.wf_hide_draft;
					}
				});

				if(webform.page_background_color) {
					$('#wf_page_background').colorpicker('setValue', webform.page_background_color);
				} else {
					$('#wf_page_background').colorpicker('setValue', '#f0f0f0');
				}

				if(webform.paper_background_color) {
					$('#wf_paper_background').colorpicker('setValue', webform.paper_background_color);
				} else {
					$('#wf_paper_background').colorpicker('setValue', '#fff');
				}

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
				$('#app_navbar_text_color').colorpicker('setValue', appearance.navbar_text_color);
				$('#cssSelectOrg').val(appearance.css);
				gCssOrgFile = appearance.css;

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
 * Get the sensitive question settings
 */
	function getOtherSettings() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/other",
			dataType: 'json',
			cache: false,
			success: function(other) {
				removeHourglass();
				$('#o_p_strength').val(other.password_strength);

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

	/*
     * Get the available custom css files for an organisation
     */
	function getCustomCssOrg() {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/css?org=true",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				showCssOrgNames(data);
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
		if(!gCssFile || gCssFile === '') {
			gCssFile = '_none';
		}
		$elem.val(gCssFile);
		cssSelectChange();

	}

	function showCssOrgNames(names) {
		let $elem = $('#cssSelectOrg'),
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
				h[++idx] = htmlEncode(names[i]);
				h[++idx] = '</option>';
			}
		}
		$elem.html(h.join(''));
		if(!gCssOrgFile || gCssOrgFile === '') {
			gCssOrgFile = '_none';
		}
		$elem.val(gCssOrgFile);
		cssSelectOrgChange();

	}

	function setLogos(orgId) {
		var d = new Date();
		$('#o_banner_logo').attr("src", "/surveyKPI/file/bannerLogo/organisation?settings=true&org=" + orgId + "&" + d.valueOf());
		$('#o_main_logo').attr("src", "/surveyKPI/file/mainLogo/organisation?settings=true&org=" + orgId + "&" + d.valueOf());
	}

});

