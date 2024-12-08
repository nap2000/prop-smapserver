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
		lang_location: '../../../../js',
		qrcode: '../../../../js/libs/jquery-qrcode-0.14.0.min',
	},
	shim: {
		'bootstrapcolorpicker': ['jquery'],
		'slimscroll': ['jquery'],
		'datetimepicker': ['moment'],
		'common': ['jquery'],
		'qrcode': ['jquery'],
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
	'qrcode'

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
		gSmsType,
		gNumberIdx,
		gPanel;

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
			id: 'o_sentiment_limit',
			name: 'sentiment',
			label: 'sentiment',
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
		setTheme();
		setupUserProfile(true);
		window.moment = moment;		// Make moment global for use by common.js
		enableDebugging();

		getSmsType();
		getProjects();
		getLoggedInUser(userKnown, false, false, getOrganisations, false,
			false, getEnterprises, undefined, getSMSNumbers);

		// Add change event on group and project filter
		$('#group_name, #project_name, #role_name, #org_name').change(function() {
			updateUserTable();
		});

		// Set button style and function
		$('#create_user').click(function () {
			openUserDialog(false, -1, false);
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
			if(!$(this).hasClass("disabled")) {
				$('#move_to_organisation_popup').modal("show");
			}
		});

		$('#create_enterprise').click(function () {
			openEnterpriseDialog(false, -1);
		});

		// Set up the tabs
		gPanel='users';
		$('#usersTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'users');
		});
		$('#projectsTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'projects');
		});
		$('#organisationTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'organisation');
		});
		$('#appearanceTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'appearance');
		});
		$('#serverTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'server');
		});
		$('#roleTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'role');
		});
		$('#deviceTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'device');
		});
		$('#webformTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'webform');
		});
		$('#enterpriseTab a').on('click', function (e) {
			e.preventDefault();
			panelChange($(this), 'enterprise');
		});
		$('#smsTab a').on('click',function (e) {
			e.preventDefault();
			panelChange($(this), 'sms');
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
				validIdent = new RegExp('^[a-z0-9_-]+$'),
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
			// By setting organisationId to zero, all changes will be made in the organisation of the administrator
			user.o_id = 0;

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
					alert(localise.set["msg_inv_email"]);
					$('#user_email').focus();
					$('#userDetailsSave').prop("disabled", false);
					return false;
				}
			}
			if(!validGeneralName(user.name)) {
				alert(localise.set["msg_val_gen_nm"]);
				$('#user_name').focus();
				$('#userDetailsSave').prop("disabled", false);
				return false;
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

			project.users = [];
			$('#p_user_projects').find('input:checked').each(function(index) {
				project.users[index] = $(this).val();
			});

			projectList[0] = project;
			var projectString = JSON.stringify(projectList);

			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/x-www-form-urlencoded",
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
						alert(localise.set["msg_err_upd"] + " " + xhr.responseText);  // Alerts htmlencode text already
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

			role.users = [];
			$('#p_user_roles').find('input:checked').each(function(index) {
				role.users[index] = $(this).val();
			});

			roleList[0] = role;
			var roleString = JSON.stringify(roleList);

			addHourglass();
			$.ajax({
				type: "POST",
				contentType: "application/x-www-form-urlencoded",
				cache: false,
				url: "/surveyKPI/role/roles",
				data: { roles: roleString },
				success: function(data, status) {
					removeHourglass();
					getUsers();
					getRoles(updateRoleTable);
					$('#create_role_popup').modal("hide");
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();

					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_upd"] + xhr.responseText);
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

			if(!gCurrentOrganisationIndex || gCurrentOrganisationIndex === -1) {
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

			var eu = $('#o_email_user').val();      // avoid autofill
			if(eu === '-') {
				eu = undefined;
			}
			organisation.email_user = eu;

			organisation.email_password = $('#o_email_password').val();
			organisation.email_port = parseInt($('#o_email_port').val());
			organisation.default_email_content = $('#o_default_email_content').val();
			organisation.locale = $('#o_language').val();
			organisation.refresh_rate = parseInt($('#o_refresh_rate').val());
			organisation.timeZone = $('#o_tz').val();
			organisation.server_description = $('#o_server_description').val();
			organisation.password_strength = $('#o_password_strength').val();
			organisation.password_strength = organisation.password_strength || "0";
			organisation.map_source = $('#o_map_source').val();

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
			if(organisation.email_user && organisation.email_user.indexOf('@') > 0) {
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
			organisation.send_optin = false;
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
				} else if(options[i] === "send_optin") {
					organisation.send_optin = true;
				}
			}

			// Add usage limits
			organisation.limits = {};
			for(i = 0; i < limitTypes.length; i++) {
				var limit = $('#' + limitTypes[i].id).val();
				limit = limit || 0;
				organisation.limits[limitTypes[i].name] = limit;
			}

			organisationList[0] = organisation;
			var organisationString = JSON.stringify(organisationList);

			addHourglass();
			$.ajax({
				type: 'POST',
				data: { settings: organisationString },
				cache: false,
				contentType: "application/x-www-form-urlencoded",
				url: "/surveyKPI/organisationList",
				success: function(data, status) {
					removeHourglass();
					getLoggedInUser(userKnown, false, false, getOrganisations, false,
						false, getEnterprises, undefined);
					$('#create_organisation_popup').modal("hide");
				}, error: function(xhr, textStatus, err) {
					removeHourglass();
					if(xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						var msg = (xhr.responseText) ? xhr.responseText : err;
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
						var msg = xhr.responseText;
						if(msg.indexOf("duplicate key") >= 0) {
							msg = localise.set["msg_dup_name"];
						}
						alert(localise.set["msg_err_upd"] + ' ' +  msg);
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
		 * Get a usage report
		 */
		$('#usage_report_save').click(function(){
			executeUsageReport(gOrganisationList[gCurrentOrganisationIndex].id);
		});

		/*
		 * Move a project to a new organisation
		 */
		$('#organisationMove').click(function(){
			if(gPanel === 'projects') {
				moveProjects();
			} else if(gPanel === 'users') {
				moveUsers();
			} else {
				alert("error: unkowem panel requesting move: " + gPanel);
			}
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

			bootbox.confirm(htmlEncode(msg), function(result){
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
		var currentTab = getFromLocalStorage("currentTab" + page);
		if(currentTab) {
			$(currentTab).trigger('click');
		} else {
			$('#usersTab a').trigger('click');
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
			document.forms.namedItem("importFile").reset();
			$('#importFileLabel').text("");
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
			$(this).next('.custom-file-label').text(fileName);
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
					$('#upload_css_popup').modal("hide");
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					var msg = htmlEncode(xhr.responseText);
					if(handleLogout(msg)) {
						if (msg && msg === "only csv") {
							msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
						} else {
							msg = localise.set["t_efnl"] + " " + msg
						}

						$('.load_file_alert').show().removeClass('alert-success').addClass('alert-danger').text(msg);
					}
				}
			});
		});

		/*
		 * SMS Numbers
		 */
		$('#addNumber').click(function() {
			$('#addSmsNumber').val('');
			$('#addSmsOrganisation').val(globals.gOrgId);

			$('.add_sms_alert').hide();
			$('#add_sms_popup').modal("show");
		});

		$('#smsProject').change(function() {
			loadSurveyIdentList($(this).val(), gNumbers[gNumberIdx].surveyIdent,false, true);			// Get surveys
		});
		$('#smsSurvey').change(function() {
			getQuestionsInSurvey($('.select_question'), undefined, $(this).val(), true, true, undefined, false);
		});

		/*
 		 * Add a new number
 		 */
		$('#addSmsSave').click(function(){

			var number = $('#addSmsNumber').val(),
				org = $('#addSmsOrganisation').val(),
				channel = $('#addSmsChannel').val();

			// TODO validate
			var sms = {
				ourNumber: number,
				channel:channel,
				oId: org
			}

			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				data: sms,
				cache: false,
				url: "/surveyKPI/smsnumbers/number/add",
				success: function(data, status) {
					removeHourglass();
					if(handleLogout(data)) {
						getSMSNumbers();
						$('#add_sms_popup').modal("hide");
					}
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(handleLogout(xhr.responseText)) {
						$('.add_sms_alert').show().removeClass('alert-success').addClass('alert-danger').html(htmlEncode(xhr.responseText));
					}
				}
			});
		});

		/*
  		 * Edit a number
  		 */
		$('#editSmsSave').click(function(){

			var number = gNumbers[gNumberIdx].ourNumber,
				org = $('#smsOrganisation').val(),
				sIdent = $('#smsSurvey').val(),
				theirNumberQuestion = $('#theirNumberQuestion').val(),
				messageQuestion = $('#messageQuestion').val();

			/*
			 * If the organisation has changed then clear the survey data
			 */
			if(org != gNumbers[gNumberIdx].oId) {		// note org will have a string value, the original id will be integer
				sIdent = undefined;
				theirNumberQuestion = 0;
				messageQuestion = 0;
			}
			if(sIdent === "_none") {
				sIdent = undefined;
			}
			// TODO validate number
			var sms = {
				ourNumber: number,
				oId: org,
				sIdent: sIdent,
				theirNumberQuestion: theirNumberQuestion,
				messageQuestion: messageQuestion,
				mcMsg: $('#mcMsg').val()
			}

			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				data: sms,
				cache: false,
				url: "/surveyKPI/smsnumbers/number/edit",
				success: function(data, status) {
					removeHourglass();
					if(handleLogout(data)) {
						getSMSNumbers();
						$('#edit_sms_popup').modal("hide");
					}
				},
				error: function(xhr, textStatus, err) {
					removeHourglass();
					if(handleLogout(xhr.responseText)) {
						var msg = htmlEncode(xhr.responseText);
						$('.edit_sms_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);
					}
				}
			});
		});

		// Toggle select all
		$('#sau').click(function() {
			var selected = $(this).is(':checked');
			$('#p_user_projects').find('input').each(function(){
				$(this).prop('checked', selected);
			});
		});

	});

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
			$('#m_import_xls, #m_export_xls').addClass("disabled");
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
				if(handleLogout(data)) {
					var cb = callback;
					var param1 = p1;
					$('#load_file_alert').removeClass('alert-danger').addClass('alert-success').text(data);
					$('#load_file_alert').show();
					$('#importFile').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					$('#importFileLabel').text("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					cb(param1);
				}

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				var msg = xhr.responseText;
				if(handleLogout(msg)) {
					msg = msg || localise.set["e_unknown"];
					$('#load_file_alert').show().removeClass('alert-success').addClass('alert-danger').text(msg);
					$('#importFile').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
					$('#importFileLabel').text("");     // Work around ERR_UPLOAD_FILE_CHANGED error
				}
			}
		});
	}


	function userKnown() {
		getUsers();
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
				updateProjectList(true, 0, undefined, $('.project_list'));
				updateProjectList(false, 0, undefined, $('.project_list_min'));
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
				if(handleLogout(data)) {
					if (!ent_id) {
						gOrganisationList = data;
						updateOrganisationTable();
						updateOrganisationList();
					} else {
						// Just update the single select that can choose a new organisation for a user in a new enterprise
						updateOrganisationNewEnterpriseList(data);
					}
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
	 * Show the user dialog
	 */
	function openUserDialog(existing, userIndex, oo) {
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
		let hasDashboard = getCustomMenuClass() === '.xxxx1';

		filter_group = $('#group_name').val();
		h = [];
		idx = -1;
		for(i = 0; i < gGroups.length; i++) {
			if((gGroups[i].id !== globals.GROUP_ORG_ADMIN || globals.gIsOrgAdministrator || globals.gIsEnterpriseAdministrator || globals.gIsServerOwner) &&
				(gGroups[i].id !== globals.GROUP_DASHBOARD || hasDashboard || globals.gIsServerOwner) &&
				(gGroups[i].id !== globals.GROUP_SECURITY || globals.gIsOrgAdministrator || globals.gIsSecurityAdministrator  || globals.gIsServerOwner) &&
				(gGroups[i].id != globals.GROUP_ENTERPRISE || globals.gIsEnterpriseAdministrator  || globals.gIsServerOwner) &&
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
				h[++idx] = localise.set[gGroups[i].name];
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
			h[++idx] = htmlEncode(globals.gProjectList[i].name);
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
				h[++idx] = htmlEncode(globals.gRoleList[i].name);
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
				h[++idx] = htmlEncode(gOrganisationList[i].name);
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
		}

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

		/*
		 * If the user is in another organisation then hide the controls they cannot change
		 */
		if(oo) {
			$('.oo').removeClass('d-none').show();
			$('.noo').hide();
		} else {
			$('.oo').hide();
			$('.noo').show();
		}
		$('#create_user_popup').modal("show");
	}

	/*
	 * Show the project dialog
	 */
	function openProjectDialog(existing, projectIndex) {

		var $p_user_projects = $('#p_user_projects');
		gCurrentProjectIndex = projectIndex;

		$('#project_create_form')[0].reset();
		if(existing) {
			$('#p_name').val(globals.gProjectList[projectIndex].name);
			$('#p_desc').val(globals.gProjectList[projectIndex].desc);
			$('#p_tasks_only').prop('checked', globals.gProjectList[projectIndex].tasks_only);
		}

		// Add users
		let h = [];
		let idx = -1;
		for (let i = 0; i < gUsers.length; i++) {
			let user = gUsers[i];

			if(globals.gLoggedInUser && user.current_org_name !== globals.gLoggedInUser.organisation_name) {
				continue;	// Skip if user is not in the current project
			}
			let yesProject = false;
			if(globals.gProjectList.length > 0 && projectIndex >= 0 && projectIndex < globals.gProjectList.length) {
				yesProject = hasId(user.projects, globals.gProjectList[projectIndex].id);
			}


			h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
			h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
			h[++idx] = 'p_user_projects_cb' + i;
			h[++idx] = '" name="';
			h[++idx] = 'p_user_projects_cb';
			h[++idx] = '" value="';
			h[++idx] = user.id + '"';
			if(yesProject) {
				h[++idx] = ' checked="checked"';
			}
			h[++idx] = '/>';
			h[++idx] = '<label class="custom-control-label" for="';
			h[++idx] = 'p_user_projects_cb' + i;
			h[++idx] = '">';
			h[++idx] = htmlEncode(user.name);
			h[++idx] = '</label></div>';
		}

		$p_user_projects.empty().append(h.join(''));

		$('#create_project_popup').modal("show");
	}

	/*
	 * Show the user role dialog
	 */
	function openRoleDialog(existing, roleIndex) {

		var $p_user_roles = $('#p_user_roles');
		gCurrentRoleIndex = roleIndex;

		$('#role_create_form')[0].reset();
		if(existing) {
			$('#ur_name').val(globals.gRoleList[roleIndex].name);
			$('#ur_desc').val(globals.gRoleList[roleIndex].desc);
		}

		// Add users
		let h = [];
		let idx = -1;
		for (let i = 0; i < gUsers.length; i++) {

			let user = gUsers[i];
			let yesRole = false;
			if(globals.gRoleList.length > 0 && roleIndex >= 0 && roleIndex < globals.gRoleList.length) {
				yesRole = hasId(user.roles, globals.gRoleList[roleIndex].id);
			}


			h[++idx] = '<div class="custom-control custom-checkbox ml-2">';
			h[++idx] = '<input type="checkbox" class="custom-control-input" id="';
			h[++idx] = 'user_role_details_cb' + i;
			h[++idx] = '" name="';
			h[++idx] = 'user_role_details_cb';
			h[++idx] = '" value="';
			h[++idx] = user.id + '"';
			if(yesRole) {
				h[++idx] = ' checked="checked"';
			}
			h[++idx] = '/>';
			h[++idx] = '<label class="custom-control-label" for="';
			h[++idx] = 'user_role_details_cb' + i;
			h[++idx] = '">';
			h[++idx] = htmlEncode(user.name);
			h[++idx] = '</label></div>';
		}

		$p_user_roles.empty().append(h.join(''));

		$('#create_role_popup').modal("show");
	}


	/*
	 * Show the organisation dialog
	 */
	function openOrganisationDialog(existing, organisationIndex) {
		var i,
			h = [],
			idx = -1,
			org;

		if(gSmsType && gSmsType === "aws") {
			$('.awsSmsOnly').show();
		} else {
			$('.awsSmsOnly').hide();
		}

		$('#organisation_create_form')[0].reset();
		$('#o_banner_logo').attr("src", "/images/smap_logo.png");

		if(existing) {

			org = gOrganisationList[organisationIndex];
			gCurrentOrganisationIndex = organisationIndex;

			if(globals.gIsOrgAdministrator) {
				getCurrentResourceUsage(org.id);
			}

			$('#o_name').val(org.name);
			$('#o_company_name').val(org.company_name);
			$('#o_company_address').val(org.company_address);
			$('#o_company_phone').val(org.company_phone);
			$('#o_company_email').val(org.company_email);
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
			$('#o_password_strength').val(org.password_strength);
			$('#o_map_source').val(org.map_source);
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
				} else if($(this).val() === "send_optin") {
					this.checked = org.send_optin;
				} else if($(this).val() === "ft_odk_style_menus") {
					this.checked = org.ft_odk_style_menus;
				} else if($(this).val() === "ft_odk_style_menus") {
					this.checked = org.ft_odk_style_menus;
				} else if($(this).val() === "ft_specify_instancename") {
					this.checked = org.ft_specify_instancename;
				} else if($(this).val() === "ft_prevent_disable_track") {
					this.checked = org.ft_prevent_disable_track;
				} else if($(this).val() === "ft_enable_geofence") {
					this.checked = org.ft_enable_geofence;
				} else if($(this).val() === "ft_admin_menu") {
					this.checked = org.ft_admin_menu;
				} else if($(this).val() === "ft_server_menu") {
					this.checked = org.ft_server_menu;
				} else if($(this).val() === "ft_meta_menu") {
					this.checked = org.ft_meta_menu;
				} else if($(this).val() === "ft_exit_track_menu") {
					this.checked = org.ft_exit_track_menu;
				} else if($(this).val() === "ft_bg_stop_menu") {
					this.checked = org.ft_bg_stop_menu;
				} else if($(this).val() === "ft_review_final") {
					this.checked = org.ft_review_final;
				} else if($(this).val() === "ft_force_token") {
					this.checked = org.ft_force_token;
				} else if($(this).val() === "set_as_theme") {
					this.checked = org.appearance.set_as_theme;
				}
			});
			addLanguageOptions($('#o_language'), org.locale);
			$('#o_tz').val(org.timeZone);
			$('#o_refresh_rate').val(org.refresh_rate);

			gOrgId = org.id;
			setLogos(org.id);

		} else {
			gCurrentOrganisationIndex = -1;
			$('#o_tz').val('UTC');
			$('#o_email_user').val('-');
			addLanguageOptions($('#o_language'), undefined);
		}

		if(globals.gIsOrgAdministrator) {
			// Add usage limits
			h[++idx] = '<fieldset>';
			for (i = 0; i < limitTypes.length; i++) {
				h[++idx] = '<div class="form-group row">';
				h[++idx] = '<label for="';
				h[++idx] = limitTypes[i].id;
				h[++idx] = '" class="col-sm-2 control-label">';
				h[++idx] = localise.set[limitTypes[i].label];
				h[++idx] = '</label>';
				h[++idx] = '<div class="col-sm-5">';
				h[++idx] = '<input type="integer" id="'
				h[++idx] = limitTypes[i].id;
				h[++idx] = '" class="form-control"><br/>';
				h[++idx] = '</div>';
				h[++idx] = '<div class="col-sm-5">';
				h[++idx] = '<p id="';
				h[++idx] = limitTypes[i].id + "_i";
				h[++idx] = '"></p>';
				h[++idx] = '</div>';
				h[++idx] = '</div>';
			}
			h[++idx] = '</fieldset>';
			$('#usageLimitsHere').empty().html(h.join(''));
			if (org && org.limits) {
				for (i = 0; i < limitTypes.length; i++) {
					$('#' + limitTypes[i].id).val((org.limits) ? org.limits[limitTypes[i].name] : 0);
				}
			} else {
				for (i = 0; i < limitTypes.length; i++) {
					$('#' + limitTypes[i].id).val(limitTypes[i].default);
				}
			}
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
			contentType: "application/x-www-form-urlencoded",
			url: "/surveyKPI/userList",
			data: userString,
			success: function (data, status) {
				removeHourglass();
				$('#userDetailsSave').prop("disabled", false);
				if(handleLogout(data)) {
					if (userList[0].ident == globals.gLoggedInUser.ident) {	// Restart if a user updated their own settings
						location.reload();
					} else {
						getUsers();
						$dialog.modal("hide");
					}
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
			isEnum,
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

		h[++idx] = '<th></th>';

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
			isEnum = hasName(user.groups, 'enum');

			if (yesGroup && yesProject && yesRole && yesOrg) {
				h[++idx] = '<tr>';
				h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
				h[++idx] = i;
				h[++idx] = '"></td>';
				h[++idx] = '<td class="user_edit_td"><button class="btn btn-default user_edit" style="width:100%;" data-idx="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = user.ident;
				h[++idx] = '</button></td>';
				h[++idx] = '<td style="text-align: center;">';
				h[++idx] = htmlEncode(user.name);
				h[++idx] = '</td>';
				h[++idx] = '<td style="text-align: center;">';
				h[++idx] = htmlEncode(user.current_org_name);
				h[++idx] = '</td>';

				h[++idx] = '<td>';
				h[++idx] = '<div class="d-flex">';
				h[++idx] = '<button type="button" data-idx="';
				h[++idx] = i;
				h[++idx] = '" class="btn btn-sm rm_user btn-danger mr-2">';
				h[++idx] = '<i class="fas fa-trash-alt"></i></button>';
				h[++idx] = '<button type="button" data-idx="';
				h[++idx] = i;
				h[++idx] = '" ';
				if(globals.gLoggedInUser && user.current_org_name !== globals.gLoggedInUser.organisation_name) {
					 h[++idx] = 'data-other_org="true" ';
				}
				h[++idx] = 'class="btn-sm user_edit btn-info">';
				h[++idx] = '<i class="far fa-edit"></i></button>';

				console.log(globals.gLoggedInUser.organisation_name);
				if(isEnum && globals.gLoggedInUser && user.current_org_name === globals.gLoggedInUser.organisation_name) {
					h[++idx] = '<button type="button" data-idx="';
					h[++idx] = i;
					h[++idx] = '" class="btn btn-sm app_code btn-primary ml-2">';
					h[++idx] = '<i class="fas fa-qrcode"></i> <span class="lang" data-lang="u_code"</button>';
				}

				h[++idx] = '</div>';
				h[++idx] = '</td>';

				h[++idx] = '</tr>';
			}
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$userTable.empty().append(h.join(''));
		$('.user_edit', $userTable).click(function () {
			var $this = $(this);
			openUserDialog(true, $this.data("idx"), $this.data("other_org"));
		});

		$(".rm_user", $userTable).click(function(){
			var idx = $(this).data("idx");
			deleteUser(idx);
		});

		$('.app_code', $userTable).click(function () {
			gCurrentUserIndex = $(this).data("idx");
			getAppCode(gUsers[gCurrentUserIndex].ident);
			$('#app_code_popup').modal('show');
		});

		$('#createKey').click(function () {
			createAppCode(gUsers[gCurrentUserIndex].ident);
		});

		$('#deleteKey').click(function () {
			deleteAppCode(gUsers[gCurrentUserIndex].ident);
		});

		$('#user_table .control_td').find('input').click(function () {
			if ($(this).is(':checked')) {

				++gControlProjectCount;
				if (gControlProjectCount === 1) {
					$('.move_to_organisation').removeClass("disabled");
				}
			} else {

				--gControlProjectCount;
				if (gControlProjectCount === 0) {
					if (gControlProjectCount === 0) {
						$('.move_to_organisation').addClass("disabled");
					}
				}
			}
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
			h[++idx] = '<td class="user_edit_td"><button class="btn btn-default project_edit" style="width:100%;" data-idx="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = htmlEncode(project.name);
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = project.changed_by;
			h[++idx] = '</td>';

			h[++idx] = '<td>';
			h[++idx] = '<div class="d-flex">';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm rm_project btn-danger mr-2">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></span></button>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm project_edit btn-info mr-2">';
			h[++idx] = '<i class="far fa-edit"></i></button>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-default btn-sm project_export btn-secondary">';
			h[++idx] = '<i class="fa fa-download"></i></button>';
			h[++idx] = '</div>';
			h[++idx] = '</div>';
			h[++idx] = '</td>';

			h[++idx] = '</tr>';
		}

		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';        // responsive

		$projectTable.empty().append(h.join('')).find('table');
		$('.project_edit').click(function () {
			openProjectDialog(true, $(this).data("idx"));
		});

		$(".rm_project", $('#project_table')).click(function(){
			var idx = $(this).data("idx");
			deleteProject(idx);
		});

		$('#project_table .control_td').find('input').click(function () {
			if ($(this).is(':checked')) {

				++gControlProjectCount;
				if (gControlProjectCount === 1) {
					$('.move_to_organisation').removeClass("disabled");
				}
			} else {

				--gControlProjectCount;
				if (gControlProjectCount === 0) {
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
			h[++idx] = '<td>';
			h[++idx] = role.id;
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button class="btn btn-default role_edit" style="width:100%;" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = htmlEncode(role.name);
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = role.changed_by;
			h[++idx] = '</td>';

			h[++idx] = '<td>';
			h[++idx] = '<div class="d-flex">';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-sm rm_role btn-danger mr-2">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn-sm role_edit btn-info" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = '<i class="far fa-edit"></i></button>';
			h[++idx] = '</div>';
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
				h[++idx] = htmlEncode(role.name);
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
			h[++idx] = htmlEncode(organisation.name);
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = organisation.changed_by;
			h[++idx] = '</td>';
			h[++idx] = '<td class="usage_report_td">';

			if (bs && globals.gIsOrgAdministrator) {
				h[++idx] = '<button style="margin-right:2px;" class="btn btn-default btn-sm btn-warning usage_report" value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = localise.set["u_usage"];
				h[++idx] = ' <i class="fas fa-file-download"></i>';
				h[++idx] = '</button>';
			}
			if(globals.gIsEnterpriseAdministrator) {
				h[++idx] = '<button style="margin-right:2px;" class="btn btn-default btn-sm btn-info move_org" value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = localise.set["c_move"];
				h[++idx] = '</button>';
			}

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-sm rm_org btn-danger">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

			h[++idx] = '<button type="button" value="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-sm organisation_edit btn-info">';
			h[++idx] = '<i class="far fa-edit"></i></button>';

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
			$('#usage_report_popup').modal("show");
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
				h[++idx] = htmlEncode(organisation.name);
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
			h[++idx] = htmlEncode(enterprise.id);
			h[++idx] = '</td>';
			h[++idx] = '<td class="user_edit_td"><button style="width:100%;" class="btn btn-default enterprise_edit" value="';
			h[++idx] = i;
			h[++idx] = '">';
			h[++idx] = htmlEncode(enterprise.name);
			h[++idx] = '</button></td>';
			h[++idx] = '<td>';
			h[++idx] = htmlEncode(enterprise.changed_by);
			h[++idx] = '</td>';
			h[++idx] = '<td>';
			h[++idx] = htmlEncode(enterprise.changed_ts);
			h[++idx] = '</td>';
			h[++idx] = '<td>';
			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-sm rm_ent btn-danger">';
			h[++idx] = '<i class="fas fa-trash-alt"></i></button>';
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
			h[++idx] = htmlEncode(organisation.name);
			h[++idx] = '</option>';

			if(organisation.id !== globals.gOrgId) {
				hNew[++idxNew] = '<option value="';
				hNew[++idxNew] = organisation.id;
				hNew[++idxNew] = '">';
				hNew[++idxNew] = htmlEncode(organisation.name);
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

		var $organisationSelect = $('#target_organisation'),
			i, organisation,
			h = [],
			idx = -1;

		for(i = 0; i < data.length; i++) {
			organisation = data[i];

			h[++idx] = '<option value="';
			h[++idx] = organisation.id;
			h[++idx] = '">';
			h[++idx] = htmlEncode(organisation.name);
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
			h[++idx] = htmlEncode(enterprise.name);
			h[++idx] = '</option>';

			if(enterprise.id != globals.gEntId) {
				hNew[++idxNew] = '<option value="';
				hNew[++idxNew] = enterprise.id;
				hNew[++idxNew] = '">';
				hNew[++idxNew] = htmlEncode(enterprise.name);
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

	/*
 	 * Respond to events on the app key popup
 	 */
	function getAppCode(userIdent) {

		/*
         * Get the current app code
         */
		addHourglass();
		$.ajax({
			url: '/surveyKPI/userList/app_key/' + userIdent,
			cache: false,
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					displayAppCode(data);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to get the app code: " + err);
					}
				}
			}
		});

	}

	/*
 	 * Respond to events on the app key popup
 	 */
	function createAppCode(userIdent) {

		/*
         * Create or replace the current app code
         */
		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/x-www-form-urlencoded",
			cache: false,
			url: '/surveyKPI/userList/app_key/' + userIdent,
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					displayAppCode(data);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to create the app code: " + err);
					}
				}
			}
		});
	}

	/*
  * Respond to events on the app key popup
  */
	function deleteAppCode(userIdent) {

		/*
         * Create or replace the current app code
         */
		addHourglass();
		$.ajax({
			type: "DELETE",
			contentType: "application/x-www-form-urlencoded",
			cache: false,
			url: '/surveyKPI/userList/app_key/' + userIdent,
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					displayAppCode(data);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to delete the app code: " + err);
					}
				}
			}
		});

	}
	function displayAppCode(data) {
		if(data.auth_token) {
			var bc = {
				render: 'div',
				size: 200,
				text: JSON.stringify(data)
			}
			$('#appKey').text(data["auth_token"]);
			$('#appKeyQR').empty().qrcode(bc);
			$('#createKey').text(localise.set["c_rftk"]);
		} else {
			$('#appKey').text(localise.set["c_none"]);
			$('#appKeyQR').empty();
			$('#createKey').text(localise.set["c_cftk"]);
		}
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
				if(handleLogout(data)) {
					gUsers = data;
					updateUserTable();
				}
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
     * Get the usage of protected resources
     */
	function getCurrentResourceUsage(oId) {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/organisationList/usage/" + oId,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				var i;
				for(i = 0; i < limitTypes.length; i++ ) {
					var val = localise.set["c_current"] + ": ";
					val += data[limitTypes[i].name];
					val += " (";
					val += localise.set[limitTypes[i].name + "_i"];
					val += ")";
					$("#" + limitTypes[i].id + "_i").text(val);
				}

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: " + err);
				}
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
	 * Delete the selected user
	 */
	function deleteUser (userIdx) {

		var users = [],
			decision = false,
			deleteAll = false,
			userName,
			i;

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
			$('#confirmDelOne').text(msg_one);

			// Set message for the delete all option
			var msg_all = localise.set["msg_confirm_del_all"];
			msg_all = msg_all.replace('%s1', userName);
			msg_all = msg_all.replace('%s2', orgList);
			$('#confirmDelAll').text(msg_all);

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
			contentType: "application/x-www-form-urlencoded",
			url: "/surveyKPI/userList",
			data: JSON.stringify(users),
			success: function(data, status) {
				removeHourglass();
				if(handleLogout(data)) {
					getUsers();
				}
			}, error: function(data, status) {
				removeHourglass();
				if(handleLogout(data.responseText)) {
					var msg = localise.set["msg_err_del"];
					if (typeof data != "undefined" && typeof data.responseText != "undefined") {
						msg = data.responseText;
					}
					alert(msg);
				}
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
				contentType: "application/x-www-form-urlencoded",
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

		bootbox.confirm(localise.set["msg_del_roles"] +  ' ' + htmlEncode(globals.gRoleList[roleIdx].name), function(decision) {
			if (decision === true) {
				addHourglass();
				$.ajax({
					type: "DELETE",
					contentType: "application/x-www-form-urlencoded",
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
				contentType: "application/x-www-form-urlencoded",
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
				contentType: "application/x-www-form-urlencoded",
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
	function moveToOrganisations (orgId, projects, users) {

		var pString,
			uString;

		if(projects) {
			pString = JSON.stringify(projects);
		}
		if(users) {
			uString = JSON.stringify(users);
		}
		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/x-www-form-urlencoded",
			cache: false,
			url: "/surveyKPI/organisationList/setOrganisation",
			data: {
				orgId: orgId,
				projects: pString,
				users: uString
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
			contentType: "application/x-www-form-urlencoded",
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
	 * Move projects to a new organisation
	 */
	function moveProjects() {
		var projects = [],
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
			hasProjects = true;
		});

		orgId = $('#target_organisation').val();
		orgName = $('#target_organisation :selected').text();

		msg = localise.set["u_check_mv_p"];
		msg = msg.replace("%s1", projectsMoving);
		msg = msg.replace("%s2", orgName);

		bootbox.confirm({
			message: htmlEncode(msg),
			callback: function(result) {
				if (result) {
					moveToOrganisations(orgId, projects, undefined);
				}
			},
			closeButton: false
		});

	}

	/*
	 * Move projects to a new organisation
	 */
	function moveUsers() {
		var users = [],
			idx,
			orgId,
			hasUsers = false,
			usersMoving = '',
			msg;

		$('#user_table').find('input:checked').each(function(index) {
			if(hasUsers){
				usersMoving += ", ";
			}
			idx = $(this).val();
			users[index] = {id: gUsers[idx].id};
			usersMoving += gUsers[idx].name;
			hasUsers = true;
		});

		orgId = $('#target_organisation').val();

		msg = localise.set["u_check_mv_u"];
		msg = msg.replace("%s1", usersMoving);
		msg = msg.replace("%s2", $('#target_organisation :selected').text());

		bootbox.confirm(htmlEncode(msg), function(result){
			if(result) {
				moveToOrganisations(orgId, undefined, users);
			}
		});

	}

	/*
     * Load the sms numbers from the server
     */
	function getSMSNumbers() {

		var url="/surveyKPI/smsnumbers";
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					gNumbers = data;
					updateSMSNumbersList(data);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get list of sms numbers: " + err);
					}
				}
			}
		});
	}

	/*
 	 * Update server data
 	 */
	function updateSMSNumbersList(data) {
		var $selector=$('#smsnumber_list'),
			i,
			h = [],
			idx = -1;

		h[++idx] = '<div class="table-responsive">';
		h[++idx] = '<table class="table table-striped">';

		h[++idx] = '<thead>';
		h[++idx] = '<tr>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_phone"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_channel"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_org"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_survey"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["sms_their_q"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["sms_conv_q"];
		h[++idx] = '</th>';

		h[++idx] = '<th scope="col" style="text-align: center;">';
		h[++idx] = localise.set["c_action"];
		h[++idx] = '</th>';

		h[++idx] = '</tr>';
		h[++idx] = '</thead>';

		h[++idx] = '<tbody>';
		for(i = 0; i < data.length; i++) {

			h[++idx] = '<tr>';

			// number
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].ourNumber);
			h[++idx] = '</td>';

			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].channel);
			h[++idx] = '</td>';

			// orgName
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].orgName);
			h[++idx] = '</td>';

			// surveyName
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].surveyName);
			h[++idx] = '</td>';

			// Their number question
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].theirNumberQuestion);
			h[++idx] = '</td>';

			// Conversation question
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = htmlEncode(data[i].messageQuestion);
			h[++idx] = '</td>';

			// actions
			h[++idx] = '<td style="text-align: center;">';
			h[++idx] = '<div class="d-flex">';

			if(globals.gIsServerOwner) {	// Only allow system owners to delete
				h[++idx] = '<button type="button" data-idx="';
				h[++idx] = i;
				h[++idx] = '" class="btn btn-danger btn-sm rm_n mr-2">';
				h[++idx] = '<i class="fas fa-trash-alt"></i></button>';
			}

			h[++idx] = '<button type="button" data-idx="';
			h[++idx] = i;
			h[++idx] = '" class="btn btn-info btn-sm edit_n">';
			h[++idx] = '<i class="fa fa-edit"></i></button>';

			h[++idx] = '</div>';
			h[++idx] = '</td>';
			// end actions

			h[++idx] = '</tr>';
		}
		h[++idx] = '</tbody>';
		h[++idx] = '</table>';
		h[++idx] = '</div>';

		$selector.empty().append(h.join(''));

		/*
		 * Enable the add button for server admins
		 */
		if(globals.gIsServerOwner) {
			$('.ownerOnly').removeClass("d-none").show();
		}

		$(".rm_n", $selector).on('click',function(){
			var idx = $(this).data("idx");
			if(gNumbers.length > 0 && idx < gNumbers.length) {
				if (confirm(localise.set["msg_del_nbr"] + ' ' + gNumbers[idx].ourNumber)) {
					deleteNumber(idx);
				}
			}
		});

		$('.edit_n', $selector).on('click',function(){
			editNumber($(this).data("idx"));
		});

	}

	function editNumber(idx) {
		gNumberIdx = idx;
		$('.edit_number').text(gNumbers[idx].ourNumber);
		$('#smsOrganisation').val(gNumbers[idx].oId);
		if(gNumbers[idx].oId === globals.gOrgId) {
			$('.sameOrg').show();
			$('.diffOrg').hide();

			// Get the surveys for current project
			var pId = gNumbers[idx].pId;
			if(pId <= 0) {
				pId = $('#smsProject').val();
			}
			if(pId > 0) {
				$('#smsProject').val(pId);
				loadSurveyIdentList(pId, gNumbers[gNumberIdx].surveyIdent,false, true);			// Get surveys
				getQuestionsInSurvey($('.select_question'), undefined, gNumbers[gNumberIdx].surveyIdent, true, true, setQuestionNames, false);
			}
			$('#mcMsg').val(gNumbers[gNumberIdx].mcMsg);
		} else {
			$('.sameOrg').hide();
			$('.diffOrg').show();
		}
		$('#edit_sms_popup').modal("show");
	}

	function deleteNumber(idx) {
		addHourglass();
		$.ajax({
			type: "DELETE",
			cache: false,
			url: "/surveyKPI/smsnumbers/number/" + gNumbers[idx].identifier,
			success: function(data, status) {
				removeHourglass();
				if(handleLogout(data)) {
					getSMSNumbers();
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					alert(xhr.responseText);
				}
			}
		});
	}

	function setQuestionNames() {
		$('#theirNumberQuestion').val(gNumbers[gNumberIdx].theirNumberQuestion);
		$('#messageQuestion').val(gNumbers[gNumberIdx].messageQuestion);
	}
});

