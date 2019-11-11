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
		metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu',
		moment: '../../../../js/libs/moment-with-locales.2.24.0',
		inspinia_v2_9_2: '../../../../js/libs/wb/inspinia.v2.9.2',
		slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll',
		lang_location: '../../../../js'
	},
	shim: {
		'bootstrapcolorpicker': ['jquery'],
		'slimscroll': ['jquery'],
		'datetimepicker': ['moment'],
		'common': ['jquery'],
		'metismenu': ['jquery', 'slimscroll'],
		'inspinia_v2_9_2': ['jquery', 'slimscroll', 'metismenu']
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
	'datetimepicker',
	'metismenu',
	'inspinia_v2_9_2'

], function($, common, localise, globals, moment) {

	var gUsers,
		gGroups,
		gOrganisationList,
		gEnterpriseList,
		gControlProjectCount,	// Number of projects that have been set - used to enable / disable control buttons
		gCurrentProjectIndex,	// Set while editing a projects details
		gCurrentRoleIndex,	// Set while editing a user role details
		gCurrentOrganisationIndex,
		gCurrentEnterpriseIndex,
		gCurrentUserIndex,		// Set while editing a users details
		gCurrentDeleteUsers,    // Users that have been selected for deletion, waiting on approval
		gOrgId,
		gSmsType;

	$(document).ready(function() {

		$("#side-menu").metisMenu();
		setCustomUserMgmt();			// Apply custom javascript

		localise.setlang();		// Localise HTML
		setupUserProfile(true);
		window.moment = moment;		// Make moment global for use by common.js
		enableDebugging();

		getSmsType();
		getUsers();
		getProjects();
		getLoggedInUser(userKnown, false, false, getOrganisations, false,
			false, getEnterprises, getServerDetails);
		getDeviceSettings();
		getWebformSettings();
		getAppearanceSettings();
		getSensitiveSettings();

		// Add change event on group and project filter
		$('#group_name, #project_name, #role_name, #org_name').change(function() {
			updateUserTable();
		});

		// Set button style and function
		$('#create_user').click(function () {
			openUserDialog(false, -1);
		});

		$('#create_project').click(function () {
			openProjectDialog(false, -1);
		});

		$('#create_user_role').click(function () {
			openRoleDialog(false, -1);
		});

		$('#create_organisation').click(function () {
			openOrganisationDialog(false, -1);
		});

		$('.move_to_organisation').click(function () {
			$('#move_to_organisation_popup').modal("show");
		});

		$('#create_enterprise').click(function () {
			openEnterpriseDialog(false, -1);
		});

		// Set up the tabs
		$('#usersTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#userPanel').show();
			setInLocalStorage("currentTab", '#usersTab a');
		});
		$('#projectsTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#projectPanel').show();
			setInLocalStorage("currentTab", '#projectsTab a');
		});
		$('#organisationTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#organisationPanel').show();
			setInLocalStorage("currentTab", '#organisationTab a');
		});
		$('#appearanceTab a').click(function (e) {
			e.preventDefault();
			$('.my_org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#appearancePanel').show();
			setInLocalStorage("currentTab", '#appearanceTab a');
		});
		$('#serverTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#serverPanel').show();
			setInLocalStorage("currentTab", '#serverTab a');
		});
		$('#roleTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#rolesPanel').show();
			setInLocalStorage("currentTab", '#roleTab a');
		});
		$('#deviceTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#devicePanel').show();
			setInLocalStorage("currentTab", '#deviceTab a');
		});
		$('#webformTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#webformPanel').show();
			setInLocalStorage("currentTab", '#webformTab a');
		});
		$('#sensitiveTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#sensitivePanel').show();
			setInLocalStorage("currentTab", '#sensitiveTab a');
		});
		$('#enterpriseTab a').click(function (e) {
			e.preventDefault();
			$('.org_alert').hide();
			$(this).tab('show');

			$(".usertab").hide();
			$('#enterprisePanel').show();
			setInLocalStorage("currentTab", '#enterpriseTab a');
		});

		// Style the upload buttons
		//$('.file-inputs').bootstrapFileInput();  todo

		// Copy user ident to email if it is a valid email
		$('#user_ident').blur(function(){
			var ident = $('#user_ident').val();

			if(validateEmails(ident)) {
				$('#user_email').val(ident);
			}

		});

		$('#current_enterprise').change(function(){
			getOrganisations($(this).val());
		});

		// Function to save a users details
		$('#userDetailsSave').click(function(e) {
			var userList = [],
				user = {},
				error = false,
				securityManagerChecked,
				validIdent = new RegExp('^[a-z0-9_]+$'),
				send_email = $('input[name=send_email]:checked', '#send_email_fields').val();

			// Ignore click if button disabled
			console.log($('#userDetailsSave').prop("disabled"));
			if($('#userDetailsSave').prop("disabled")) {
				return;
			}

			// Disable the save button to prevent double clicking
			$('#userDetailsSave').prop("disabled", true);

			if(gCurrentUserIndex === -1) {
				user.id = -1;
			} else {
				user.id = gUsers[gCurrentUserIndex].id;
			}
			user.ident = $('#user_ident').val();
			user.name = $('#user_name').val();
			user.email = $('#user_email').val();
			var newOrgId = $('#current_organisation').val();
			if(newOrgId !== globals.gOrgId) {
				user.o_id = newOrgId;
			} else {
				user.o_id = 0;
			}

			if(gCurrentUserIndex === -1 && send_email == "send_email") {
				user.sendEmail = true;
			} else {
				user.sendEmail = false;
			}

			// Validations
			if((!validIdent.test(user.ident) && !validateEmails(user.ident)) || user.ident.length == 0) {
				alert(localise.set["u_ident"]);
				$('#user_ident').focus();
				$('#userDetailsSave').prop("disabled", false);
				return false;
			}
			if(user.ident.indexOf(' ') !== -1) {
				alert(localise.set["msg_ui"]);
				$('#user_ident').focus();
				$('#userDetailsSave').prop("disabled", false);
				return false;
			}
			if(user.email.length > 0) {
				if(!validateEmails(user.email)) {
					error = true;
					alert(localise.set["msg_inv_email"]);
					$('#user_email').focus();
					$('#userDetailsSave').prop("disabled", false);
					return false;
				}
			}

			// For a new user, email must be specified if the send email check box is set
			if(user.sendEmail && user.email.length === 0) {
				error = true;
				alert(localise.set["msg_email_req"]);
				$('#user_email').focus();
				$('#userDetailsSave').prop("disabled", false);
				return false;
			}

			if($('#user_password').is(':visible')) {
				user.password = $('#user_password').val();
				if(user.password.length < 2) {
					error = true;
					user.password = undefined;
					alert(localise.set["msg_pwd_l"]);
					$('#user_password').focus();
					$('#userDetailsSave').prop("disabled", false);
					return false;
				}
				if($('#user_password_confirm').val() !== user.password) {
					error = true;
					user.password = undefined;
					alert(localise.set["msg_pwd_m"]);
					$('#user_password').focus();
					$('#userDetailsSave').prop("disabled", false);
					return false;
				}
			} else {
				user.password = undefined;
			}

			user.groups = [];
			user.projects = [];
			user.roles= [];
			user.orgs= [];
			securityManagerChecked = false;
			$('#user_groups').find('input:checked').each(function(index) {
				var val = $(this).val();
				user.groups[index] = {id: val};
				if(val == 6) {		// Security Management
					securityManagerChecked = true;
				}
			});
			if(globals.gIsOrgAdministrator && globals.gLoggedInUser.ident == user.ident) {
				// Update security manager setting straight away if the user is updating their own settings
				// as this affects ongoing use of the user management page
				globals.gIsSecurityAdministrator = securityManagerChecked;
			}
			$('#user_projects').find('input:checked').each(function(index) {
				user.projects[index] = {id: $(this).val()};
			});
			$('#user_roles').find('input:checked').each(function(index) {
				user.roles[index] = {id: $(this).val()};
			});
			$('#user_orgs').find('input:checked').each(function(index) {
				user.orgs[index] = {id: $(this).val()};
			});
			userList[0] = user;
			writeUserDetails(userList, $('#create_user_popup'));	// Save the user details to the database

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

		/*
		 * Add date time picker to usage date
		 */
		moment.locale();
		$('#usageDate').datetimepicker({
			useCurrent: false,
			format: "MM/YYYY",
			viewMode: "months",
			locale: gUserLocale || 'en'
		}).data("DateTimePicker").date(moment());

		/*
		 * Save a project details
		 */
		$('#projectSave').click(function(){
			var projectList = [],
				project = {},
				error = false;

			if(gCurrentProjectIndex === -1) {
				project.id = -1;
			} else {
				project.id = globals.gProjectList[gCurrentProjectIndex].id;
			}

			project.name = $('#p_name').val();
			project.desc = $('#p_desc').val();
			project.tasks_only = $('#p_tasks_only').is(':checked');

			projectList[0] = project;
			var projectString = JSON.stringify(projectList);

			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/json",
				cache: false,
				url: "/surveyKPI/projectList",
				data: { projects: projectString },
				success: function(data, status) {
					removeHourglass();
					getUsers();
					getProjects();
					$('#create_project_popup').modal("hide");
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();

					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = xhr.responseText;
						alert(localise.set["msg_err_upd"] + msg);
					}
				}
			});

		});

		/*
		 * Save a role details
		 */
		$('#roleSave').click(function(){
			var roleList = [],
				role = {},
				error = false;

			if(gCurrentRoleIndex === -1) {
				role.id = -1;
			} else {
				role.id = globals.gRoleList[gCurrentRoleIndex].id;
			}

			role.name = $('#ur_name').val();
			role.desc = $('#ur_desc').val();

			if(role.name.indexOf(',') >= 0) {
				alert(localise.set["msg_err_nc"]);
				return -1;
			}

			roleList[0] = role;
			var roleString = JSON.stringify(roleList);

			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/json",
				cache: false,
				url: "/surveyKPI/role/roles",
				data: { roles: roleString },
				success: function(data, status) {
					removeHourglass();
					getRoles(updateRoleTable);
					$('#create_role_popup').modal("hide");
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();

					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = xhr.responseText;
						alert(localise.set["msg_err_upd"] + msg);
					}
				}
			});

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
		 * Save the organisation details
		 */
		$('#organisationSave').click(function() {
			var organisationList = [],
				organisation = {
					appearance: {}
				},
				error = false,
				options=[],
				i;

			if(gCurrentOrganisationIndex === -1) {
				organisation.id = -1;
			} else {
				organisation.id = gOrganisationList[gCurrentOrganisationIndex].id;
			}

			organisation.name = $('#o_name').val();

			organisation.company_name = $('#o_company_name').val();
			organisation.company_address = $('#o_company_address').val();
			organisation.company_phone = $('#o_company_phone').val();
			organisation.company_email = $('#o_company_email').val();

			organisation.admin_email = $('#o_admin_email').val();
			organisation.smtp_host = $('#o_smtp_host').val();
			organisation.email_domain = $('#o_email_domain').val();
			organisation.email_user = $('#o_email_user').val();
			organisation.email_password = $('#o_email_password').val();
			organisation.email_port = parseInt($('#o_email_port').val());
			organisation.default_email_content = $('#o_default_email_content').val();
			organisation.locale = $('#o_language').val();
			organisation.timeZone = $('#o_tz').val();
			organisation.server_description = $('#o_server_description').val();

			if(typeof organisation.email_port !== "number") {
				organisation.email_port = 0;
			}
			// Validate
			if(organisation.name.length === 0) {
				alert(localise.set["msg_val_nm"]);
				$('#o_name').focus();
				return false;
			}
			if(organisation.admin_email.length > 0) {
				if(!validateEmails(organisation.admin_email)) {
					error = true;
					alert(localise.set["msg_inv_email"]);
					$('#o_admin_email').focus();
					return false;
				}
			}
			if(organisation.email_user.indexOf('@') > 0) {
				error = true;
				alert(localise.set["msg_email_dom"]);
				$('#o_email_user').focus();
				return false;
			}

			options = $(".puboption:checked").map(function(){
				return $(this).val();
			}).toArray();

			organisation.allow_email = false;
			organisation.allow_facebook = false;
			organisation.allow_twitter = false;
			organisation.can_edit = false;
			organisation.email_task = false;
			organisation.can_notify = false;
			organisation.can_use_api = false;
			organisation.can_submit = false;
			organisation.can_sms = false;
			organisation.appearance.set_as_theme = false;
			for(i = 0; i < options.length; i++) {
				if(options[i] === "email") {
					organisation.allow_email = true;
				} else if(options[i] === "facebook") {
					organisation.allow_facebook = true;
				} else if(options[i] === "twitter") {
					organisation.allow_twitter = true;
				} else if(options[i] === "can_edit") {
					organisation.can_edit = true;
				} else if(options[i] === "email_task") {
					organisation.email_task = true;
				} else if(options[i] === "ft_sync_incomplete") {
					organisation.ft_sync_incomplete = true;
				} else if(options[i] === "can_notify") {
					organisation.can_notify = true;
				} else if(options[i] === "can_use_api") {
					organisation.can_use_api = true;
				} else if(options[i] === "can_submit") {
					organisation.can_submit = true;
				} else if(options[i] === "set_as_theme") {
					organisation.appearance.set_as_theme = true;
				} else if(options[i] === "can_sms") {
					organisation.can_sms = true;
				}
			}
			organisation.appearance.navbar_color = $('#o_navbar_color').val();

			organisationList[0] = organisation;
			var organisationString = JSON.stringify(organisationList);

			$('#orgSettings').val(organisationString);
			var f = document.forms.namedItem("organisationsave");
			var formData = new FormData(f);

			addHourglass();
			$.ajax({
				type: 'POST',
				data: formData,
				cache: false,
				contentType: false,
				processData:false,
				url: "/surveyKPI/organisationList",
				success: function(data, status) {
					removeHourglass();
					getOrganisations();
					$('#create_organisation_popup').modal("hide");
				}, error: function(xhr, textStatus, err) {
					document.forms.namedItem("organisationsave").reset();
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						if(msg.indexOf("Conflict") >= 0) {
							msg = localise.set["msg_dup_name"];
						}
						alert(localise.set["msg_err_upd"] + ' ' + msg);
					}
				}
			});

		});


		/*
		 * Save the enterprise details
		 */
		$('#enterpriseSave').click(function() {
			var enterprise = {},
				error = false,
				i;

			if(gCurrentEnterpriseIndex === -1) {
				enterprise.id = -1;
			} else {
				enterprise.id = gEnterpriseList[gCurrentEnterpriseIndex].id;
			}

			enterprise.name = $('#e_name').val();

			// Validate
			if(enterprise.name.length === 0) {
				alert(localise.set["msg_val_nm"]);
				$('#e_name').focus();
				return false;
			}

			var enterpriseString = JSON.stringify(enterprise);

			addHourglass();
			$.ajax({
				type: 'POST',
				data: { data: enterpriseString },
				cache: false,
				url: "/surveyKPI/enterpriseList",
				success: function() {
					removeHourglass();
					$('#create_enterprise_popup').modal("hide");
					getEnterprises();
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = err;
						if(msg.indexOf("Conflict") >= 0) {
							msg = localise.set["msg_dup_name"];
						}
						alert(localise.set["msg_err_upd"] + ' ' + msg);
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
			device.ft_navigation = $('#ft_navigation').val();
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
				} else if(options[i] === "ft_admin_menu") {
					device.ft_admin_menu = true;
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

		/*
		 * Get a usage report
		 */
		$('#usageGet').click(function() {
			var usageMsec = $('#usageDate').data("DateTimePicker").date(),
				d = new Date(usageMsec),
				month = d.getMonth() + 1,
				year = d.getFullYear(),
				oId = gOrganisationList[gCurrentOrganisationIndex].id,
				period,
				month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

			// Calculate the period as text so the web service doesn't have to (can also use language translations here)
			period = month_names[month -1] + " " + year;

			$('#get_usage_popup').modal("hide");
			getUsage(oId, month, year, period);
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

		/*
         * Move an organisation to a new enterprise
         */
		$('#enterpriseMove').click(function(){
			var h = [],
				i = -1,
				idx,
				orgId,
				orgName,
				entName,
				msg;

			orgId = gOrganisationList[gCurrentOrganisationIndex].id;
			orgName = gOrganisationList[gCurrentOrganisationIndex].name;

			entId = $('#target_enterprise').val();
			entName = $('#target_enterprise :selected').text();

			msg = localise.set["u_check_mv_o"];
			msg = msg.replace("%s1", orgName);
			msg = msg.replace("%s2", entName);

			bootbox.confirm(msg, function(result){
				if(result) {
					moveToEnterprise(entId, orgId);
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

		// Respond to confirmation of a delete that requires the user to consider multiple choices
		$('#confirmDelUser').click(function () {
			var confirmValue = $("input[name='confirm_delete']:checked"). val();
			if(confirmValue === "delete_one") {
				gCurrentDeleteUsers[0].all = false;
				callUsersDeleteService(gCurrentDeleteUsers);
			} else if(confirmValue === "delete_all") {
				gCurrentDeleteUsers[0].all = true;
				callUsersDeleteService(gCurrentDeleteUsers);
			} else {
				// cancel just ignore
			}

			$('#del_user_confirm_popup').modal("hide");
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
		var currentTab = getFromLocalStorage("currentTab");
		if(currentTab) {
			$(currentTab).trigger('click');
		}

	});


	function userKnown() {
		getGroups();
		if(globals.gIsOrgAdministrator) {
			$('#appearanceTab').hide();
		}
		if(globals.gIsOrgAdministrator || globals.gIsSecurityAdministrator) {
			getRoles(updateRoleTable);
		}

	}

	/*
	 * Get the list of available projects from the server
	 */
	function getProjects() {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/projectList",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				globals.gProjectList = data;
				updateProjectList(true, 0);
				updateProjectTable();
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
	 * Get the list of available organisations from the server
	 */
	function getOrganisations(e_id) {

		var url = "/surveyKPI/organisationList";
		if(globals.gIsEnterpriseAdministrator && e_id) {
			url += '?enterprise=' + e_id;
		}
		// Show the current organisation
		$('#organisation_name').text(localise.set["c_org"] + ": " + globals.gLoggedInUser.organisation_name);

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				var ent_id = e_id;
				removeHourglass();
				if(!ent_id) {
					gOrganisationList = data;
					updateOrganisationTable();
					updateOrganisationList();
				} else {
					// Just update the single select that can choose a new organisation for a user in a new enterprise
					updateOrganisationNewEnterpriseList(data);
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
	 * Get the list of available enterprises from the server
	 */
	function getEnterprises() {

		// Show the current organisation
		var url = addTimeZoneToUrl("/surveyKPI/enterpriseList");
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gEnterpriseList = data;
				updateEnterpriseTable();
				updateEnterpriseList();
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

	}

	/*
	 * Show the user dialog
	 */
	function openUserDialog(existing, userIndex) {
		'use strict';
		var i,
			$user_groups = $('#user_groups'),
			$user_projects = $('#user_projects'),
			$user_roles = $('#user_roles'),
			$user_orgs = $('#user_orgs'),
			h,
			idx,
			filter_group,
			filter_project,
			filter_role,
			filter_org;

		gCurrentUserIndex = userIndex;

		filter_group = $('#group_name').val();
		h = [];
		idx = -1;
		for(i = 0; i < gGroups.length; i++) {
			if((gGroups[i].id !== globals.GROUP_ORG_ADMIN || globals.gIsOrgAdministrator) &&
				(gGroups[i].id !== globals.GROUP_SECURITY || globals.gIsOrgAdministrator || globals.gIsSecurityAdministrator) &&
				(gGroups[i].id != globals.GROUP_ENTERPRISE || globals.gIsEnterpriseAdministrator) &&
				gGroups[i].id !== globals.GROUP_OWNER
			) {
				h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
				h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
				h[++idx] = 'user_groups_cb' + i;
				h[++idx] = '" name="';
				h[++idx] = 'user_groups_cb';
				h[++idx] = '" value="';
				h[++idx] = gGroups[i].id + '"';
				if(filter_group === gGroups[i].name) {
					h[++idx] = ' checked="checked"';
				} else if(existing) {
					if(hasId(gUsers[userIndex].groups, gGroups[i].id)) {
						h[++idx] = ' checked="checked"';
					}
				}
				h[++idx] = '/> ';
				h[++idx] = '<label class="custom-control-label" for="';
				h[++idx] = 'user_groups_cb' + i;
				h[++idx] = '">';
				h[++idx] = gGroups[i].name;
				h[++idx] = '</label></div>';

			}
		}
		$user_groups.empty().append(h.join(''));

		// Add projects
		filter_project = $('#project_name').val();
		h = [];
		idx = -1;
		for(i = 0; i < globals.gProjectList.length; i++) {
			h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
			h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
			h[++idx] = 'user_projects_cb' + i;
			h[++idx] = '" name="';
			h[++idx] = 'user_projects_cb';
			h[++idx] = '" value="';
			h[++idx] = globals.gProjectList[i].id + '"';
			if(filter_project === globals.gProjectList[i].name) {
				h[++idx] = ' checked="checked"';
			} else if(existing) {

				if(hasId(gUsers[userIndex].projects, globals.gProjectList[i].id)) {
					h[++idx] = ' checked="checked"';
				}
			}
			h[++idx] = '/>';
			h[++idx] = '<label class="custom-control-label" for="';
			h[++idx] = 'user_projects_cb' + i;
			h[++idx] = '">';
			h[++idx] = globals.gProjectList[i].name;
			h[++idx] = '</label></div>';
		}
		$user_projects.empty().append(h.join(''));

		// Add roles
		if(globals.gRoleList) {
			filter_role = $('#role_name').val();
			h = [];
			idx = -1;
			for(i = 0; i < globals.gRoleList.length; i++) {
				h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
				h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
				h[++idx] = 'user_roles_cb' + i;
				h[++idx] = '" name="user_roles_cb"';
				h[++idx] = ' value="';
				h[++idx] = globals.gRoleList[i].id + '"';
				if(filter_role === globals.gRoleList[i].name) {
					h[++idx] = ' checked="checked"';
				} else if(existing) {
					if(hasId(gUsers[userIndex].roles, globals.gRoleList[i].id)) {
						h[++idx] = ' checked="checked"';
					}
				}
				h[++idx] = '/>';
				h[++idx] = '<label class="custom-control-label" for="';
				h[++idx] = 'user_roles_cb' + i;
				h[++idx] = '">';
				h[++idx] = globals.gRoleList[i].name;
				h[++idx] = '</label></div>';
			}
			$user_roles.empty().append(h.join(''));
		}

		// Add organisations
		if(gOrganisationList) {
			filter_org = $('#org_name').val();
			h = [];
			idx = -1;
			for(i = 0; i < gOrganisationList.length; i++) {
				h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
				h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
				h[++idx] = 'user_orgs_cb' + i;
				h[++idx] = '" name="user_orgs_cb"';
				h[++idx] = ' value="';
				h[++idx] = gOrganisationList[i].id + '"';
				if(filter_org === gOrganisationList[i].name) {
					h[++idx] = ' checked="checked"';
				} else if(existing) {

					if(hasId(gUsers[userIndex].orgs, gOrganisationList[i].id)) {
						h[++idx] = ' checked="checked"';
					}
				}
				h[++idx] = '/>';
				h[++idx] = '<label class="custom-control-label" for="';
				h[++idx] = 'user_orgs_cb' + i;
				h[++idx] = '">';
				h[++idx] = gOrganisationList[i].name;
				h[++idx] = '</label></div>';
			}
			$user_orgs.empty().append(h.join(''));
		}

		$('#user_create_form')[0].reset();
		if(!existing) {
			if($('#send_email').is(':checked')) {
				$('#password_fields').hide();
			} else {
				$('#password_fields').show();
			}
			$('#send_email_fields').show();
			$('#reset_password_fields').hide();
			$('#user_ident').prop('disabled', false);

			$('#current_organisation').val(globals.gOrgId);
		} else {
			$('#reset_password_fields').show();
			$('#send_email_fields').hide();
			$('#password_fields').hide();
			$('#user_ident').val(gUsers[userIndex].ident).prop('disabled', true);
			$('#user_name').val(gUsers[userIndex].name);
			$('#user_email').val(gUsers[userIndex].email);
			$('#current_organisation').val(gUsers[userIndex].o_id);
		}
		$('#current_enterprise').val(globals.gEntId);

		// Initialise the send email or set password radio buttons
		if(!existing) {
			if(globals.gServerCanSendEmail) {
				$('input[type=radio][name=send_email]').change(function() {
					if (this.value == 'send_email') {
						$('#password_fields').hide();
					} else if (this.value == 'set_password') {
						$('#password_fields').show();
					}
				});
			} else {
				$('#password_fields').show();
				$('input[type=radio][name=send_email]').prop('disabled',true);
				$('#set_password').prop('checked',true);
			}
		}

		$('#create_user_popup').modal("show");
	}

	/*
	 * Show the project dialog
	 */
	function openProjectDialog(existing, projectIndex) {

		gCurrentProjectIndex = projectIndex;


		$('#project_create_form')[0].reset();
		if(existing) {
			$('#p_name').val(globals.gProjectList[projectIndex].name);
			$('#p_desc').val(globals.gProjectList[projectIndex].desc);
			$('#p_tasks_only').prop('checked', globals.gProjectList[projectIndex].tasks_only);
		}

		$('#create_project_popup').modal("show");
	}

	/*
	 * Show the user role dialog
	 */
	function openRoleDialog(existing, roleIndex) {

		gCurrentRoleIndex = roleIndex;

		$('#role_create_form')[0].reset();
		if(existing) {
			$('#ur_name').val(globals.gRoleList[roleIndex].name);
			$('#ur_desc').val(globals.gRoleList[roleIndex].desc);
		}

		$('#create_role_popup').modal("show");
	}


	/*
	 * Show the organisation dialog
	 */
	function openOrganisationDialog(existing, organisationIndex) {

		if(gSmsType && gSmsType === "aws") {
			$('.awsSmsOnly').show();
		} else {
			$('.awsSmsOnly').hide();
		}

		var org = gOrganisationList[organisationIndex];
		gCurrentOrganisationIndex = organisationIndex;

		$('#organisation_create_form')[0].reset();
		$('#organisation_logo_form')[0].reset();
		$('#o_banner_logo').attr("src", "/images/smap_logo.png");

		if(existing) {
			$('#o_name').val(org.name);
			$('#o_company_name').val(org.company_name);
			$('#o_company_address').val(org.company_address);
			$('#o_company_phone').val(org.company_phone);
			$('#o_company_email').val(org.company_email);
			$('#o_admin_email').val(org.admin_email);
			$('#o_smtp_host').val(org.smtp_host);
			$('#o_email_domain').val(org.email_domain);
			$('#o_email_user').val(org.email_user);
			$('#o_email_password').val(org.email_password);
			$('#o_email_port').val(org.email_port);
			$('#o_default_email_content').val(org.default_email_content);
			$('#o_server_description').val(org.server_description);
			$('#o_navbar_color').colorpicker('setValue', org.appearance.navbar_color);
			$('.puboption').each(function() {
				console.log("option: " + $(this).val() );
				if($(this).val() === "email") {
					this.checked = org.allow_email;
				} else if($(this).val() === "facebook") {
					this.checked = org.allow_facebook;
				} else if($(this).val() === "twitter") {
					this.checked = org.allow_twitter;
				} else if($(this).val() === "can_edit") {
					this.checked = org.can_edit;
				} else if($(this).val() === "email_task") {
					this.checked = org.email_task;
				} else if($(this).val() === "ft_sync_incomplete") {
					this.checked = org.ft_sync_incomplete;
				} else if($(this).val() === "can_notify") {
					this.checked = org.can_notify;
				} else if($(this).val() === "can_use_api") {
					this.checked = org.can_use_api;
				} else if($(this).val() === "can_submit") {
					this.checked = org.can_submit;
				} else if($(this).val() === "can_sms") {
					this.checked = org.can_sms;
				} else if($(this).val() === "ft_odk_style_menus") {
					this.checked = org.ft_odk_style_menus;
				} else if($(this).val() === "ft_odk_style_menus") {
					this.checked = org.ft_odk_style_menus;
				} else if($(this).val() === "ft_specify_instancename") {
					this.checked = org.ft_specify_instancename;
				} else if($(this).val() === "ft_prevent_disable_track") {
					this.checked = org.ft_prevent_disable_track;
				} else if($(this).val() === "ft_admin_menu") {
					this.checked = org.ft_admin_menu;
				} else if($(this).val() === "ft_exit_track_menu") {
					this.checked = org.ft_exit_track_menu;
				} else if($(this).val() === "ft_review_final") {
					this.checked = org.ft_review_final;
				} else if($(this).val() === "set_as_theme") {
					this.checked = org.appearance.set_as_theme;
				}
			});
			addLanguageOptions($('#o_language'), org.locale);
			$('#o_tz').val(org.timeZone);

			gOrgId = org.id;
			setLogos(org.id);

		} else {
			$('#o_tz').val('UTC');
			addLanguageOptions($('#o_language'), undefined);
		}
		$('#create_organisation_popup').modal("show");
	}

	/*
	 * Show the enterprise edit dialog
	 */
	function openEnterpriseDialog(existing, enterpriseIndex) {

		var enterprise = gEnterpriseList[enterpriseIndex];
		gCurrentEnterpriseIndex = enterpriseIndex;

		$('#enterprise_create_form')[0].reset();

		if (existing) {
			$('#e_name').val(enterprise.name);
		}
		$('#create_enterprise_popup').modal("show");
	}

	function setLogos(orgId) {
		var d = new Date();
		$('#o_banner_logo').attr("src", "/surveyKPI/file/bannerLogo/organisation?settings=true&org=" + orgId + "&" + d.valueOf());
		$('#o_main_logo').attr("src", "/surveyKPI/file/mainLogo/organisation?settings=true&org=" + orgId + "&" + d.valueOf());
	}

	/*
	 * Update the server with the user details
	 */
	function writeUserDetails(userList, $dialog) {

		var userString = JSON.stringify(userList);

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/json",
			url: "/surveyKPI/userList",
			data: {users: userString},
			success: function (data, status) {
				removeHourglass();
				$('#userDetailsSave').prop("disabled", false);
				if (userList[0].ident == globals.gLoggedInUser.ident) {	// Restart if a user updated their own settings
					location.reload();
				} else {
					getUsers();
					$dialog.modal("hide");
				}
			}, error: function (xhr, textStatus, err) {
				removeHourglass();
				$('#userDetailsSave').prop("disabled", false);
				if (xhr.readyState == 0 || xhr.status == 0) {
					$dialog.modal("hide");
					return;  // Not an error
				} else {
					if (xhr.status === 409) {
						var msg;
						if (xhr.responseText.indexOf("email") > 0) {
							msg = localise.set["msg_dup_email"];
						} else {
							msg = localise.set["msg_dup_ident"];
						}
						alert(msg);
					} else {
						alert(localise.set["c_error"] + ": " + xhr.responseText);
					}
				}


			}
		});
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
				sms_url: $('#s_sms_url').val()
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
				$('.org_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_saved"]);
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				$('.org_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["t_ens"] + xhr.responseText);

			}
		});
	}

	/*
	 * Update the user table with the latest user data
	 */
	function updateUserTable() {

		var $userTable = $('#user_table'),
			i, user,
			h = [],
			idx = -1,
			filterGroup = true,
			filterProject = true,
			filterRole = true,
			filterOrg = true,
			yesGroup,
			yesProject,
			yesRole,
			yesOrg,
			project,
			group,
			projectStr,
			role,
			org;

		$('#controls').find('button').addClass("disabled");

		group = $('#group_name').val();
		projectStr = $('#project_name').val();
		role = $('#role_name').val();
		org = $('#org_name').val();

		project = Number(projectStr);

		if (!group || group === "All") {
			filterGroup = false;
		}
		if (project === 0) {
			filterProject = false;
		}
		if (!role || role == -1) {
			filterRole = false;
		}
		if (!org || org == -1) {
			filterOrg = false;
		}

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';
		h[++idx] = '<caption>' + localise.set["m_user"] + '</caption>';
		h[++idx] = '<thead>';
		h[++idx] = '<tr>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_id"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">'
		h[++idx] = localise.set["c_name"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">'
		h[++idx] = localise.set["u_co"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';

		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody>';


		for (i = 0; i < gUsers.length; i++) {
			user = gUsers[i];

			yesGroup = !filterGroup || hasName(user.groups, group);
			yesProject = !filterProject || hasId(user.projects, project);
			yesRole = !filterRole || hasId(user.roles, +role);
			yesOrg = !filterOrg || hasId(user.orgs, +org);

			if (yesGroup && yesProject && yesRole && yesOrg) {
				h[++idx] = '<tr>';
				h[++idx] = '<td class="user_edit_td"><button class="btn btn-default user_edit" style="width:100%;" value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = user.ident;
				h[++idx] = '</button></td>';
				h[++idx] = '<td style="text-align: center;">';
				h[++idx] = user.name;
				h[++idx] = '</td>';
				h[++idx] = '<td style="text-align: center;">';
				h[++idx] = user.current_org_name;
				h[++idx] = '</td>';

				h[++idx] = '<td>';
				h[++idx] = '<button type="button" data-idx="';
				h[++idx] = i;
				h[++idx] = '" class="btn btn-default btn-sm rm_user btn-danger">';
				h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
				h[++idx] = '</td>';

				h[++idx] = '</tr>';
			}
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$userTable.empty().append(h.join(''));
		$('.user_edit').click(function () {
			openUserDialog(true, $(this).val());
		});

		$(".rm_user", $('#user_table')).click(function(){
			var idx = $(this).data("idx");
			deleteUser(idx);
		});

	}

	/*
	 * Update the project table with the latest project data
	 */
	function updateProjectTable() {

		gControlProjectCount = 0;
		$('#project_controls').find('button').addClass("disabled");
		$('.move_to_organisation').addClass("disabled");

		var $projectTable = $('#project_table'),
			i, project,
			h = [],
			idx = -1;

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';
		h[++idx] = '<caption>' + localise.set["c_projects"] + '</caption>';
		h[++idx] = '<thead>';
		h[++idx] = '<tr>';
		h[++idx] = '<th></th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_id"];	// Project Id
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_name"];	// Name
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["u_chg"];	// Changed by
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';
		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody>';


		for (i = 0; i < globals.gProjectList.length; i++) {
			project = globals.gProjectList[i];

			h[++idx] = '<tr>';
			h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
			h[++idx] = i;
			h[++idx] = '"></td>';
			h[++idx] = '<td>';
			h[++idx] = project.id;
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button class="btn btn-default project_edit" style="width:100%;" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = project.name;
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = project.changed_by;
			h[++idx] = '</td>';

			h[++idx] = '<td>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_project btn-danger">';
			h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
			h[++idx] = '</td>';

			h[++idx] = '</tr>';
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$projectTable.empty().append(h.join('')).find('table');
		$('.project_edit').click(function () {
			openProjectDialog(true, $(this).val());
		});

		$(".rm_project", $('#project_table')).click(function(){
			var idx = $(this).data("idx");
			deleteProject(idx);
		});

		$('#project_table .control_td').find('input').click(function () {
			if ($(this).is(':checked')) {

				++gControlProjectCount;
				if (gControlProjectCount === 1) {
					$('#project_controls').find('button').removeClass("disabled");
					$('.move_to_organisation').removeClass("disabled");
				}
			} else {

				--gControlProjectCount;
				if (gControlProjectCount === 0) {
					$('#project_controls').find('button').addClass("disabled");
					if (gControlProjectCount === 0) {
						$('.move_to_organisation').addClass("disabled");
					}
				}
			}

		});

	}

	/*
	 * Update the user role table with the latest list of roles
	 */
	function updateRoleTable() {


		var $tab = $('#role_table'),
			i, role,
			h = [],
			idx = -1;

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';
		h[++idx] = '<thead>';
		h[++idx] = '<tr>';
		h[++idx] = '<th></th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_id"];	// Id
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_name"];	// Name
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["u_chg"];	// Changed by
		h[++idx] = '</th>';
		h[++idx] = '<th scope="col">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';
		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody>';


		for (i = 0; i < globals.gRoleList.length; i++) {
			role = globals.gRoleList[i];

			h[++idx] = '<tr>';
			h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
			h[++idx] = i;
			h[++idx] = '"></td>';
			h[++idx] = '<td>';
			h[++idx] = role.id;
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button class="btn btn-default role_edit" style="width:100%;" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = role.name;
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = role.changed_by;
			h[++idx] = '</td>';

			h[++idx] = '<td>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_role btn-danger">';
			h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
			h[++idx] = '</td>';

			h[++idx] = '</tr>';
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$tab.empty().append(h.join(''));

		$('.role_edit', $tab).click(function () {
			openRoleDialog(true, $(this).val());
		});

		$(".rm_role", $('#role_table')).click(function(){
			var idx = $(this).data("idx");
			deleteRole(idx);
		});

		/*
		 * Update the role filter select on the users page
		 */
		var $roleSelect = $('#role_name');

		h = [];
		idx = -1;

		h[++idx] = '<option value="-1">' + localise.set["c_all"] + '</option>';
		for (i = 0; i < globals.gRoleList.length; i++) {

			role = globals.gRoleList[i];

			if ((globals.gIsSecurityAdministrator)) {
				h[++idx] = '<option value="';
				h[++idx] = role.id;
				h[++idx] = '">';
				h[++idx] = role.name;
				h[++idx] = '</option>';
			}
		}
		$roleSelect.empty().append(h.join(''));
		$roleSelect.val("-1");

	}

	/*
	 * Update the organisation table with the latest organisation data
	 */
	function updateOrganisationTable() {

		var $organisationTable = $('#organisation_table'),
			i, organisation,
			h = [],
			idx = -1,
			bs = isBusinessServer();

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';
		h[++idx] = '<thead>';
		h[++idx] = '<tr>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_id"];	// Id
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_name"];	// Name
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["u_chg"];	// Changed by
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_action"];	// Action
		h[++idx] = '</th>';
		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody>';


		for (i = 0; i < gOrganisationList.length; i++) {
			organisation = gOrganisationList[i];

			h[++idx] = '<tr>';
			h[++idx] = '<td>';
			h[++idx] = organisation.id;
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button style="width:100%;" class="btn btn-default organisation_edit" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = organisation.name;
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = organisation.changed_by;
			h[++idx] = '</td>';
			h[++idx] = '<td class="usage_report_td">';

			if (bs) {
				h[++idx] = '<button style="margin-right:2px;" class="btn btn-default btn-sm btn-warning usage_report" value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = localise.set["u_usage"];
				h[++idx] = ' <span class="glyphicon glyphicon-download" aria-hidden="true"></span>';
				h[++idx] = '</button>';
			}
			if(globals.gIsEnterpriseAdministrator) {
				h[++idx] = '<button style="margin-right:2px;" class="btn btn-default btn-sm btn-info move_org" value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = localise.set["c_move"];
				h[++idx] = ' <span class="glyphicon glyphicon-move" aria-hidden="true"></span>';
				h[++idx] = '</button>';
			}

			h[++idx] = '<button type="button" value="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm organisation_edit warning">';
			h[++idx] = '<span class="glyphicon glyphicon-edit" aria-hidden="true"></span></button>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_org btn-danger">';
			h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
			h[++idx] = '</td>';
			h[++idx] = '</tr>';
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$organisationTable.empty().append(h.join(''));
		$('.organisation_edit').click(function () {
			openOrganisationDialog(true, $(this).val());
		});
		$('.usage_report', '#organisation_table').click(function () {
			gCurrentOrganisationIndex = $(this).val();
			$('#get_usage_popup').modal("show");
		});
		$(".rm_org", $('#organisation_table')).click(function(){
			var idx = $(this).data("idx");
			deleteOrganisations(idx);
		});
		$(".move_org", $('#organisation_table')).click(function(){
			gCurrentOrganisationIndex = $(this).val();
			$('#move_to_enterprise_popup').modal("show");
		});

		/*
         * Update the org filter select on the users page
         */
		var $orgSelect = $('#org_name');

		h = [];
		idx = -1;

		h[++idx] = '<option value="-1">' + localise.set["c_all"] + '</option>';
		for (i = 0; i < gOrganisationList.length; i++) {

			organisation = gOrganisationList[i];

			if ((globals.gIsOrgAdministrator)) {
				h[++idx] = '<option value="';
				h[++idx] = organisation.id;
				h[++idx] = '">';
				h[++idx] = organisation.name;
				h[++idx] = '</option>';
			}
		}
		$orgSelect.empty().append(h.join(''));
		$orgSelect.val("-1");
	}

	/*
	 * Update the organisation table with the latest organisation data
	 */
	function updateEnterpriseTable() {

		$('#enterprise_controls').find('button').addClass("disabled");

		var $enterpriseTable = $('#enterprise_table'),
			i, enterprise,
			h = [],
			idx = -1;

		h[++idx] = '<table class="table table-striped">';
		h[++idx] = '<thead>';
		h[++idx] = '<tr>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_id"];	// Id
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_name"];	// Name
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["u_chg"];	// Changed by
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["bill_chg_date"] +
			' (' + globals.gTimezone + ')';	// Changed time
		h[++idx] = '</th>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';
		h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		h[++idx] = '<tbody>';


		for (i = 0; i < gEnterpriseList.length; i++) {
			enterprise = gEnterpriseList[i];

			h[++idx] = '<tr>';
			h[++idx] = '<td>';
			h[++idx] = enterprise.id;
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button style="width:100%;" class="btn btn-default enterprise_edit" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = enterprise.name;
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = enterprise.changed_by;
			h[++idx] = '</td>';
			h[++idx] = '<td>';
			h[++idx] = enterprise.changed_ts;
			h[++idx] = '</td>';
			h[++idx] = '<td>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_ent danger">';
			h[++idx] = '<span class="glyphicon glyphicon-trash" aria-hidden="true"></span></button>';
			h[++idx] = '</td>';
			h[++idx] = '</tr>';
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';

		$enterpriseTable.empty().append(h.join(''));
		$('.enterprise_edit').click(function () {
			openEnterpriseDialog(true, $(this).val());
		});

		$(".rm_ent", $('#enterprise_table')).click(function(){
			var idx = $(this).data("idx");
			deleteEnterprises(idx);
		});

	}

	/*
	 * Update simple organisation selects
	 */
	function updateOrganisationList() {

		var $organisationSelect = $('.organisation_select'),
			$newOrganisationSelect = $('.new_organisation_select'),
			i, organisation,
			h = [],
			idx = -1,
			hNew = [],
			idxNew = -1;

		for(i = 0; i < gOrganisationList.length; i++) {
			organisation = gOrganisationList[i];

			h[++idx] = '<option value="';
			h[++idx] = organisation.id;
			h[++idx] = '">';
			h[++idx] = organisation.name;
			h[++idx] = '</option>';

			if(organisation.id !== globals.gOrgId) {
				hNew[++idxNew] = '<option value="';
				hNew[++idxNew] = organisation.id;
				hNew[++idxNew] = '">';
				hNew[++idxNew] = organisation.name;
				hNew[++idxNew] = '</option>';
			}
		}

		$organisationSelect.empty().append(h.join(''));
		$newOrganisationSelect.empty().append(hNew.join(''));
		$organisationSelect.val(globals.gOrgId);
	}

	/*
     * Update select for organisations when changing a users enterprise
     */
	function updateOrganisationNewEnterpriseList(data) {

		var $organisationSelect = $('#current_organisation'),
			i, organisation,
			h = [],
			idx = -1;

		for(i = 0; i < data.length; i++) {
			organisation = data[i];

			h[++idx] = '<option value="';
			h[++idx] = organisation.id;
			h[++idx] = '">';
			h[++idx] = organisation.name;
			h[++idx] = '</option>';

		}

		$organisationSelect.empty().append(h.join(''));
	}

	/*
     * Update simple enterprise selects
     */
	function updateEnterpriseList() {

		var $enterpriseSelect = $('.enterprise_select'),
			$newEnterpriseSelect = $('.new_enterprise_select'),
			i, enterprise,
			h = [],
			idx = -1,
			hNew = [],
			idxNew = -1,
			newEnterpriseCount = 0;

		for(i = 0; i < gEnterpriseList.length; i++) {
			enterprise = gEnterpriseList[i];

			h[++idx] = '<option value="';
			h[++idx] = enterprise.id;
			h[++idx] = '">';
			h[++idx] = enterprise.name;
			h[++idx] = '</option>';

			if(enterprise.id != globals.gEntId) {
				hNew[++idxNew] = '<option value="';
				hNew[++idxNew] = enterprise.id;
				hNew[++idxNew] = '">';
				hNew[++idxNew] = enterprise.name;
				hNew[++idxNew] = '</option>';
				newEnterpriseCount++;
			}
		}

		$newEnterpriseSelect.empty().append(hNew.join(''));
		if(newEnterpriseCount < 1) {
			$('.only_one', '#move_to_enterprise_popup').show();
			$('.many', '#move_to_enterprise_popup').hide();
			$('#enterpriseMove').addClass("disabled");
		} else {
			$('.only_one', '#move_to_enterprise_popup').hide();
			$('.many', '#move_to_enterprise_popup').show();
			$('#enterpriseMove').removeClass("disabled");
		}
		$enterpriseSelect.empty().append(h.join(''));

		$enterpriseSelect.val(globals.gEntId);
	}

// Return true if the item with the name is in the list
	function hasName(itemList, item) {
		var i;
		for(i = 0; i < itemList.length; i++) {
			if(itemList[i].name === item) {
				return true;
			}
		}
		return false;
	}

//Return true if the item with the id is in the list
	function hasId(itemList, item) {
		var i;
		if(itemList) {
			for(i = 0; i < itemList.length; i++) {
				if(itemList[i].id === item) {
					return true;
				}
			}
		}
		return false;
	}

	/*
	 * Get the list of users from the server
	 */
	function getUsers() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/userList",
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gUsers = data;
				updateUserTable();
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get list of users: " + err);
				}
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
				h[++idx] = gGroups[i].name;
				h[++idx] = '</option>';
			}
		}
		$groupSelect.empty().append(h.join(''));
		$groupSelect.val("All");
	}

	/*
	 * Delete the selected user
	 */
	function deleteUser (userIdx) {

		var users = [],
			decision = false,
			deleteAll = false,
			userName,
			i;

		/*
		$('#user_table').find('input:checked').each(function(index) {
			userIdx = $(this).val();
			users[index] = {id: gUsers[userIdx].id};
			h[++i] = gUsers[userIdx].name;
		});
		*/
		userName = gUsers[userIdx].name;
		users[0] = {id: gUsers[userIdx].id};

		if(globals.gIsOrgAdministrator && gUsers[userIdx].orgs.length > 1) {

			$('#confirmDelForm')[0].reset();
			var orgList = '';
			for(i = 0; i < gUsers[userIdx].orgs.length; i++) {
				if(orgList.length > 0) {
					orgList += ', ';
				}
				orgList += gUsers[userIdx].orgs[i].name;
			}

			// Set message for the delete one option
			var msg_one = localise.set["msg_confirm_del_one"];
			msg_one = msg_one.replace('%s1', userName);
			msg_one = msg_one.replace('%s2', $('#me_organisation option:selected').html());
			$('#confirmDelOne').html(msg_one);

			// Set message for the delete all option
			var msg_all = localise.set["msg_confirm_del_all"];
			msg_all = msg_all.replace('%s1', userName);
			msg_all = msg_all.replace('%s2', orgList);
			$('#confirmDelAll').html(msg_all);

			gCurrentDeleteUsers = users;      // Save in case they say yes

			$('#del_user_confirm_popup').modal("show");
			return;
		} else {
			decision = confirm(localise.set["msg_confirm_del"] + " " + userName);
		}

		if (decision === true) {
			callUsersDeleteService(users);
		}
	}

	/*
	 * Call the sevice that will delete the users
	 */
	function callUsersDeleteService(users) {
		addHourglass();
		$.ajax({
			type: "DELETE",
			contentType: "application/json",
			url: "/surveyKPI/userList",
			data: { users: JSON.stringify(users) },
			success: function(data, status) {
				removeHourglass();
				getUsers();
			}, error: function(data, status) {
				var msg = localise.set["msg_err_del"];
				removeHourglass();
				if(typeof data != "undefined" && typeof data.responseText != "undefined" ) {
					msg = data.responseText;
				}
				alert(msg);
			}
		});
	}
	/*
	 * Delete the selected projects
	 */
	function deleteProject (projectIdx) {

		var projects = [],
			decision = false;

		projects[0] = {id: globals.gProjectList[projectIdx].id};

		decision = confirm(localise.set["msg_del_projects"] + ' ' + globals.gProjectList[projectIdx].name);
		if (decision === true) {
			addHourglass();
			$.ajax({
				type: "DELETE",
				contentType: "application/json",
				url: "/surveyKPI/projectList",
				data: { projects: JSON.stringify(projects) },
				success: function(data, status) {
					removeHourglass();
					getProjects();
				}, error: function(data, status) {
					removeHourglass();
					if(data && data.responseText) {
						alert(data.responseText);
					} else {
						alert(localise.set["msg_err_del"]);
					}
				}
			});
		}
	}

	/*
	 * Delete the roles
	 */
	function deleteRole (roleIdx) {

		var roles = [],
			decision = false,
			$dialog;

		roles[0] = {id: globals.gRoleList[roleIdx].id};

		bootbox.confirm(localise.set["msg_del_roles"] +  ' ' + globals.gRoleList[roleIdx].name, function(decision) {
			if (decision === true) {
				addHourglass();
				$.ajax({
					type: "DELETE",
					contentType: "application/json",
					url: "/surveyKPI/role/roles",
					data: { roles: JSON.stringify(roles) },
					success: function(data, status) {
						removeHourglass();
						getRoles(updateRoleTable);
					}, error: function(data, status) {
						removeHourglass();
						if(data && data.responseText) {
							alert(data.responseText);
						} else {
							alert(localise.set["msg_err_del"]);
						}
					}
				});
			}
		});
	}

	/*
	 * Delete the selected organisations
	 */
	function deleteOrganisations (orgIdx) {

		var organisations = [],
			decision = false,
			orgName;

		organisations[0] = {id: gOrganisationList[orgIdx].id, name: gOrganisationList[orgIdx].name};
		orgName = gOrganisationList[orgIdx].name;

		decision = confirm(localise.set["msg_del_orgs"] + " " + orgName);
		if (decision === true) {
			addHourglass();
			$.ajax({
				type: "DELETE",
				contentType: "application/json",
				url: "/surveyKPI/organisationList",
				data: { organisations: JSON.stringify(organisations) },
				success: function(data, status) {
					removeHourglass();
					getOrganisations();
				}, error: function(data, status) {
					removeHourglass();
					if(data && data.responseText) {
						alert(data.responseText);
					} else {
						alert(localise.set["msg_err_del"]);
					}
				}
			});
		}
	}

	/*
     * Delete the selected enterprises
     */
	function deleteEnterprises (entIdx) {

		var enterprises = [],
			decision = false,
			h = [],
			i = -1;

		enterprises[0] = {id: gEnterpriseList[entIdx].id, name: gEnterpriseList[entIdx].name};


		decision = confirm(localise.set["msg_del_ents"] + " " + gEnterpriseList[entIdx].name);
		if (decision === true) {
			addHourglass();
			$.ajax({
				type: "DELETE",
				contentType: "application/json",
				url: "/surveyKPI/enterpriseList",
				data: { data: JSON.stringify(enterprises) },
				success: function(data, status) {
					removeHourglass();
					getEnterprises();
				}, error: function(data, status) {
					removeHourglass();
					if(data && data.responseText) {
						alert(data.responseText);
					} else {
						alert(localise.set["msg_err_del"]);
					}
				}
			});
		}
	}

	/*
	 * Move the provided projects to the selected organisation
	 */
	function moveToOrganisations (orgId, projects) {

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/json",
			cache: false,
			url: "/surveyKPI/organisationList/setOrganisation",
			data: {
				orgId: orgId,
				projects: JSON.stringify(projects)
			},
			success: function(data, status) {
				removeHourglass();
				window.location.reload();
			}, error: function(data, status) {
				removeHourglass();
				if(data && data.responseText) {
					alert(data.responseText);
				} else {
					alert(localise.set["c_error"]);
				}
			}
		});
	}

	/*
     * Move the provided users and projects to the selected organisation
     */
	function moveToEnterprise (entId, orgId) {

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/json",
			cache: false,
			url: "/surveyKPI/organisationList/setEnterprise",
			data: {
				entId: entId,
				orgId: orgId
			},
			success: function(data, status) {
				removeHourglass();
				window.location.reload();
			}, error: function(data, status) {
				removeHourglass();
				if(data && data.responseText) {
					alert(data.responseText);
				} else {
					alert(localise.set["c_error"]);
				}
			}
		});
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
					} else if($(this).val() === "ft_admin_menu") {
						this.checked = device.ft_admin_menu;
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
				$('#ft_navigation').val(device.ft_navigation);
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


});

