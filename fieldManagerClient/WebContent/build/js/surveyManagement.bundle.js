/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "../smapServer/WebContent/js/app/common.js"
/*!*************************************************!*\
  !*** ../smapServer/WebContent/js/app/common.js ***!
  \*************************************************/
() {

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

var gWait = 0;		// This javascript file only
var gCache = {};
var gCacheGroup = {};
var gCacheStatusQuestions = {};
var gCacheKeys = {};
var gEligibleUser;
var gSelectedOversightQuestion;
var gSelectedOversightSurvey;
var gConversationalSMS;	// Set true if a conversational SMS choice has been added to notification types

/*
 * Convert a choice list name into a valid jquery class name
 */
function jq(choiceList) {

	var c;

	c = choiceList.replace( /(:|\.|\[|\]|,)/g, "\\$1" );
	return c;
}

window.globals = window.globals || {};

/*
 * ==============================================================
 * Task Functions
 * ==============================================================
 */


function addPendingTask(taskId, assignmentId, status, source) {
	var i,
		duplicate = false,
		assignment;

	assignment = {
		assignment_id: assignmentId,
		assignment_status: status,
		task_id: taskId
	};
	globals.gPendingUpdates.push(assignment);

	if(source === "table") {
		updateMapTaskSelections(taskId, true);
	} else if(source === "map") {
		$('#tasks_table').find('[data-taskid=' + taskId + ']').prop("checked", true).closest('tr').addClass("info");
	}
}

function removePendingTask(taskId, source) {
	var i;
	for (i = 0; i < globals.gPendingUpdates.length; i++) {
		if(globals.gPendingUpdates[i].task_id === taskId) {
			globals.gPendingUpdates.splice(i,1);
			break;
		}
	}
	if(source === "table") {
		updateMapTaskSelections(taskId, false);
	} else if(source === "map") {
		$('#tasks_table').find('[data-taskid=' + taskId + ']').prop("checked", false).closest('tr').removeClass("info");
	}
}

/*
 * ===============================================================
 * Project Functions
 * ===============================================================
 */

/*
 * Update the list of available projects
 * Note when addAll is set to true the list is not used to change the default project
 *   In this case the value of the list should not be set to the default project
 */
function updateProjectList(addAll, projectId, callback, $projectSelect) {

	var i,
		h = [],
		idx = -1,
		updateCurrentProject;

	if(projectId > 0) {
		updateCurrentProject = true;		// Only save the current project if there it is set
	}

	if(addAll) {
		h[++idx] = '<option value="0">' + localise.set["c_all"] + '</option>';
		updateCurrentProject = false;
	}
	for(i = 0; i < globals.gProjectList.length; i++) {
		h[++idx] = '<option value="';
		h[++idx] = globals.gProjectList[i].id;
		h[++idx] = '">';
		h[++idx] = htmlEncode(globals.gProjectList[i].name);
		h[++idx] = '</option>';

		if(globals.gProjectList[i].id === projectId) {
			updateCurrentProject = false;   // Don't save the current project if it is already in the list
		}
	}
	$projectSelect.empty().append(h.join(''));

	// If for some reason the user's default project is no longer available then
	//  set the default project to the first project in the list
	//  if the list is empty then set the default project to undefined
	if(updateCurrentProject) {
		if (globals.gProjectList[0]) {
			globals.gCurrentProject = globals.gProjectList[0].id;		// Update the current project id
			globals.gCurrentSurvey = -1;
			globals.gCurrentTaskGroup = undefined;
		} else {
			globals.gCurrentProject = -1;		// Update the current project id
			globals.gCurrentSurvey = -1;
			globals.gCurrentTaskGroup = undefined;
		}

		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);
	}

	if(!addAll) {
		$projectSelect.val(globals.gCurrentProject);			// Set the initial project value
		$('#projectId').val(globals.gCurrentProject);			// Set the project value for the hidden field in template upload
	}

	if(typeof callback !== "undefined") {
		callback(globals.gCurrentProject);				// Call the callback with the correct current project
	}
}

/*
 * Get the list of available projects from the server
 */
function getMyProjects(projectId, callback, getAll) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/myProjectList",
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gProjectList = data;
				updateProjectList(getAll, projectId, callback, $('.project_list'));
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get list of projects: " + err);
				}
			}
		}
	});
}

/*
 * Save the current project id in the user defaults
 */
function saveCurrentProject(projectId, surveyId, taskGroupId) {

	if(surveyId > 0 || projectId > 0 || taskGroupId > 0) {

		var user = {
			current_project_id: projectId,
			current_survey_id: surveyId,
			current_task_group_id: taskGroupId
		};

		var userString = JSON.stringify(user);

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/json",		// uses application/json
			url: "/surveyKPI/user/currentproject",
			cache: false,
			data: userString,
			success: function(data, status) {
				// Do not process a logout
				removeHourglass();
			}, error: function(data, status) {
				// Do not process a logout
				removeHourglass();
			}
		});
	}
}

/*
 * Save the current relationship between survey and surveyGroup
 */
function saveCurrentGroupSurvey(surveyId, gs, fName) {

	if (surveyId > 0) {

		var groupSurvey = {
			sId: surveyId,
			groupIdent: gs,
			fName: fName
		};

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/x-www-form-urlencoded",
			url: "/surveyKPI/user/groupsurvey",
			cache: false,
			data: JSON.stringify(groupSurvey),
			success: function (data, status) {
				removeHourglass();
				handleLogout(data);
			}, error: function (data, status) {
				removeHourglass();
			}
		});
	}
}

/*
 * ===============================================================
 * User Functions
 * ===============================================================
 */

/*
 * Add user details popup to the page
 * Legacy only used with non bootstrap pages - these should be replaced with bootstrap
 */
function addUserDetailsPopup() {
	var
		h =[],
		idx = -1;


	h[++idx] = '<div id="modify_me_popup" style="display:none;">';
	h[++idx] = '<div class="left_panel">';
	h[++idx] = '<form id="me_edit_form">';
	h[++idx] = '<label for="me_name">';
	h[++idx] = localise.set["c_name"];
	h[++idx] = '</label>';
	h[++idx] = '<input type="text" id="me_name" required><br/>';

	h[++idx] = '<label for="me_language">';
	h[++idx] = localise.set["c_lang"];
	h[++idx] = '</label>';
	h[++idx] = '<select class="language_select" id="me_language"></select><br/>';

	h[++idx] = '<label for="me_email">';
	h[++idx] = localise.set["c_email"];
	h[++idx] = '</label>';
	h[++idx] = '<input type="text" id="me_email" pattern="^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$"><br/>';

	h[++idx] = '<label for="me_organisation">';
	h[++idx] = localise.set["c_org"];
	h[++idx] = '</label>';
	h[++idx] = '<select class="organisation_select" id="me_organisation"></select><br/>';

	h[++idx] = '<label for="me_enterprise">';
	h[++idx] = localise.set["c_ent"];
	h[++idx] = '</label>';
	h[++idx] = '<div id="me_enterprise"></div><br/>';

	h[++idx] = '<label for="u_tz">';
	h[++idx] = localise.set["c_tz"];
	h[++idx] = '</label>';
	h[++idx] = '<select class="timezone_select" id="u_tz"></select>';

	h[++idx] = '</form>';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	$(document.body).append(h.join(''));

}

/*
 * Populate a language select widget
 */
function populateLanguageSelect(sId, $elem) {
	$.getJSON("/surveyKPI/languages/" + sId, function(data) {

		if(handleLogout(data)) {
			$elem.empty();
			$.each(data, function (j, item) {
				$elem.append('<option value="' + item + '">' + htmlEncode(item) + '</option>');
			});
		}
	});
}

/*
 * Populate a pdf select widget
 * Set the template set as the default to be selected
 * If there is no default template and there is a template specified in settings (legacy) then set that as the default
 */
function populatePdfSelect(sId, $elem) {
	var url = "/surveyKPI/surveys/templates/" + sId;
	url += addCacheBuster(url);

	$.getJSON(url, function(data) {

		if(handleLogout(data)) {
			var defaultTemplateId,
				fromSettingsTemplateId;

			$elem.empty();
			$elem.append('<option value="-2">' + localise.set["c_auto"] + '</option>');
			$elem.append('<option value="-1">' + localise.set["c_none"] + '</option>');
			$.each(data, function (j, item) {
				if (item.default_template) {
					defaultTemplateId = item.id;
				} else if (item.fromSettings) {
					fromSettingsTemplateId = item.id;
				}
				$elem.append('<option value="' + item.id + '">' + htmlEncode(item.name) + '</option>');
			});
			if (typeof defaultTemplateId !== "undefined") {
				$elem.val(defaultTemplateId);
			} else if (typeof fromSettingsTemplateId !== "undefined") {
				$elem.val(fromSettingsTemplateId)
			} else {
				$elem.val(-2);		// Set to auto
			}
		}

	});
}

/*
 * Add user details popup to the page
 */
function addUserDetailsPopupBootstrap4() {
	var	h =[],
		idx = -1;

	h[++idx] = '<div id="modify_me_popup" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="modifyMeLabel" aria-hidden="true">';
	h[++idx] = '<div class="modal-dialog modal-lg">';
	h[++idx] = '<div class="modal-content">';
	h[++idx] = '<div class="modal-header">';
	h[++idx] = '<h4 class="modal-title" id="modifyMeLabel"></h4>';
	h[++idx] = '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
	h[++idx] = '</div>';    // modal-headers

	h[++idx] = '<div class="modal-body">';
	h[++idx] = '<form role="form" id="me_edit_form">';
	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="me_name" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_name"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<input type="text" id="me_name" required class="form-control">';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="me_language" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_lang"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<select id="me_language" class="language_select form-control"></select>';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="me_email" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_email"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<input type="email" class="form-control" id="me_email"';
	h[++idx] = ' placeholder="Enter email"';
	h[++idx] = ' pattern="^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$">';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="me_organisation" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_org"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<select id="me_organisation" class="organisation_select form-control"></select>';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="me_enterprise" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_ent"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<div id="me_enterprise" class="form-control"></div>';
	h[++idx] = '</div>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="form-group row">';
	h[++idx] = '<label for="u_tz" class="col-sm-2 control-label">';
	h[++idx] = localise.set["c_tz"];
	h[++idx] = '</label>';
	h[++idx] = '<div class="col-sm-10">';
	h[++idx] = '<select class="form-control timezone_select" id="u_tz"></select>';
	h[++idx] = '</div>';
	h[++idx] = '</div>';
	
	h[++idx] = '<div id="me_alert" class="alert d-none text-wrap text-break" role="alert"></div>';
	h[++idx] = '</form>';
	h[++idx] = '</div>';    // modal body

	h[++idx] = '<div class="modal-footer">';
	h[++idx] = '<button type="button" class="btn btn-default" data-dismiss="modal">';
	h[++idx] = localise.set["c_close"];
	h[++idx] = '</button>';

	h[++idx] = '<button id="userProfileSave" type="button" class="btn btn-primary">';
	h[++idx] = localise.set["c_save"];
	h[++idx] = '</button>';
	h[++idx] = '</div>';    // modal - footer
	h[++idx] = '</div>';        // modal - content
	h[++idx] = '</div>';            // modal - dialog
	h[++idx] = '</div>';                // popup

	$(document.body).append(h.join(''));

	enableUserProfileBS();
}

/*
 * Add user details popup to the page
 */
function addApiKeyPopup() {
	var	h =[],
		idx = -1;

	h[++idx] = '<div id="api_key_popup" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="apiKeyLabel" aria-hidden="true">';
	h[++idx] = '<div class="modal-dialog modal-lg">';
	h[++idx] = '<div class="modal-content">';
	h[++idx] = '<div class="modal-header">';
	h[++idx] = '<h4 class="modal-title" id="apiKeyLabel"></h4>';
	h[++idx] = '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
	h[++idx] = '</div>';    // modal-headers

	h[++idx] = '<div class="modal-body">';
	h[++idx] = '<form>';
	h[++idx] = '<div class="form-group">';
	h[++idx] = '<input type="text" id="apiKey" required class="form-control" readOnly>';
	h[++idx] = '</div>';
	h[++idx] = '</form>';
	h[++idx] = '<button id="getKey" type="button" class="btn btn-primary">';
	h[++idx] = localise.set["c_gak"];
	h[++idx] = '</button>';
	h[++idx] = '<button id="deleteKey" type="button" class="btn btn-danger ml-2">';
	h[++idx] = localise.set["c_del"];
	h[++idx] = '</button>';
	h[++idx] = '<button id="copyKey" type="button" class="btn btn-default has_tt ml-2" title="Copy Key">';
	h[++idx] = localise.set["c_ck"];
	h[++idx] = '</button>';
	h[++idx] = '</div>';

	h[++idx] = '<div class="modal-footer">';
	h[++idx] = '<button type="button" class="btn btn-default" data-dismiss="modal">';
	h[++idx] = localise.set["c_close"];
	h[++idx] = '</button>';

	h[++idx] = '</div>';    // modal - footer
	h[++idx] = '</div>';        // modal - content
	h[++idx] = '</div>';            // modal - dialog
	h[++idx] = '</div>';                // popup

	$(document.body).append(h.join(''));

	enableApiKeyPopup();
}


/*
 * Update the user details on the page
 */
function updateUserDetails(data, getOrganisationsFn, getEnterprisesFn, getServerDetailsFn) {

	var groups = data.groups,
		i,
		bootstrap_enabled = (typeof $().modal == 'function');

	if(data.language && data.language !== gUserLocale) {
		try {
			localStorage.setItem('user_locale', data.language);  // Write to storage may be disabled
			location.reload();
		} catch (e) {

		}

	} else if(data.o_id != globals.gOrgId) {
		location.reload();
	}

	globals.gLoggedInUser = data;
	globals.gOrgId = data.o_id;

	// Save the organisation name for the logon screen
	try {
		localStorage.setItem('org_name', data.organisation_name);
	} catch (e) {

	}

	if(bootstrap_enabled) {

		$('#modify_me_popup').on('show.bs.modal', function (event) {
			var $this = $(this)
			$this.find('.modal-title').text(data.ident + "@" + data.organisation_name)

			$("#me_alert").hide();

			$('#me_edit_form')[0].reset();
			$('#reset_me_password_fields').removeClass('d-none').show();
			$('#password_me_fields').hide();
			addLanguageOptions($('.language_select'), data.language);
			addOrganisationOptions($('.organisation_select'), data.o_id, data.orgs);
			$('#me_name').val(data.name);
			$('#me_email').val(data.email);
			$('#me_enterprise').text(globals.gEnterpriseName);
			$('#u_tz').val(globals.gTimezone);

			$(".navbar-collapse").removeClass("in").addClass("collapse");	// Remove drop down menu
		});


	} else {
		$('#username').text(data.name).button({ label: htmlEncode(data.name),
			icons: { primary: "ui-icon-person" }}).off().click(function(){
			$('#me_edit_form')[0].reset();

			$('#reset_me_password_fields').removeClass('d-none').show();
			$('#password_me_fields').hide();
			addLanguageOptions($('.language_select'), data.language);
			addOrganisationOptions($('.organisation_select'), data.o_id, data.orgs);
			$('#me_name').val(data.name);
			$('#me_email').val(data.email);
			$('#me_enterprise').text(globals.gEnterpriseName);
			$('#u_tz').val(globals.gTimezone);

			$('#modify_me_popup').dialog("option", "title", htmlEncode(data.name + "@" + data.organisation_name));
			$('#modify_me_popup').dialog("open");
		});
	}

	/*
	 * Show restricted functions
	 */
	if(groups) {
		for(i = 0; i < groups.length; i++) {
			if(groups[i].id === globals.GROUP_ADMIN) {
				globals.gIsAdministrator = true;

                if(data.billing_enabled) {
                    globals.gOrgBillingData = true;
                }

			} else if(groups[i].id === globals.GROUP_ORG_ADMIN) {
				globals.gIsOrgAdministrator = true;
				globals.gBillingData = true;

			} else if(groups[i].id === globals.GROUP_SECURITY) {
				globals.gIsSecurityAdministrator = true;

			} else if(groups[i].id === globals.GROUP_ENTERPRISE) {
                globals.gIsEnterpriseAdministrator = true;
				globals.gBillingData = true;

            } else if(groups[i].id === globals.GROUP_LINKAGES) {
				globals.gIsLinkFollower = true;

			} else if(groups[i].id === globals.GROUP_ANALYST) {
				globals.gIsAnalyst = true;

			} else if(groups[i].id === globals.GROUP_DASHBOARD) {
				globals.gIsDashboard = true;

			} else if(groups[i].id === globals.GROUP_MANAGE) {
				globals.gIsManage = true;

			} else if(groups[i].id === globals.GROUP_ENUM) {
				globals.gIsEnum = true;

			} else if(groups[i].id === globals.GROUP_VIEW_DATA) {
                globals.gViewData = true;

            } else if(groups[i].id === globals.GROUP_MANAGE_TASKS) {
				globals.gManageTasks = true;

			} else if(groups[i].id === globals.GROUP_OWNER) {
                globals.gIsServerOwner = true;

            } else if(groups[i].id === globals.GROUP_CONSOLE_ADMIN) {
				globals.gIsConsoleAdmin = true;
			}
		}
	}

	// Only show items relevant to a user
	$('.restrict_role').hide();
	if(globals.gIsEnum) {
		$('.enum_role').removeClass('d-none').show();
	}
	if(globals.gIsAnalyst) {
		$('.analyst_role').removeClass('d-none').show();
	}
	if(globals.gIsDashboard) {
		$('.dashboard_role').removeClass('d-none').show();
	}
	if(globals.gViewData) {
		$('.data_role').removeClass('d-none').show();
	}
	if(globals.gManageTasks) {
		$('.task_role').show();
	}
	if(globals.gIsAdministrator) {
		$('.admin_role').removeClass('d-none').show();
	}
	if(globals.gIsManage) {
		$('.manage_role').removeClass('d-none').show();
	}
	if(globals.gIsSecurityAdministrator) {
		$('.security_role').removeClass('d-none').show();
	}
	if(globals.gIsOrgAdministrator) {  // Admins can see their personal organisations
		$('.org_role').removeClass('d-none').show();
	}
	if(globals.gIsOrgAdministrator || globals.gIsAdministrator) {  // Admins can see their personal organisations
		if(typeof getOrganisationsFn === "function") {
			getOrganisationsFn();
		}
	}
	if(globals.gIsEnterpriseAdministrator) {
		$('.enterprise_role').removeClass('d-none').show();
		if(typeof getEnterprisesFn === "function") {
			getEnterprisesFn();
		}
	}
	if(globals.gIsServerOwner) {
		$('.owner_role').removeClass('d-none').show();
		if(typeof getServerDetailsFn === "function") {
			getServerDetailsFn();
		}
	}

	if(globals.gTraining) {
		$('#train_link').prop("href", globals.gTraining);
		$('#m_training').removeClass('d-none').show();
	}

	//TODO set logic for enabling disabling billing
	if(isBusinessServer() && (globals.gBillingData || globals.gOrgBillingData)) {
		$('.billing_role').removeClass('d-none').show();
	}

	// Other conditional elements
	if(globals.gSendTrail === 'off') {
		$('.user_trail').hide();
	}

	// 	Customer configurable details - the configurable part is TODO
	$('#my_name').val(data.name);			// Add the name to the configurable list

	if(data.settings) {
		var userDetails = JSON.parse(data.settings);
		$('#my_title').val(userDetails.title);
		$('#my_license').val(userDetails.license);
		$('#my_signature').attr("src", "/surveyKPI/file/" + data.signature + "/users?type=sig");
	}

	// Hide any menus that have been disabled by custom java scripts
	$('.perm_dis_menu').hide();
}

function addLanguageOptions($elem, current) {

	var h = [],
		idx = -1,
		i,
		languages = [
			{
				locale: "ar",
				name: "Arabic"
			},
			{
				locale: "en",
				name: "English"
			},
			{
				locale: "fr",
				name: "French"
			},
			{
				locale: "hi",
				name: "Hindi"
			},
			{
				locale: "pt",
				name: "Portugese"
			},
			{
				locale: "es",
				name: "Spanish"
			},
			{
				locale: "uk",
				name: "Ukrainian"
			}
		];

	for(i = 0; i < languages.length; i++) {
		h[++idx] = '<option value="';
		h[++idx] = languages[i].locale;
		h[++idx] = '">';
		h[++idx] = localise.set[languages[i].locale];
		h[++idx] = '</option>';
	}
	$elem.html(h.join(''));
	if(current) {
		$elem.val(current);
	} else {
		$elem.val("en");
	}
}

function addOrganisationOptions($elem, current, orgs) {

	var h = [],
		idx = -1,
		i;

	for(i = 0; i < orgs.length; i++) {
		h[++idx] = '<option value="';
		h[++idx] = orgs[i].id;
		h[++idx] = '">';
		h[++idx] = htmlEncode(orgs[i].name);
		h[++idx] = '</option>';
	}
	$elem.html(h.join(''));
	if(current) {
		$elem.val(current);
	}
}

/*
 * Enable the user profile button
 */
function enableUserProfile () {
	// Initialise the dialog for the user to edit their own account details
	$('#modify_me_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, modal:true,
			title:"User Profile",
			show:"drop",
			width:350,
			height:350,
			zIndex: 2000,
			buttons: [
				{
					text: "Cancel",
					click: function() {

						$(this).dialog("close");
					}
				}, {
					text: "Save",
					click: function() {

						var user = globals.gLoggedInUser;

						user.name = $('#me_name').val();
						user.language = $('#me_language').val();
						user.email = $('#me_email').val();
						if($('#me_password').is(':visible')) {
							user.password = $('#me_password').val();
							if($('#me_password_confirm').val() !== user.password) {
								user.password = undefined;
								alert("Passwords do not match");
								$('#me_password').focus();
								return false;
							}
						} else {
							user.password = undefined;
						}

						user.current_project_id = 0;	// Tell service to ignore project id and update other details
						user.current_survey_id = 0;
						user.current_task_group_id = 0;

						user.timezone = $('#u_tz').val();
						globals.gTimezone = user.timezone;

						user.o_id = $('#me_organisation').val();
						if(user.o_id == globals.gOrgId) {
							user.o_id = 0;	// No change
						}

						saveCurrentUser(user, undefined);			// Save the updated user details to disk
						$(this).dialog("close");
					},
				}
			]
		}
	);


	// Initialise the reset password checkbox
	$('#reset_me_password').click(function () {
		if($(this).is(':checked')) {
			$('#password_me_fields').removeClass('d-none').show();
		} else {
			$('#password_me_fields').hide();
		}
	});
}

/*
 * Enable the user profile button
 */
function enableUserProfileBS () {

	$("#modify_me_popup :input").keydown(function() {
		$("#me_alert").hide();
	});

	/*
	 * Save the user profile
	 */
	$('#userProfileSave').click(function() {
		var user = globals.gLoggedInUser;

		user.name = $('#me_name').val();
		user.language = $('#me_language').val();
		user.email = $('#me_email').val();
		if($('#me_password').is(':visible')) {
			user.password = $('#me_password').val();
			if($('#me_password_confirm').val() !== user.password) {
				user.password = undefined;
				$('#me_alert').removeClass('alert-success d-none').addClass('alert-danger').text(localise.set["msg_pwd_m"]).show();
				$('#me_password').focus();
				return false;
			}
		} else {
			user.password = undefined;
		}

		user.o_id = $('#me_organisation').val();
		if(user.o_id == globals.gOrgId) {
			user.o_id = 0;	// No change
		}

		globals.gTimezone = $('#u_tz').val();
		user.timezone = globals.gTimezone;

		user.current_project_id = 0;	// Tell service to ignore project id and update other details
		user.current_survey_id = 0;
		user.current_task_group_id = 0;

		saveCurrentUser(user, $('#modify_me_popup'));			// Save the updated user details to disk
	});


	// Initialise the reset password checkbox
	$('#reset_me_password').click(function () {
		if($(this).is(':checked')) {
			$('#password_me_fields').removeClass('d-none').show();
		} else {
			$('#password_me_fields').hide();
		}
	});
}

/*
 * Respond to events on the API key popup
 */
function enableApiKeyPopup() {

	$('#api_key_popup').on('show.bs.modal', function (event) {
		/*
		 * Get the current API key
		 */
		$('#getKey').prop('disabled', true);
		addHourglass();
		$.ajax({
			url: '/surveyKPI/user/api_key',
			cache: false,
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					$('#apiKey').val(data.apiKey);
					$('#getKey').prop('disabled', false);
					if (data.apiKey) {
						$('#getKey').text(localise.set["c_rak"]);
						$('#deleteKey,#copyKey').prop('disabled', false);
					} else {
						$('#getKey').text(localise.set["c_gak"]);
						$('#deleteKey,#copyKey').prop('disabled', true);
					}
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					$('#getKey').prop('disabled', false);
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to get api key: " + err);
					}
				}
			}
		});
	});

	/*
	 * Delete a key
	 */
	$('#deleteKey').on("click",function () {
		addHourglass();
		$.ajax({
			type: "DELETE",
			url: '/surveyKPI/user/api_key',
			cache: false,
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					$('#apiKey').val("");
					$('#getKey').prop('disabled', false);
					$('#getKey').text(localise.set["c_gak"]);
					$('#deleteKey,#copyKey').prop('disabled', true);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to delete api key: " + err);
					}
				}
			}
		});
	});

	/*
	 * Create a key
	 */
	$('#getKey').on("click", function () {
		addHourglass();
		$.ajax({
			type: "POST",
			cache: false,
			contentType: "application/x-www-form-urlencoded",
			dataType: 'json',
			url: "/surveyKPI/user/api_key/create",
			success: function (data) {
				removeHourglass();
				if (handleLogout(data)) {
					$('#apiKey').val(data.apiKey);
					$('#getKey').text(localise.set["c_rak"]);
					$('#deleteKey,#copyKey').prop('disabled', false);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(err);
						console.log("Error: Failed to get api key: " + err);
					}
				}
			}
		});
	});

	// Respond to a user clicking copy api key
	$('.has_tt').tooltip();
	$('#copyKey').click(function () {
		var copyText = document.getElementById("apiKey");
		copyText.select();
		navigator.clipboard.writeText($('#apiKey').val());

		$('#copyKey').tooltip('dispose').tooltip({title: localise.set["c_c"] + ": " + copyText.value}).tooltip('show');

	});
	$('#copyKey').mouseout(function () {
		$('#copyKey').tooltip({title: localise.set["c_c"]});
	});
}

/*
 * Save the currently logged on user's details
 */
function saveCurrentUser(user, $dialog) {

	var fd = new FormData();
	fd.append("user", JSON.stringify(user));
	addHourglass();
	$.ajax({
		method: "POST",
		cache: false,
		contentType: false,
		processData: false,
		url: "/surveyKPI/user",
		data: fd,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				if (data.error) {
					if ($dialog) {
						$('#me_alert').removeClass('alert-success d-none').addClass('alert-danger').text(data.msg).show();
					} else {
						alert(localise.set["c_error"] + " : " + data.msg);  // legacy non bootstrap
					}
				} else if ($dialog) {
					$dialog.modal("hide");
				}
				updateUserDetails(data, undefined);
			}

		}, error: function(data, status) {
			removeHourglass();
			alert(localise.set["c_error"] + " : " + data.responseText);
		}
	});
}

function getAvailableTimeZones(callback) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/utility/timezones",
		cache: true,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				if (typeof callback == "function") {
					callback(data);
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		}
	});
}

function showTimeZones(timeZones) {
	var h =[],
		idx = -1,
		i,
		tz;

	for (i = 0; i < timeZones.length; i++) {
		tz = timeZones[i];
		h[++idx] = '<option value="';
		h[++idx] = tz.id;
		h[++idx] = '">';
		h[++idx] = htmlEncode(tz.name);
		h[++idx] = '</option>';
	}
	$('.timezone_select').empty().html(h.join(''));
	if(!globals.gTimezone) {
		globals.gTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;      // Browser timezone
	}
	$('#u_tz').val(globals.gTimezone);   // Set time zone in user profile
	$('#timezone').text(localise.set["c_tz"] + ": " + globals.gTimezone);   // Show timezone where this is enabled
}

function addTimeZoneToUrl(url) {
	if(url) {
		if(url.indexOf("?") > 0) {
			url += "&";
		} else {
			url += "?";
		}
		url += "tz=";
		url += encodeURIComponent(globals.gTimezone);
	}
	return url;
}

/*
 * Create the user profile dialog and get any data it needs
 */
function setupUserProfile(bs4) {

	if(bs4) {
		addUserDetailsPopupBootstrap4();
		addApiKeyPopup();
	} else {
		addUserDetailsPopup();	// legacy
	}
	getAvailableTimeZones(showTimeZones);
}

function getLoggedInUser(callback, getAll, getProjects, getOrganisationsFn, hideUserDetails,
                         dontGetCurrentSurvey, getEnterprisesFn, getServerDetailsFn, getSMSNumbers) {

	globals.gIsAdministrator = false;

	addHourglass();
	$.ajax({
		url: "/surveyKPI/user",
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				var i;

				globals.gServerCanSendEmail = data.sendEmail;

				globals.gEmailEnabled = data.allow_email;
				globals.gFacebookEnabled = data.allow_facebook;
				globals.gTwitterEnabled = data.allow_twitter;
				globals.gCanEdit = data.can_edit;
				globals.gSendTrail = data.ft_send_location;
				globals.gAlertSeen = data.seen;		// Alerts have been acknowledged
				globals.gLastAlertTime = data.lastalert;
				globals.gOrgId = data.o_id;
				globals.gEntId = data.e_id;
				globals.gEnterpriseName = data.enterprise_name;
				globals.gSetAsTheme = data.set_as_theme;
				globals.gNavbarColor = data.navbar_color;
				globals.gNavbarTextColor = data.navbar_text_color;
				globals.gTraining = data.training;
				globals.gRefreshRate = data.refresh_rate;

				if (data.timezone) {
					globals.gTimezone = data.timezone;
				} else {
					globals.gTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
				}
				$('#u_tz').val(globals.gTimezone);

				if (!hideUserDetails) {
					updateUserDetails(data, getOrganisationsFn, getEnterprisesFn, getServerDetailsFn);
				}

				if(getSMSNumbers) {
					getSMSNumbers();
				}

				if(data.totalTasks > 0) {
					$('.total_tasks').html('(' + htmlEncode(data.totalTasks) + ')').addClass('btn-danger');
				}

				if (!dontGetCurrentSurvey) {	// Hack, on edit screen current survey is set as parameter not from the user's defaults
					globals.gCurrentSurvey = data.current_survey_id;
					globals.gCurrentSurveyIdent = data.current_survey_ident;
				}
				globals.gCurrentProject = data.current_project_id;
				globals.gCurrentTaskGroup = data.current_task_group_id;
				$('#projectId').val(globals.gCurrentProject);		// Set the project value for the hidden field in template upload
				if (data.groupSurveys) {
					for (i = 0; i < data.groupSurveys.length; i++) {
						globals.gGroupSurveys[data.groupSurveys[i].sId] = data.groupSurveys[i].groupIdent;
						globals.gSubForms[data.groupSurveys[i].sId] = data.groupSurveys[i].fName;
					}
				}

				setOrganisationTheme();

				if (getProjects) {
					getMyProjects(globals.gCurrentProject, callback, getAll);	// Get projects
				} else {
					if (typeof callback !== "undefined") {
						callback(globals.gCurrentSurvey);				// Call the callback with the correct current survey
					}
				}
			}

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0 || xhr.status == 401) {
					return;  // Not an error or an authorisation error which is handled by the service worker
				} else {
					console.log("Error: Failed to get user details: " + err);

					var msg = localise.set["c_error"] + ": ";
					if (err && err.message && err.message.indexOf('Unauthorized') >= 0) {
						msg += localise.set["c_auth"];
					} else {
						msg += err;
					}
					alert(msg);
				}
			}
		}
	});
}

/*
 * ===============================================================
 * Common functions for managing media (on both the edit page and shared resource page)
 * ===============================================================
 */

/*
 * Upload files to the server
 */
function uploadFiles(url, formName, callback1) {

	let f = document.forms.namedItem(formName),
		formData = new FormData(f);

	url = addUrlParam(url, "getlist=true");
	addHourglass();
	$('.submitFiles').addClass('disabled');
	$.ajax({
		url: url,
		type: 'POST',
		data: formData,
		cache: false,
		contentType: false,
		processData:false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				let cb1 = callback1;
				$('.upload_file_msg').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["c_success"]);
				if (typeof cb1 === "function") {
					cb1(data);
				}
				document.forms.namedItem(formName).reset();
				$('#fileAddLocations').modal('hide');
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				document.forms.namedItem(formName).reset();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					var msg = htmlEncode(xhr.responseText);
					if (msg && msg.indexOf("no tags") >= 0) {
						msg = localise.set["msg_u_nt"];
					} else {
						msg = localise.set["msg_u_f"] + " : " + msg;
					}
					$('.upload_file_msg').show().removeClass('alert-success').addClass('alert-danger').html(msg);
					$('#fileAddLocations').modal('hide');
				}
			}
		}
	});
}

/*
 * Add a parameter to a URL
 */
function addUrlParam(url, param) {
	if(url.indexOf("?") > 0) {
		url += "&" + param;
	} else {
		url += "?" + param;
	}
	return url;
}

/*
 * Refresh the media view and then set the mode to manage
 */
function refreshMediaViewManage(data, sId) {
	refreshMediaView(data, sId);
	$('.mediaManage').show();
	$('.mediaSelect').hide();
}
/*
 * Refresh the view of any attached media if the available media items has changed
 * sId is set if a resources for that survey are being viewed
 */
function refreshMediaView(data, sId) {

	var i,
		$elementMedia,
		$elementCsv,
		hCsv = [],
		idxCsv = -1,
		hMedia = [],
		idxMedia = -1;

	if(sId) {
		$('#survey_id').val(sId);
	}

	if(data) {
		window.gFiles = data.files;
		let files = data.files;

		$elementMedia = $('#filesOrg');
		$elementCsv = $('#csvOrg');

		if(files) {
			for (i = 0; i < files.length; i++) {
				if (files[i].type === 'csv') {
					hCsv[++idxCsv] = getMediaRecord(files[i], 'csv', i, sId > 0);
				} else {
					hMedia[++idxMedia] = getMediaRecord(files[i], 'media', i, sId > 0);
				}
			}
		}

		$elementMedia.html(hMedia.join(""));
		$elementCsv.html(hCsv.join(""));

		$('.media_delete').click(function () {
			let item = window.gFiles[$(this).val()];

			if(confirm(localise.set["msg_confirm_del"] + " " + htmlEncode(item.name))) {
				delete_media(item.name, sId);
			}
		});

		$('.media_history').click(function () {
			var item = window.gFiles[$(this).val()];
			var url = '/app/resource_history.html?resource=' + item.name;
			if(sId) {
				url += '&survey_id=' + sId;
			}
			window.location.href = url;
		});

		$('.csv_replace').click(function(e) {

			$('#fileCsv').show();
			$('#fileMedia').hide();

			replace(window.gFiles[$(this).val()]);
		});

		$('.media_replace').click(function(e) {

			$('#fileCsv').hide();
			$('#fileMedia').show();

			replace(window.gFiles[$(this).val()]);
		});

	}

	// If this is the organisational view we can refresh the list of choices for selecting vector maps
	if(!sId) {
		refreshVectorSelects(data);
	}
}

function replace(item) {

	$('#uploadAction').val('replace');
	$('#itemName').val(getBaseName(item.name));

	$('.upload_alert').hide();
	$('.notreplace').hide();
	$('#media_add_title').text(localise.set["tm_c_sr_rep"] + ": " + item.name);

	$('#fileAddPopup').modal('show');

}
function getBaseName(fileName) {
	let lastDot = fileName.lastIndexOf(".");
	let baseName = fileName;
	if (lastDot !== -1) {
		baseName = fileName.substr(0, lastDot);
	}
	return baseName;
}
function getMediaRecord(file, panel, record, surveyLevel) {
	var h = [],
		idx = -1;

	h[++idx] = '<tr class="';
	h[++idx] = htmlEncode(file.type);
	h[++idx] = '">';

	if(panel === 'media') {
		h[++idx] = '<td class="preview">';
		h[++idx] = '<a target="_blank" href="';
		h[++idx] = htmlEncode(file.url) + addCacheBuster(file.url);
		h[++idx] = '">';
		if (file.type == "audio") {
			h[++idx] = addAudioIcon();
		} else if (file.type == "geojson") {
			h[++idx] = addVectorMapIcon();
		} else {
			h[++idx] = '<img width="100" height="100" src="';
			h[++idx] = htmlEncode(file.thumbnailUrl) + addCacheBuster(file.thumbnailUrl);
			h[++idx] = '" alt="';
			h[++idx] = htmlEncode(file.name);
			h[++idx] = '">';
		}
		h[++idx] = '</a>';
		h[++idx] = '</td>';
	}

	h[++idx] = '<td class="filename">';
	h[++idx] = '<p>';
	h[++idx] = htmlEncode(file.name);
	h[++idx] = '</p>';
	h[++idx] = '</td>';

	h[++idx] = '<td class="mediaManage">';
	h[++idx] = localTime(file.modified);
	h[++idx] = '</td>';

	h[++idx] = '<td class="mediaManage">';
	h[++idx] = '<p>';
	h[++idx] = htmlEncode(file.size);
	h[++idx] = '</p>';
	h[++idx] = '</td>';

	h[++idx] = '<td class="mediaManage">';
	h[++idx] = '<button class="btn ';
	h[++idx] = (panel === 'csv') ? 'csv_replace' : 'media_replace';
	h[++idx] = '" value="';
	h[++idx] = record;
	h[++idx] = '">';
	h[++idx] = '<i class="fas fa-sync-alt"></i>';
	h[++idx] = '</button>';
	h[++idx] = '</td>';

	// Action Buttons
	let downloadUrl = '/surveyKPI/shared/latest/' + file.name
		+ (surveyLevel ? '?sIdent=' + globals.gCurrentSurveyIdent : '');
	h[++idx] = '<td class="mediaManage">';
	h[++idx] = '<a class="media_download btn btn-info" href="';					// Download
	h[++idx] = htmlEncode(downloadUrl + addCacheBuster(downloadUrl));
	h[++idx] = '">';
	h[++idx] = '<i class="fas fa-download"></i>'
	h[++idx] = '</a>';
	h[++idx] = '<button class="media_history btn btn-primary" value="';	// History
	h[++idx] = record;
	h[++idx] = '">';
	h[++idx] = '<i class="fas fa-landmark"></i>'
	h[++idx] = '</button>';
	h[++idx] = '<button class="media_delete btn btn-danger" value="';		// Delete
	h[++idx] = record;
	h[++idx] = '">';
	h[++idx] = '<i class="fas fa-trash-alt"></i>'
	h[++idx] = '</button>';

	h[++idx] = '</td>';

	h[++idx] = '<td class="mediaSelect">';
	h[++idx] = '<button class="mediaAdd btn btn-success">';
	h[++idx] = '<i class="fas fa-plus"></i> '
	h[++idx] = localise.set['c_add'];
	h[++idx] = '</button>';
	h[++idx] = '</td>';


	h[++idx] = '</tr>';

	return h.join('');
}
/*
 * Refresh the vector select lists
 */
function refreshVectorSelects(data) {

	var i,
		$vectorData = $('#vector_data'),
		$vectorStyle = $('#vector_style'),
		h_d = [],
		idx_d = -1,
		h_s = [],
		idx_s = -1,
		files;

	if(data) {
		files = data.files;

		for(i = 0; i < files.length; i++){
			if(files[i].type === "geojson") {
				h_d[++idx_d] = '<option value="';
				h_d[++idx_d] = files[i].name;
				h_d[++idx_d] = '">';
				h_d[++idx_d] = htmlEncode(files[i].name);
				h_d[++idx_d] = '</option>';
			}

			if(files[i].type === "TODO") {
				h_s[++idx_s] = '<option value="';
				h_s[++idx_s] = files[i].name;
				h_s[++idx_s] = '">';
				h_s[++idx_s] = htmlEncode(files[i].name);
				h_s[++idx_s] = '</option>';
			}

		}


		$vectorData.html(h_d.join(""));
		$vectorStyle.html(h_s.join(""));
	}
}

function addAudioIcon() {
	var h = [],
		idx = -1;

	h[++idx] = '<span class="has_tt" title="Audio">';
	h[++idx] = '<span class="glyphicon glyphicon-volume-up edit_type"></span>';
	h[++idx] = '</span>';

	return h.join('');
}

function addVectorMapIcon() {
	var h = [],
		idx = -1;

	h[++idx] = '<span class="has_tt" title="Audio">';
	h[++idx] = '<span class="glyphicon glyphicon glyphicon-map-marker edit_type"></span>';
	h[++idx] = '</span>';

	return h.join('');
}

function getFilesFromServer(sId, callback, getall) {

	let url = '/surveyKPI/upload/media';
	let hasParams = false;
	if(sId) {
		url += '?survey_id=' + sId;
		hasParams = true;
	}
	if(getall) {
		url += (hasParams ? '&' : '?') + 'getall=true';
	}

	url += addCacheBuster(url);

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				let surveyId = sId;
				callback(data, surveyId);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					$('.upload_file_msg').removeClass('alert-success').addClass('alert-danger').html("Error: " + htmlEncode(err));
				}
			}
		}
	});
}

/*
 * Delete a media file
 */
function delete_media(filename, sId) {

	var url = "/surveyKPI/shared/file/" + encodeURIComponent(filename);

	if(sId > 0) {
		url += '?survey_id=' + sId;
	}

	addHourglass();
	$.ajax({
		url: url,
		type: 'DELETE',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				var surveyId = sId;
				getFilesFromServer(surveyId, refreshMediaViewManage, false);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: " + err);
				}
			}
		}
	});

}
/*
 * ===============================================================
 * Hourglass Functions
 * ===============================================================
 */

function addHourglass() {

	if(gWait === 0) {

		$("#hour_glass,.hour_glass,.sk-spinner").show();
	}
	++gWait;
}

function removeHourglass() {

	--gWait;
	if(gWait === 0) {

		$("#hour_glass,.hour_glass,.sk-spinner").hide();
	}

}

/*
 * ===============================================================
 * Survey Functions
 * ===============================================================
 */

/*
 * Load the surveys from the server
 */
function loadSurveys(projectId, selector, getDeleted, addAll, callback, useIdx, sId, addNone, incReadOnly) {

	var url="/surveyKPI/surveys?projectId=" + projectId + "&blocked=true";

	if(selector === undefined) {
		selector = ".survey_select";	// Update the entire class of survey select controls
	}

	if(typeof projectId !== "undefined" && projectId > 0) {

		if(getDeleted) {
			url+="&deleted=true";
		}

		addHourglass();

		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					var sel = selector;
					var all = addAll;

					showSurveyList(data, sel + ".data_survey", all, true, false, useIdx, sId, addNone, false, incReadOnly);
					showSurveyList(data, sel + ".oversight_survey", all, false, true, useIdx, sId, addNone, false, incReadOnly);
					showSurveyList(data, sel + ".data_oversight_survey", all, true, true, useIdx, sId, addNone, false, incReadOnly);
					showSurveyList(data, ".bundle_select", all, true, true, false, sId, addNone, true, incReadOnly);

					if (typeof callback == "function") {
						callback(data);
					}
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get list of surveys: " + err);
					}
				}
			}
		});
	} else {
		var $elem = $('.data_survey, .oversight_survey, .data_oversight_survey');
		$elem.empty();
		if(addAll) {
			$elem.append('<option value="_all">' + localise.set["c_all_s"] + '</option>');
		}

		if(callback) {
			callback();
		}

	}
}

/*
 * Load the surveys from the server
 */
function loadSurveyIdentList(projectId, sIdent, addAll, addNone) {

	var url="/surveyKPI/surveys/project/" + projectId;
	var selector = ".survey_select";

	if(typeof projectId !== "undefined" && projectId > 0) {
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					var sel = selector;

					showIdentSurveyList(data, sel, addAll, sIdent, addNone);

				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get list of surveys: " + err);
					}
				}
			}
		});
	}
}

/*
 * Show the surveys in select controls
 */
function showSurveyList(data, selector, addAll, dataSurvey, oversightSurvey, useIdx, sId, addNone, bundle, incReadOnly) {

	var i,
		item,
		h = [],
		idx = -1,
		$elem,
		$elem_disable_blocked,
		selValue;

	$elem = $(selector);
	$elem_disable_blocked = $(selector + ".disable_blocked");

	$elem.empty();
	var valueSelected = false;
	if(addAll) {
		h[++idx] = '<option value="_all">';
		h[++idx] = localise.set["c_all_s"];		// All Surveys
		h[++idx] = '</option>';

		selValue = "_all";
		valueSelected = true;
	}
	if(addNone) {
		h[++idx] = '<option value="0">';
		h[++idx] = localise.set["c_none"];		// No survey
		h[++idx] = '</option>';
	}

	var bundleObj = {};
	for(i = 0; i < data.length; i++) {
		item = data[i];
		if(!bundle || !bundleObj[item.groupSurveyDetails]) {	// If this is for a bundle list remove duplicate entries
			if ((incReadOnly || !item.readOnlySurvey) && (item.dataSurvey && dataSurvey || item.oversightSurvey && oversightSurvey)) {
				h[++idx] = '<option';
				if (!valueSelected && !item.blocked) {
					valueSelected = true;
					selValue = useIdx ? i : item.id;
				}
				if (item.blocked && !bundle) {
					h[++idx] = ' class="blocked"';
				}
				h[++idx] = ' value="';
				if(bundle) {
					h[++idx] = useIdx ? i : item.groupSurveyIdent;
				} else {
					h[++idx] = useIdx ? i : item.id;
				}
				h[++idx] = '">';
				if(bundle){
					h[++idx] = htmlEncode(item.groupSurveyDetails);
					bundleObj[item.groupSurveyDetails] = '1';
				} else {
					h[++idx] = htmlEncode(item.displayName);

					if (item.blocked) {
						h[++idx] = ' (' + localise.set["c_blocked"] + ')';
					}
				}
				h[++idx] = '</option>';
			}
			if (typeof sid === 'undefined') {
				if (globals.gCurrentSurvey > 0 && globals.gCurrentSurvey === item.id) {
					selValue = useIdx ? i : item.id;
				}
			} else {
				if (sId > 0 && sId === item.id) {
					selValue = useIdx ? i : item.id;
				}
			}
		}
	}

	$elem.empty().append(h.join(''));
	$elem.val(selValue);
	$("option.blocked", $elem_disable_blocked).attr("disabled", "disabled");

}

/*
 * Show the surveys in select boxes
 */
function showIdentSurveyList(data, selector, addAll, sIdent, addNone) {

	var i,
		item,
		h = [],
		idx = -1,
		$elem;

	$elem = $(selector);

	$elem.empty();
	if(addAll) {
		h[++idx] = '<option value="_all">';
		h[++idx] = localise.set["c_all_s"];		// All Surveys
		h[++idx] = '</option>';
	}
	if(addNone) {
		h[++idx] = '<option value="_none">';
		h[++idx] = localise.set["c_none"];		// No Survey
		h[++idx] = '</option>';
	}

	for(i = 0; i < data.length; i++) {
		item = data[i];
		h[++idx] = '<option';
		h[++idx] = ' value="';
		h[++idx] = item.ident;
		h[++idx] = '">';
		h[++idx] = htmlEncode(item.name);
		h[++idx] = '</option>';
	}

	$elem.empty().append(h.join(''));
	if(sIdent) {
		$elem.val(sIdent);
	} else {
		$elem.val("_none");
	}

}


// Common Function to get the language and question list (for the default language)
function getLanguageList(sId, callback, addNone, selector, setGroupList, filterQuestion) {

	if(typeof sId === "undefined") {
		sId = globals.gCurrentSurvey;
	}

	if(typeof filterQuestion === "undefined") {
		filterQuestion = "-1";
	}

	function getAsyncLanguageList(sId, theCallback, selector, filterQuestion) {
		addHourglass();
		$.ajax({
			url: languageListUrl(sId),
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					globals.gSelector.setSurveyLanguages(sId, data);
					retrievedLanguages(sId, selector, data, theCallback, filterQuestion, setGroupList, addNone);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["c_error"] + ": " + err);
					}
				}
			}
		});
	}

	var data = globals.gSelector.getSurveyLanguages(sId);
	if(data) {
		retrievedLanguages(sId, selector, data, callback, filterQuestion, setGroupList, addNone);
	} else {
		getAsyncLanguageList(sId, callback, selector, filterQuestion);
	}
}

/*
 * Called after languages have been retrieved
 */
function retrievedLanguages(sId, selector, data, theCallback, filterQuestion, setGroupList, addNone) {
	if(selector) {
		setSurveyViewLanguages(data, undefined, selector, addNone);
	} else {
		setSurveyViewLanguages(data, undefined, '#settings_language', false);
		setSurveyViewLanguages(data, undefined, '#export_language', true);
		setSurveyViewLanguages(data, undefined, '#language_name', false);
	}

	if(data[0]) {
		var dateQId = -1;
		if(typeof gTaskStart !== "undefined") {
			dateQId = gTaskStart;
		}
		getQuestionList(sId, data[0], filterQuestion, "-1", theCallback, setGroupList, undefined, dateQId, undefined, undefined, undefined);	// Default language to the first in the list
	} else {
		if(typeof theCallback === "function") {
			theCallback();
		}
	}
}

//Function to get the question list
function getQuestionList(sId, language, qId, groupId, callback, setGroupList, view, dateqId, qName, assignQuestion, scQuestion) {

	function getAsyncQuestionList(sId, language, theCallback, groupId, qId, view, dateqId, qName, assignQuestion, setGroupList, scQuestion) {

		var excludeReadOnly = true;
		if(setGroupList) {
			excludeReadOnly = false;		// Include read only questions in group list
		}
		addHourglass();
		$.ajax({
			url: questionListUrl(sId, language, excludeReadOnly),
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					globals.gSelector.setSurveyQuestions(sId, language, data);
					setSurveyViewQuestions(data, qId, view, dateqId, qName, assignQuestion, scQuestion);

					if (setGroupList && typeof setSurveyViewQuestionGroups === "function") {
						setSurveyViewQuestionGroups(data, groupId);
					}
					if (typeof theCallback === "function") {
						theCallback();
					}
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert("Error: Failed to get list of questions: " + err);
					}
				}
			}
		});
	}

	getAsyncQuestionList(sId, language, callback, groupId, qId, view, dateqId, qName, assignQuestion, setGroupList, scQuestion);
}

//Function to get the meta list
function getMetaList(sId, metaItem) {

	addHourglass();
	$.ajax({
		url: "/surveyKPI/metaList/" + sId,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gSelector.setSurveyMeta(sId, data);
				setSurveyViewMeta(data, metaItem);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		}
	});
}

/*
 * Function to get the list of notification alerts
 * These are extracted from the settings for the survey
 */
function getAlertList(sId, alertId) {

	addHourglass();
	$.ajax({
		url: "/surveyKPI/cases/settings/" + sId,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gSelector.setSurveyAlerts(sId, data);
				setSurveyAlerts(data, alertId);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		}
	});
}


//Set the language list in the survey view control
function setSurveyViewLanguages(list, language,elem, addNone) {

	var $languageSelect = $(elem),
		i;

	$languageSelect.empty();
	if(addNone) {
		$languageSelect.append('<option value="none">' + localise.set["c_none"] + '</option>');
	}

	for(i = 0; i < list.length; i++) {
		$languageSelect.append('<option value="' + list[i] + '">' + htmlEncode(list[i]) + '</option>');
	}

	if(language) {
		$languageSelect.val(language);
	}
}

// Set the question list in the survey view control
function setSurveyViewQuestions(list, qId, view, dateqId, qName, assignQuestion, scQuestion) {

	var $questionSelect = $('.selected_question'),
		$dateQuestions = $('.date_questions'),
		$scQuestions = $('#sc_question'),
		$questionNameSelect = $('.selected_name_question'),     // this should replace selected_question
		$assignQuestion = $('#assign_question'),
		label;

	$questionSelect.empty();
	$questionSelect.append('<option value="-1">' + localise.set["c_none"] + '</option>');

	$questionNameSelect.empty();
	$questionNameSelect.append('<option value="-1">' + localise.set["c_none"] + '</option>');

	$dateQuestions.empty();
	$dateQuestions.append('<option value="-1">' + localise.set["ed_i_c"] + '</option>');

	$scQuestions.empty();

	if(list) {
		$.each(list, function(j, item) {
			if(typeof item.q === "undefined") {
				label = "";
			} else {
				label = item.q;
			}

			$questionSelect.append('<option value="' + item.id + '">' + htmlEncode(item.name + " : " + label) + '</option>');
			$questionNameSelect.append('<option value="' + item.name + '">' + htmlEncode(item.name) + '</option>');
			if(item.type === 'timestamp' || item.type === 'dateTime' || item.type == 'date') {
				$dateQuestions.append('<option value="' + item.id + '">' + htmlEncode(item.name + " : " + label) + '</option>');
			}
			if(item.type === 'server_calculate') {
				let name = htmlEncode(item.name);
				$scQuestions.append(`<option value="${item.name}">${name}</option>`);
			}
		});
	}
	if(!qId) {
		qId = "-1";
	}
	$questionSelect.val(qId);

	if(!qName) {
		qName = "-1";
	}
	$questionNameSelect.val(qName);
	$assignQuestion.val(assignQuestion);

	if(!dateqId) {
		dateqId = "-1";
	}
	$dateQuestions.val(dateqId);

	// Server calculate question
	if(scQuestion) {
		$scQuestions.val(scQuestion);
	}

	if(view) {
		setFilterFromView(view);	// Set the filter dialog settings
	}

}

// Set the meta list in the survey view control
function setSurveyViewMeta(list, metaItem) {

	var $metaSelect = $('.selected_meta'),
		item,
		i;

	$metaSelect.empty();

	// Add none
	$metaSelect.append('<option value="-1">' + localise.set["c_none"] + '</option>');

	// Add the user who submitted the survey
	$metaSelect.append('<option value="_user">' + localise.set["c_submitter"] + '</option>');

	if(list) {
		for(i = 0; i < list.length; i++) {
			item = list[i];
			$metaSelect.append('<option value="' + item.name + '">' + htmlEncode(item.name) + '</option>');
		}
	}
	if(!metaItem) {
		metaItem = "-1";
	}
	$metaSelect.val(metaItem);

}

/*
 * Populate the alert list
 */
function setSurveyAlerts(settings, alertId) {

	var $elem = $('.alert_list'),
		item,
		i;

	$elem.empty();

	if(settings && settings.alerts) {
		for(i = 0; i < settings.alerts.length; i++) {
			item = settings.alerts[i];
			$elem.append('<option value="' + item.id + '">' + htmlEncode(item.name) + '</option>');
		}
	}
	if(alertId) {
		$elem.val(alertId);
	}


}

/*
 * ------------------------------------------------------------
 * Web service Functions
 */
function languageListUrl (sId) {

	var url = "/surveyKPI/languages/";
	url += sId;
	return url;
}

/*
 * Web service handler for retrieving available "count" questions for graph
 *  @param {string} survey
 */
function questionListUrl (sId, language, exc_read_only) {

	var url = "/surveyKPI/questionList/",
		ro_text;

	if(exc_read_only) {
		ro_text = "true";
	} else {
		ro_text = "false";
	}

	url += sId;
	url += "/" + encodeURIComponent(language);
	url += "?exc_read_only=" + ro_text;
	return url;
}

/**
 * Web service handler for question Meta Data
 * @param {string} survey id
 * @param {string} question id
 */
function questionMetaURL (sId, lang, qId) {

	var url = "/surveyKPI/question/";
	url += sId;
	url += "/" + lang;
	url += "/" + qId;
	url += "/getMeta";
	return url;
}

/*
 * Get a survey details - depends on globals being set
 */
function getSurveyDetails(callback, get_changes, hide_soft_deleted) {

	var tz = globals.gTimezone;
	var url="/surveyKPI/surveys/" + globals.gCurrentSurvey;
	if(get_changes) {
		url += "?get_changes=true";
		url += "&tz=" + encodeURIComponent(tz);
	} else {
		url += "?tz=" + encodeURIComponent(tz);
	}
	if(hide_soft_deleted) {
		url += "&get_soft_delete=false";
	}

	if(!globals.gCurrentSurvey) {
		alert("Error: Can't get survey details, Survey identifier not specified");
	} else {
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					globals.model.setSurveyData(data);
					globals.model.setSettings();
					setLanguages(data.languages, callback);

					if (typeof callback == "function") {
						callback();
					}
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						if (xhr.status == 404) {
							// The current survey has probably been deleted or the user no longer has access
							globals.gCurrentSurvey = undefined;
							return;
						}
						alert("Error: Failed to get survey: " + err);
					}
				}
			}
		});
	}
}

/*
 * Set the languages for the editor
 */
function setLanguages(languages, languageCallback) {

	var h = [],
		h2 = [],
		idx = -1,
		idx2 = -1,
		$lang_menu = $('.language_menu_list'),
		$lang = $('.language_list'),
		$lang1 = $('#language1'),
		$lang2 = $('#language2'),
		i;

	globals.gLanguage1 = 0;	// Language indexes used for translations
	globals.gLanguage2 = 0;
	if(languages.length > 1) {
		globals.gLanguage2 = 1;
	}

	for (i = 0; i < languages.length; i++) {
		h[++idx] = '<a data-lang="';
		h[++idx] = i;
		h[++idx] = '" class="dropdown-item" href="javascript:void(0)">';
		h[++idx] = htmlEncode(languages[i].name);
		h[++idx] = '</a>';

		h2[++idx2] = '<option value="';
		h2[++idx2] = i;
		h2[++idx2] = '">';
		h2[++idx2] = htmlEncode(languages[i].name);
		h2[++idx2] = '</option>';
	}

	$lang_menu.empty().append(h.join(""));
	$lang.empty().append(h2.join(""));

	$('#langSelected').text(languages[ globals.gLanguage].name);
	$('.language_menu_list a').click(function() {
		globals.gLanguage = $(this).data("lang");
		$('#langSelected').text(languages[ globals.gLanguage].name);
		languageCallback();
	});

	$lang1.val(globals.gLanguage1);
	$lang2.val(globals.gLanguage2)
}

/*
 * Get a survey details - depends on globals being set
 */
function createNewSurvey(name, existing, existing_survey, shared_results, callback) {

	console.log("create new: " + existing + " : " + existing_survey + " : " + shared_results);

	var url="/surveyKPI/surveys/new/" + globals.gCurrentProject + "/" + encodeURIComponent(name);
	if(!existing) {
		existing_survey = 0;
	}

	addHourglass();
	$.ajax({
		type: "POST",
		url: url,
		cache: false,
		dataType: 'json',
		data: {
			existing: existing,
			existing_survey: existing_survey,
			existing_form: 0,
			shared_results: shared_results
		},
		success: function(data) {
			removeHourglass();

			if(handleLogout(data)) {
				globals.model.setSurveyData(data);
				globals.model.setSettings();
				globals.gCurrentSurvey = data.id;

				saveCurrentProject(-1, globals.gCurrentSurvey, undefined);	// Save the current survey id

				setLanguages(data.languages, callback);

				if (typeof callback == "function") {
					callback();
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					bootbox.alert(localise.set["c_error"] + " " + htmlEncode(xhr.responseText));
				}
			}
		}
	});
}

/*
 * Open a form for editing
 */
function openForm(type) {

	$('.reusing_form').hide();
	$('#base_on_existing').prop('checked', false);
	$('#shared_results').prop('checked', false);
	$('#new_form_name').val("");
	if(type === "new") {
		$('.existing_form').hide();
		$('.new_form').show();
		$('#openSurveyLabel').html(localise.set["tm_g_new"]);
		$('#get_form').html(localise.set["c_create"]);
		globals.gExistingSurvey = false;
	} else {
		$('.existing_form').show();
		$('.new_form').hide();
		$('#openSurveyLabel').html(localise.set["tm_g_open"]);
		$('#get_form').html(localise.set["m_open"]);
		globals.gExistingSurvey = true;
	}
	$('#openFormModal').modal('show');

}

/*
 * If this is a smap server return the subdomain
 */
function getServerSubDomainName() {

	var hostname = location.hostname;
	var sd = "";

	if(hostname.indexOf('.smap.com.au') > 0) {
		sd = hostname.substring(0, hostname.indexOf('.smap.com.au'));
	} else if(hostname === 'localhost') {
		sd = 'localhost';
	}

	return sd;
}

/*
 * Return true if this is a business server
 */
function isBusinessServer() {

	var hostname = location.hostname;
	var bs = true;

	if(hostname.indexOf('smap.com.au') > 0) {
		bs = false;
	}
	if(hostname.indexOf('sg.smap.com.au') >= 0 ||
		hostname.indexOf('ubuntu1804.smap.com.au') >= 0 ||
		hostname.indexOf('demo.smap.com.au') >= 0) {
		bs = true;
	}

	return bs;
}

/*
 * Returns the class of server that has custom menus
 */
function getCustomMenuClass() {

	var hostname = location.hostname;
	var classname = undefined;

	if(hostname.indexOf('cuso.smap.com.au') >= 0) {
		classname = '.xxxx1';
	} else if(hostname.indexOf('demo.smap.com.au') >= 0) {
		classname = '.xxxx1';
	} else {
		if(hostname === 'localhost') {
			classname = '.xxxx1';   // testing
		}
	}

	return classname;
}


/*
 * Return true if this is a self registration server
 */
function isSelfRegistrationServer() {
	var hostname = location.hostname;
	var sr = true;

	if(hostname !== 'localhost' &&
		hostname !== 'sg.smap.com.au' &&
		hostname.indexOf('reachnettechnologies.com') < 0 &&
		hostname.indexOf('.icanreach.com') < 0 &&
		hostname.indexOf('encontactone.com') < 0 &&
		hostname !== 'app.kontrolid.com' &&
		hostname !== 'kontrolid.smap.com.au') {
		sr = false;
	}
	return sr;
}

/*
 * Validate start and end dates
 */
function validDates() {
	var $d1 = $('#startDate'),
		$d2 = $('#endDate'),
		d1 = $d1.data("DateTimePicker").date(),
		d2 = $d2.data("DateTimePicker").date()

	if(!d1 || !d1.isValid()) {
		$('#ut_alert').show().text(localise.set["t_i_sd"]);
		setTimeout(function() {
			$('.form-control', '#startDate').focus();
		}, 0);
		return false;
	}

	if(!d2 || !d2.isValid()) {
		$('#ut_alert').show().text(localise.set["t_i_ed"]);
		setTimeout(function() {
			$('.form-control', '#endDate').focus();
		}, 0);
		return false;
	}

	if(d1 > d2) {
		$('#ut_alert').show().text("End date must be greater than or the same as the start date");
		setTimeout(function() {
			$('.form-control', '#startDate').focus();
		}, 0);
		return false;
	}

	$('#ut_alert').hide();
	return true;
}

/*
 * Convert a date into UTC
 */
function getUtcDate($element, start, end) {

	var theDate,
		utcDate;

	if(start) {
		theDate = $element.data("DateTimePicker").date().startOf('day');
	} else if (end) {
		theDate = $element.data("DateTimePicker").date().endOf('day');
	} else {
		theDate = $element.data("DateTimePicker").date();
	}

	utcDate = moment.utc(theDate);

	console.log("date:" + theDate.format("YYYY-MM-DD HH:mm:ss"));
	console.log("UTC:" + utcDate.format("YYYY-MM-DD HH:mm:ss"));

	return utcDate.valueOf();

}

/*
 * Get a description from a change made in the editor
 */
function getChangeDescription(change, version) {

	var h =[],
		idx = -1,
		oldVal,
		newVal,
		forms = globals.model.survey.forms,
		str;

	if(change.action === "external option") {
		/*
		 * Options added from a file
		 */
		h[++idx] = 'Choice <span style="color:blue;">';
		h[++idx] = htmlEncode(change.option.externalLabel);
		h[++idx] = '</span>';
		h[++idx] = ' from file: <span style="color:blue;">';
		h[++idx] = htmlEncode(change.fileName);
		h[++idx] = '</span>';

	} else if(change.action === "template_update") {
		h[++idx] = localise.set["ed_c_template"];
		h[++idx] = ' <span style="color:blue;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "template_add") {
		h[++idx] = localise.set["ed_a_template"];
		h[++idx] = ' <span style="color:blue;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "template_delete") {
		h[++idx] = ' <span style="color:red;">';
		h[++idx] = localise.set["ed_d_template"];
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "settings_update") {
		h[++idx] = localise.set["ed_c_settings"];
		h[++idx] = ' <span style="color:blue;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "language_update") {
		h[++idx] = localise.set["ed_c_languages"];
		h[++idx] = ' <span style="color:blue;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "add_preload") {
		h[++idx] = ' <span style="color:blue;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "del_preload") {
		h[++idx] = ' <span style="color:red;">';
		h[++idx] = htmlEncode(change.msg);
		h[++idx] = '</span>';

	} else if(change.action === "update") {

		/*
		 * Updates to questions and options and list names
		 */
		if(change.property.prop === "type") {
			newVal = htmlEncode(translateType(change.property.newVal));
			oldVal = htmlEncode(translateType(change.property.oldVal));
		} else {
			newVal = htmlEncode(change.property.newVal);
			oldVal = htmlEncode(change.property.oldVal);
		}


		if(change.property.prop === "name") {

			// Deprecate the following when the structure of these log objects is made consistent
			if(typeof change.property.type === "optionList" || change.property.type === "unknown") {
				change.type = "choice list ";
			}

			h[++idx] = change.property.type;
			h[++idx] = ' ';
			h[++idx] = localise.set["msg_ren"],
				h[++idx] = ': <span style="color:blue;">';
			h[++idx] = newVal;		// Already encoded
			h[++idx] = '</span>';
			h[++idx] = ' from: <span style="color:red;">';
			h[++idx] = oldVal;	// Already encoded
			h[++idx] = '</span>';
		} else {
			str = localise.set["ed_c_chg_p"];
			if(change.property.propType === "constraint_msg" || change.property.propType === "required_msg" || change.property.propType === "guidance_hint") {
				str = str.replace("%s1", '"' + htmlEncode(change.property.propType) + '"');
			} else {
				str = str.replace("%s1", '"' + htmlEncode(change.property.prop) + '"');
			}
			str = str.replace("%s2", htmlEncode(change.property.name));
			str = str.replace("%s3", '<span style="color:blue;">' + newVal + '</span>');	// Already encoded
			str = str.replace("%s4", '<span style="color:red;">' + oldVal + '</span>');		// Already encoded
			h[++idx] = str;
		}

	} else if(change.action === "add")  {

		/*
		 * New questions or options
		 */
		if(change.type === "question" || change.changeType === "question"){  // deprecate checking of changeType

			str = localise.set["ed_c_add_q"];
			str = str.replace("%s1", '<span style="color:blue;">' + htmlEncode(change.question.name) + "</span>");
			var typeString;
			if(change.question.type === "string") {
				typeString = 'text';
			} else if(change.question.type === "select"){
				typeString = 'select_multiple';
			} else if(change.question.type === "select1"){
				typeString = 'select_one';
			} else {
				typeString = change.question.type;
			}
			str = str.replace("%s2", '<span style="color:red;">' + htmlEncode(typeString) + "</span>");
			h[++idx] = str;

		} else if(change.type === "option" || change.changeType === "option") {	// deprecate checking of changeType
			/*
			 * Options added or deleted from the editor
			 */
			str = localise.set["ed_c_add_o"];
			var valueStr = '<span style="color:blue;">' + change.option.value;
			if(change.option.labels && change.option.labels.length >= 1) {
				valueStr += ' (';
				valueStr += htmlEncode(change.option.labels[0].text);
				valueStr += ')';
			}
			valueStr += '</span>';
			str = str.replace("%s1", valueStr);
			str = str.replace("%s2", '<span style="color:blue;">' + htmlEncode(change.option.optionList) + '</span>');
			h[++idx] = str;
		}

	}  else if(change.action === "move")  {

		/*
		 * New questions or options
		 */
		h[++idx] = localise.set['c_moved'] + ' ';

		if(change.type === "question" || change.changeType === "question") {  // deprecate checking of changeType){

			h[++idx] = 'question <span style="color:blue;">';
			h[++idx] = htmlEncode(change.question.name);
			if(change.question.sourceSeq >= 0) {
				h[++idx] = '</span> from position <span style="color:red;">';
				h[++idx] = htmlEncode(change.question.sourceSeq);
				h[++idx] = '</span> in form ';
				h[++idx] = htmlEncode(forms[change.question.sourceFormIndex].name);
			} else {
				h[++idx] = '</span> from form ';
				h[++idx] = htmlEncode(forms[change.question.sourceFormIndex].name);
			}
			h[++idx] = '</span> to position <span style="color:red;">';
			h[++idx] = htmlEncode(change.question.seq);
			h[++idx] = '</span>';
			h[++idx] = ' in form ';
			if(change.question.formIndex < forms.length) {	// Allow for a form being deleted
				h[++idx] = htmlEncode(forms[change.question.formIndex].name);
			}


		} else if(change.type === "option") {

			h[++idx] = 'choice <span style="color:blue;">';
			h[++idx] = htmlEncode(change.option.value);
			if(change.option.labels && change.option.labels.length >= 1) {
				h[++idx] = ' (';
				h[++idx] = htmlEncode(change.option.labels[0].text);
				h[++idx] = ')';
			}
			h[++idx] = '</span>';
			h[++idx] = ' from choice list: <span style="color:blue;">';
			h[++idx] = htmlEncode(change.option.sourceOptionList);
			h[++idx] = '</span>';
			h[++idx] = ' to choice list: <span style="color:blue;">';
			h[++idx] = htmlEncode(change.option.optionList);
			h[++idx] = '</span>';
		}

	} else if(change.action === "delete")  {

		if(change.type === "question" || change.changeType === "question"){

			h[++idx] = localise.set["ed_c_del_q"];

			h[++idx] = ' <span style="color:blue;">';
			h[++idx] = htmlEncode(change.question.name);
			h[++idx] = '</span>';

		} else if(change.type === "option") {

			str = localise.set["ed_c_del_o"];
			var valueStr = '<span style="color:blue;">' + htmlEncode(change.option.value);
			if(change.option.labels && change.option.labels.length >= 1) {
				valueStr  += ' (';
				valueStr  += htmlEncode(change.option.labels[0].text);
				valueStr  += ')';
			}
			valueStr  += '</span>';
			str = str.replace("%s1", valueStr);
			str = str.replace("%s2", '<span style="color:blue;">' + htmlEncode(change.option.optionList) + '</span>');
			h[++idx] = str;
		}
	} else if(change.action === "set_required")  {
		if(change.msg.indexOf('not') < 0) {
			h[++idx] = localise.set["ed_c_sr"];
		} else {
			h[++idx] = localise.set["ed_c_snr"];
		}

	} else if(change.action === "upload_template")  {

		if(version > 1) {
			h[++idx] = localise.set["msg_survey_replaced"];
		} else {
			h[++idx] = localise.set["msg_survey_loaded"];
		}

	} else if(change.action === "role")  {

			h[++idx] = change.msg;

	} else {
		h[++idx] = htmlEncode(change.type);
		h[++idx] = ' ';
		h[++idx] = htmlEncode(change.name);
		h[++idx] = ' changed to: <span style="color:blue;">';
		h[++idx] = htmlEncode(change.newVal);
		h[++idx] = '</span>';
		h[++idx] = ' from: <span style="color:red;">';
		h[++idx] = htmlEncode(change.oldVal);
		h[++idx] = '</span>';
	}

	return h.join('');
}

// Translate types for use in change description
function translateType(input) {
	if(input === "string") {
		output = "text";
	} else {
		output = input;
	}
	return output;
}

/*
 * Get the shared locations from the server
 */
function getLocations(callback) {

	var url="/surveyKPI/tasks/locations";

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				if (typeof callback === "function") {
					callback(data);
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of locations: " + err);
				}
			}
		}
	});

}

/*
 * update Location group list
 */
function refreshLocationGroups(tags, includeAll, currentGroup) {

	var g = undefined,
		h = [],
		idx = -1,
		i;

	var includeNfc = $('#includeNfc').prop('checked'),
		includeGeo = $('#includeGeo').prop('checked');

	if(tags) {
		for(i = 0; i < tags.length; i++) {
			if(includeAll || includeLocation(includeNfc, includeGeo, tags[i].uid, tags[i].lat, tags[i].lon)) {

				if (g != tags[i].group) {

					g = tags[i].group;
					if (typeof currentGroup === "undefined") {
						currentGroup = g;
					}

					if(includeAll) {
						if (currentGroup === g) {
							$('.location_group_list_sel').text(g);
						}
						h[++idx] = '<a class="dropdown-item" href="#">';
						h[++idx] = g;
						h[++idx] = '</a>';
					} else {
						h[++idx] = '<option';
						if (currentGroup === g) {
							h[++idx] = ' selected';
						}
						h[++idx] = ' value="';
						h[++idx] = g;
						h[++idx] = '">';
						h[++idx] = htmlEncode(g);
						h[++idx] = '</option>';
					}
				}
			}
		}
	}

	$('.location_group_list').empty().html(h.join(""));
	return currentGroup;
}

/*
 * Add the locations (NFC tags or geofence) to any drop down lists that use them
 */
function setLocationList(locns, current, currentGroup) {

	var h = [],
		idx = -1,
		i;

	if(locns && locns.length) {
		h[++idx] = '<option value="-1">';
		h[++idx] = localise.set["c_none"];
		h[++idx] = '</option>';
		for(i = 0; i < locns.length; i++) {
			if(locns[i].group === currentGroup) {
				h[++idx] = '<option value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = htmlEncode(locns[i].name);
				h[++idx] = '</option>';
			}
		}
	}

	$('.location_select').empty().append(h.join(""));
	$('.location_select').val(current);


}

/*
 * Test for whether or not a location should be shown in the resource page
 */
function includeLocation(includeNfc, includeGeo, uid, lat, lon) {
	var include = false;

	if(includeNfc && typeof uid !== 'undefined' && uid !== '') {
		include = true;
	}
	if(!include && includeGeo && lat != 0 && lon != 0) {
		include = true;
	}

	return include;
}

/*
 * Convert a timestamp in UTC to local time and return a date object
 */
function localTimeAsDate(utcTime) {
	var utcDate,
		localTime;

	if(utcTime) {
		if(utcTime.indexOf('+') > 0) {
			utcDate  = moment.utc(utcTime, 'YYYY-MM-DD HH:mm:ss Z').toDate();
		} else {
			utcDate  = moment.utc(utcTime, 'YYYY-MM-DD HH:mm:ss').toDate();
		}
		localTime = moment(utcDate);
	}
	return localTime;
}

/*
 * Convert a timestamp in UTC to local time
 */
function localTime(utcTime) {
	var utcDate,
		localTime;

	if(utcTime) {
		if(utcTime.indexOf('+') > 0) {
			utcDate  = moment.utc(utcTime, 'YYYY-MM-DD HH:mm:ss Z').toDate();
		} else {
			utcDate  = moment.utc(utcTime, 'YYYY-MM-DD HH:mm:ss').toDate();
		}
		localTime = moment(utcDate).format('YYYY-MM-DD HH:mm:ss');
	}
	return localTime;
}


function utcTime(localTime) {

	var utcTime,
		localDate;

	if(localTime) {
		localDate = moment(localTime).toDate();
		utcTime =  moment.utc(localDate).format('YYYY-MM-DD HH:mm:ss');
	}
	return utcTime;

}

function isLate(finish) {

	var late = false,
		current = new Date(),
		finishDate,
		localFinish;

	if(finish) {
		localFinish = localTime(finish);
		finishDate = new Date(localFinish);
		if(current > finishDate) {
			late = true;
		}
	}
	return late;

}

function downloadPdf(language, orientation, include_references, launched_only, sIdent, instanceId, pdfTemplateId) {

	var docURL = "/surveyKPI/pdf/" + sIdent
		+ "?language=" + language
		+ "&instance=" + instanceId
		+ "&pdftemplate=" + pdfTemplateId
		+ "&tz=" + globals.gTimezone;
	if(orientation === "landscape") {
		docURL += "&landscape=true";
	}
	if(include_references) {
		docURL += "&reference_surveys=true";
	}
	if(launched_only) {
		docURL += "&launched_only=true";
	}

	downloadFile(docURL);
}

function downloadFile(url) {

	url += addCacheBuster(url);
	$("body").append("<iframe src='" + url + "' style='display: none;' ></iframe>");
	// Check for errors allow 5 seconds for an error to be returned
	setTimeout(downloadFileErrorCheck, 5000);
}

// Show an error generated by file download
function downloadFileErrorCheck() {
	var msg = $("iframe").last().contents().find('body').html();
	if(handleLogout(msg)) {
		if (msg && msg.indexOf("Error:") === 0) {
			alert(msg.substring(7));	// Jump over "Error: "
		} else if (msg && msg.length > 0) {
			alert(msg);
		}
	}
}

/*
 * Post data to be converted into a file
 */
function generateFile(url, filename, format, mime, data, sId, groupSurvey, title, project, charts, chartData, settings, tz, form) {

	var fd = new FormData();
	fd.append("sId", sId);
	fd.append("format", format);
	if(groupSurvey) {
		fd.append("groupSurvey", groupSurvey)
	}
	if(form) {
		fd.append("form", form);
	}
	if(data) {
		var blob = new Blob([JSON.stringify(data)], { type: 'text/plain' });
		var file = new File([blob], "foo.txt", {type: "text/plain"});
		fd.append("data", file);
		//fd.append("data", JSON.stringify(data));
	}
	if(title) {
		fd.append("title", title);
	}
	if(project) {
		fd.append("project", project);
	}
	if(charts) {
		fd.append("charts", JSON.stringify(charts));
	}
	if(chartData) {
		fd.append("chartData", JSON.stringify(chartData));
	}
	if(settings) {
		fd.append("settings", JSON.stringify(settings));
	}
	if(tz) {
		fd.append("tz",JSON.stringify(tz));
	}

	var xhr = new XMLHttpRequest();
	url += addCacheBuster(url);
	xhr.open('POST', url, true);
	xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
	xhr.responseType = 'blob';

	xhr.onload = function(e) {
		if(handleLogout(xhr.responseURL)) {
			if (this.status == 200) {
				// get binary data as a response
				var blob = new Blob([this.response], {type: mime});
				var downloadUrl = URL.createObjectURL(blob);
				var a = document.createElement("a");
				a.href = downloadUrl;
				a.download = filename;
				document.body.appendChild(a);
				a.click();
				setTimeout(function () {
					document.body.removeChild(a);
					window.URL.revokeObjectURL(url);
				}, 100);
			} else {
				alert(localise.set["c_error"] + ": " + this.statusText);
			}
		}
	};

	xhr.onerror = function(e) {
		if(handleLogout(this)) {
			alert("Error: Upload Failed");
		}
	}

	xhr.send(fd);

}

/*
 * Get the currently selected rows of datatable data as a json array
 * Also convert the JSON object into an array of Key values pairs. This allows easy converion
 * to a java object on the server
 */
function getTableData(table, columns, format) {

	var rows = table.rows({
		order:  'current',  // 'current', 'applied', 'index',  'original'
		page:   'all',      // 'all',     'current'
		search: 'applied',     // 'none',    'applied', 'removed'
	}).data();

	var data = [],
		cols = [],
		i, j;

	for(i = 0; i < rows.length; i++) {
		cols = [];
		for(j = 0; j < columns.length; j++) {
			if(format === "xlsx" || !columns[j].hide) {
				var k = columns[j].displayName;
				var v = rows[i][columns[j].column_name];

				if (typeof v !== "string") {
					v = JSON.stringify(v);
				}
				cols.push({
					k: k,
					v: v
				})
			}
		}
		data.push(cols);
	}

	return data;


}

/*
 * Get server settings
 */
function getMapboxDefault(callback, param) {

	if(!globals.gMapboxDefault) {
		addHourglass();
		$.ajax({
			url: '/surveyKPI/server/mapbox',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					globals.gMapboxDefault = data;
					if (typeof callback === "function") {
						callback(param);
					}
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["error"] + ": " + err);
					}
				}
			}
		});
	} else {
		if(typeof callback === "function") {
			callback(param);
		}
	}
}


/*
 * Get google map api key
 */
function getGoogleMapApi(callback, map) {

	console.log("getGoogleMapApi");

	if(!window.smapLoadedGMaps && !window.smapGMapsLoading) {
		console.log("about to call server");

		window.smapGMapsLoading = true;

		window.smapGMapsToLoad = [];
		window.smapGMapsToLoad.push({
			fn: callback,
			locn: map
		});

		addHourglass();
		$.ajax({
			url: '/surveyKPI/server/googlemaps',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					console.log("Retrieved map keys from server");

					var gElement = document.createElement('script');
					var key = "";
					if (data) {
						key = "?key=" + data;
					}
					//gElement.src = "//maps.google.com/maps/api/js?v=3.6&amp";
					gElement.src = "https://maps.googleapis.com/maps/api/js" + key;
					if (typeof callback === "function") {
						gElement.onload = onLoad;
					}
					document.getElementsByTagName('head')[0].appendChild(gElement);

					function onLoad() {

						var i;

						window.smapGMapsLoading = false;
						window.smapLoadedGMaps = true;

						console.log("Google map loaded");

						for (i = 0; i < window.smapGMapsToLoad.length; i++) {
							console.log("map callback");
							window.smapGMapsToLoad[i].fn(window.smapGMapsToLoad[i].locn);
						}
						delete window.smapGMapsToLoad;
					}
				}

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["error"] + " " + err);
					}
				}
			}
		});

	} else if(window.smapLoadedGMaps) {
		console.log("Already loaded calling map callback");
		callback(map);
	} else {
		console.log("Adding callback to queue");
		window.smapGMapsToLoad.push({
			fn: callback,
			locn: map
		});
	}
}

/*
 * Add google layers to a map
 */
function addGoogleMapLayers(map) {
	try {
		map.addLayer(new OpenLayers.Layer.Google("Google Satellite",{type: google.maps.MapTypeId.SATELLITE, 'sphericalMercator': true, numZoomLevels: 22}));
		map.addLayer(new OpenLayers.Layer.Google("Google Maps",{type: google.maps.MapTypeId.ROADMAP, 'sphericalMercator': true, numZoomLevels: 22}));
		map.addLayer(new OpenLayers.Layer.Google("Google Hybrid",{type: google.maps.MapTypeId.HYBRID, 'sphericalMercator': true, numZoomLevels: 22}));
	} catch (err) {
		// Fail silently, the user may not want google maps - this is probably caused by a missing maps api key
	}
}

/*
 * Get a list of custom reports
 */
function getReports(callback1, callback2, type) {

	var url="/surveyKPI/custom_reports";

	if(type) {
		url += "?type=" + type;
	}

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				var cb1 = callback1,
					cb2 = callback2,
					t = type;
				globals.gReports = data;
				if (typeof cb1 === "function") {
					cb1(data, cb1, cb2, t);
				}
				if (typeof cb2 === "function") {
					cb2(data, cb1, cb2, t);
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of reports: " + err);
				}
			}
		}
	});

}

/*
 * Allow the user to pick a report
 */
function showReportList(data) {
	var h = [],
		idx = -1,
		i;

	removeHourglass();

	if(data.length === 0) {

		// Enable / disable elements specifically for managed forms
		$('.selectmanaged').show();
		$('.no_oversight').show();
	} else {
		$('.no_oversight').hide();
		$('.selectmanaged').show();

		h[++idx] = '<option value="0">';
		h[++idx] = localise.set["c_none"];
		h[++idx] = '</option>';
		for(i = 0; i < data.length; i++) {
			h[++idx] = '<option value="';
			h[++idx] = data[i].id;
			h[++idx] = '">';
			h[++idx] = htmlEncode(data[i].name);
			h[++idx] = '</option>';
		}
		$('.customReportList').empty().html(h.join(''));
	}
}

/*
 * Show the Custom Reports in a table
 */
function refreshCustomReportView(data, callback1, callback2, type) {

	var $selector = $('#cr_list'),
		i,
		h = [],
		idx = -1;

	$('.panel_msg').show();
	$('#addReportPopup').modal("hide");

	data = data || [];
	globals.gReports = data;

	h[++idx] = '<table class="table">';
	h[++idx] = '<thead>';
	h[++idx] = '<tr>';
	h[++idx] = '<th>' + localise.set["c_name"], + '</th>';
	h[++idx] = '<th>' + localise.set["c_type"] + '</th>';
	h[++idx] = '</tr>';
	h[++idx] = '</thead>';
	h[++idx] = '<tbody class="table-striped">';

	for(i = 0; i < data.length; i++) {

		h[++idx] = '<tr>';

		// name
		h[++idx] = '<td>';
		h[++idx] = htmlEncode(data[i].name);
		h[++idx] = '</td>';

		// type
		h[++idx] = '<td>';
		h[++idx] = htmlEncode(data[i].type);
		h[++idx] = '</td>';

		// actions
		h[++idx] = '<td>';

		h[++idx] = '<button type="button" data-idx="';
		h[++idx] = i;
		h[++idx] = '" class="btn btn-default btn-sm rm_cr">';
		h[++idx] = '<i class="fa fa-trash-o"></i></button>';

		h[++idx] = '<button type="button" data-idx="';
		h[++idx] = i;
		h[++idx] = '" class="btn btn-default btn-sm download_cr">';
		h[++idx] = '<i class="fa fa-download"></i></button>';

		h[++idx] = '</td>';
		// end actions

		h[++idx] = '</tr>';
	}

	h[++idx] = '</tbody>';
	h[++idx] = '</table>';

	$selector.empty().append(h.join(''));

	$(".rm_cr", $selector).click(function(){
		var idx = $(this).data("idx");
		if(confirm(localise.set["msg_confirm_del"] + " " + htmlEncode(globals.gReports[idx].name))) {
			deleteCustomReport(globals.gReports[idx].id, type);
		}
	});

	$(".download_cr", $selector).click(function(){
		var idx = $(this).data("idx");
		downloadFile("/surveyKPI/custom_reports/xls/" + globals.gReports[idx].id +
			"?filetype=xls&filename=" + cleanFileName(globals.gReports[idx].name));
	});


}

function deleteCustomReport(id, type) {

	var url = "/surveyKPI/custom_reports/" + id;
	if(type) {
		url += "?type=" + type;
	}

	addHourglass();
	$.ajax({
		type: "DELETE",
		url: url,
		success: function(data, status) {
			removeHourglass();
			if(handleLogout(data)) {
				var t = type;
				console.log("delete: " + t + " : " + type);
				getReports(refreshCustomReportView, showReportList, t);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_del"] + " " + xhr.responseText);	// alerts htmlencode text
				}
			}
		}
	});
}

/*
 * Get the list of available roles from the server
 */
function getRoles(callback) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/role/roles",
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gRoleList = data;
				if (typeof callback === "function") {
					callback();
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_r"] + " " + err);
				}
			}
		}
	});
}

/*
 * Get the list of available case management settings from the server
 */
function getCms(callback) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/cases/settings/" + globals.gCurrentSurvey,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gCmSettings = data;
				if (typeof callback === "function") {
					callback();
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_r"] + " " + err);
				}
			}
		}
	});
}

/*
 * Clean the filename so that it can be passed in a URL
 */
function cleanFileName(filename) {

	var n;

	n = filename.replace(/\//g, '_');	// remove slashes from the filename
	n = n.replace(/[#?&]/g, '_');		// Remove other characters that are not wanted
	n = n.replace("'", "", 'g');		// Remove apostrophes

	return n;
}

/*
 * Add a list of forms to pick from during export
 */
function addFormPickList(sMeta, checked_forms) {

	var h = [],
		idx = -1,
		i;

	// Start with the top level form
	for(i = 0; i < sMeta.forms.length; i++) {
		if(sMeta.forms[i].p_id == 0) {
			$(".osmforms").html(addFormToList(sMeta.forms[i], sMeta, 0, true, false, checked_forms, false));
			$(".selectforms").html(addFormToList(sMeta.forms[i], sMeta, 0, false, false, checked_forms, false));
			$(".shapeforms,.taforms").html(addFormToList(sMeta.forms[i], sMeta, 0, true, true, checked_forms, false));
			$(".shapeforms_bs4").html(addFormToList(sMeta.forms[i], sMeta, 0, true, true, checked_forms, true));
		}
	}

	$("button",".selectforms").click(function() {
		var $this = $(this),
			$check = $this.parent().find("input"),
			val,
			val_array = [];

		val = $check.val();
		val_array= val.split(":");
		if(val_array.length > 1) {
			if(val_array[1] === "true") {
				$check.val(val_array[0] + ":false");
				$this.text("Pivot");
			} else {
				$check.val(val_array[0] + ":true");
				$this.text("Flat");
			}
			$this.toggleClass('exportflat');
			$this.toggleClass('exportpivot');
		}

		return false;
	});
}

/*
 * Add a list of date questions to pick from
 */
function addDatePickList(sMeta, currentDate) {

	var h = [],
		idx = -1,
		i,
		value,
		key;

	if(sMeta && sMeta.dates) {
		for(i = 0; i < sMeta.dates.length; i++) {

			key = sMeta.dates[i].name;

			h[++idx] = '<option value="';
			h[++idx] = sMeta.dates[i].id;
			h[++idx] = '">';
			if(key === "Upload Time" || key === "_start" || key === "_end") {
				key = localise.set[key];
			} else if(key === "Scheduled Start") {
				key = localise.set["c_scheduled"]
			}
			h[++idx] = htmlEncode(key);
			h[++idx] = '</option>';

		}

		$(".date_question").empty().html((h.join('')));

		if(typeof currentDate !== "undefined" && currentDate != 0) {
			value = currentDate;
		} else {
			value = $("#settings_date_question").val();
		}
	}
}

/*
 * Add a list of geometry questions to pick from
 */
function addGeomPickList(sMeta) {

	var h = [],
		k = [],
		idx = -1,
		i,
		value,
		theForm;

	if(sMeta && sMeta.forms) {
		for(i = 0; i < sMeta.forms.length; i++) {

			theForm = sMeta.forms[i];

			k[++idx] = h[++idx] = '<div class="exportcontrol showshape showosm" style="display: block;">';
			k[++idx] = h[++idx] = '<label>' + htmlEncode(theForm.form) + '</label>';
			h[++idx] = '<select class="geomSelect" id="geomForm_' + theForm.f_id;            // export only
			k[++idx] = '<select class="geomSelect" id="geomSettingsForm_' + theForm.f_id;    // Settings only
			k[++idx] = h[++idx] = '" data-form="' + theForm.f_id + '">';
			if(theForm.geomQuestions) {
				for(j = 0; j < theForm.geomQuestions.length; j++) {
					k[++idx] = h[++idx] = '<option value="';
					k[++idx] = h[++idx] = theForm.geomQuestions[j];
					k[++idx] = h[++idx] = '">';
					k[++idx] = h[++idx] = htmlEncode(theForm.geomQuestions[j]);
					k[++idx] = h[++idx] = '</option>';
				}
			}
			k[++idx] = h[++idx] = '</select>';
			k[++idx] = h[++idx] = '</div>';

		}

		$(".geomselect_export").empty().html((h.join('')));
		$(".geomselect_settings").empty().html((k.join('')));

		shapeFormsChanged();

	}
}

function shapeFormsChanged() {
	var formId = getSelectedForm('.shapeforms', true);
	if(formId) {
		$('.geomSelect', '.geomselect_export').prop('disabled', true);
		$('#geomForm_' + formId, '.geomselect_export').prop('disabled', false);
	}
}

function getSelectedForm($forms, ignoreError) {
	var forms = $(':radio:checked', $forms).map(function() {
		return this.value;
	}).get();
	if(forms.length === 0) {
		if(!ignoreError) {
			alert(window.localise.set["msg_one_f2"]);
		}
		return 0;
	}
	return forms[0];
}

function addFormToList(form, sMeta, offset, osm, set_radio, checked_forms, bs4) {

	var h = [],
		idx = -1,
		i,
		type,
		checked;

	if (set_radio) {
		type = "radio";
	} else {
		type = "checkbox";
	}

	// Set checked value based on previous selections
	if(set_radio && offset == 0) {
		checked = 'checked="checked"';
	} else {
		if (offset == 0 && (!checked_forms || checked_forms.length == 0)) {
			checked = 'checked="checked"';
		} else {
			checked = '';
		}
	}
	if(checked_forms && checked_forms.length > 0) {
		for(i = 0; i < checked_forms.length; i++) {
			if(form.f_id == checked_forms[i]) {
				checked = 'checked="checked"';
				break;
			}
		}
	}

	h[++idx] = '<div class="' + type + '"';
	h[++idx] = '<span style="padding-left:';
	h[++idx]= offset + 'px;">';
	h[++idx] = '<label>';
	h[++idx] = '<input class="osmform" type="' + type + '" ' + checked + ' name="osmform" value="';
	h[++idx] = form.f_id;
	if(!osm) {
		h[++idx] = ':false"/>';
	} else {
		h[++idx] = '">';
	}
	if(bs4) {
		h[++idx] = '<span class="ml-2">';
	}
	h[++idx] = htmlEncode(form.form);
	if(bs4) {
		h[++idx] = '</span>';
	}
	h[++idx] = '</label>';
	if(form.p_id != 0 && !osm) {
		h[++idx] = ' <button class="exportpivot">' + localise.set["c_pivot"] + '</button>';
	}
	h[++idx]= '</div>';

	// Add the children (recursively)
	for(i = 0; i < sMeta.forms.length; i++) {
		if(sMeta.forms[i].p_id != 0  && sMeta.forms[i].p_id == form.f_id) {
			h[++idx] = addFormToList(sMeta.forms[i], sMeta, offset + 20, osm, set_radio, checked_forms, bs4);
		}
	}

	return h.join('');
}

function getViewLanguages(view) {

	if(view.sId != -1) {
		var url = languageListUrl(view.sId);
		$.getJSON(url, function(data) {
			globals.gSelector.setSurveyLanguages(view.sId, data);
			setSurveyViewLanguages(data, view.lang, '#settings_language', false);
			setSurveyViewLanguages(data, view.lang, '#export_language', true);
		});
	}

}

function validateEmails(emails) {
	var valid = true,
		i;
	if(emails && emails.trim().length > 0) {
		var emailArray = emails.split(",");
		for (i = 0; i < emailArray.length; i++) {
			var validEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+.[A-Z]{2,4}/igm;
			if (!validEmail.test(emailArray[i])) {
				valid = false;
				break;
			}
		}
	}
	return valid;
}

/*
 * Get the roles for a survey
 */
function getSurveyRoles(sId, selectedRoles, setall, onlypriv) {

	if (!gTasks.cache.surveyRoles[sId]) {
		addHourglass();
		var url = "/surveyKPI/role/survey/" + sId + "?enabled=true";
		if(onlypriv) {
			url += "&onlypriv=true";
		}
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				if(handleLogout(data)) {
					var savedSelectedRoles = selectedRoles;
					gTasks.cache.surveyRoles[sId] = data;
					showRoles(gTasks.cache.surveyRoles[sId], savedSelectedRoles);
				}
			},
			error: function (xhr, textStatus, err) {

				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log("Error: Failed to get roles for a survey: " + err);
					}
				}
			}
		});
	} else {
		showRoles(gTasks.cache.surveyRoles[sId], selectedRoles, setall);
	}
}

/*
 * Show the roles
 */
function showRoles(data, selectedRoles, setall) {

	var h = [],
		idx = -1,
		i,
		selId,
		selList = [];

	$('.role_select_roles').empty();
	if (data.length > 0) {
		for (i = 0; i < data.length; i++) {
			h[++idx] = '<div class="col-sm-10 custom-control custom-checkbox ml-2 mb-1">'
			h[++idx] = '<input type="checkbox"';
			selId = 'rolesel_' + i;
			h[++idx] = ' id="' + selId + '"';
			if(setall || roleSelected(data[i].id, selectedRoles)) {
				selList.push(selId);
			}
			h[++idx] = ' class="custom-control-input" value="';
			h[++idx] = data[i].id;
			h[++idx] = '">';

			h[++idx] = '<label class="custom-control-label"';
			h[++idx] = ' for="rolesel_' + i + '">';
			h[++idx] = 	htmlEncode(data[i].name);
			h[++idx] = '</label>';
			h[++idx] = '</div>';
		}
		$('.role_select').show();
		$('.role_select_roles').empty().append(h.join(''));
		for(i = 0; i < selList.length; i++) {
			selId = selList[i];
			$('#' + selId).prop('checked', true);
		}
	}
}

function roleSelected(roleId, selectedRoles) {
	var sel = false;
	if(selectedRoles) {
		for(var i = 0; i < selectedRoles.length; i++) {
			if(selectedRoles[i].id == roleId) {
				sel = true;
				break;
			}
		}
	}
	return sel;
}

 /*
  * Get all the surveys that a user can access
  */
function getAccessibleSurveys($elem, includeNone, includeBlocked, groupsOnly, includeSelf) {

	var url="/surveyKPI/surveys";
	var hasParam = false;
	if(includeBlocked) {
		url += hasParam ? '&' : '?';
		url += 'blocked=true';
		hasParam = true;
	}
	if(groupsOnly) {
		url += hasParam ? '&' : '?';
		url += 'groups=true';
		hasParam = true;
	}

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				var h = [],
					idx = -1,
					i;

				if (includeNone) {
					h[++idx] = '<option value="">';
					h[++idx] = localise.set["c_none"]
					h[++idx] = '</option>';
				}

				if (includeSelf) {
					h[++idx] = '<option value="self">';
					h[++idx] = localise.set["c_self"]
					h[++idx] = '</option>';
				}
				for (i = 0; i < data.length; i++) {
					h[++idx] = '<option value="';
					h[++idx] = htmlEncode(data[i].ident);
					h[++idx] = '">';
					h[++idx] = htmlEncode(data[i].projectName);
					h[++idx] = ' : ';
					h[++idx] = htmlEncode(data[i].displayName);
					h[++idx] = '</option>';
				}
				$elem.empty().append(h.join(''));
			}

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of surveys: " + err);
				}
			}
		}
	});
}

/*
 * Get all the csv files that a user can access
 */
function getAccessibleCsvFiles($elem, includeNone) {

	var url="/surveyKPI/shared/csv/files";

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				globals.gCsvFiles = data;
				var h = [],
					idx = -1,
					i;

				if (includeNone) {
					h[++idx] = '<option value="">';
					h[++idx] = localise.set["c_none"]
					h[++idx] = '</option>';
				}
				for (i = 0; i < data.length; i++) {
					h[++idx] = '<option value="';
					h[++idx] = i;
					h[++idx] = '">';
					h[++idx] = htmlEncode(data[i].filename);
					h[++idx] = '</option>';
				}
				$elem.empty().append(h.join(''));
			}

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of csv files: " + err);
				}
			}
		}
	});
}

 /*
  * Get the questions in a survey
  */
function getQuestionsInSurvey($elem, $elem_multiple, sIdent, includeNone, textOnly, callback, includeHrk) {

	function populateElement($elem, $elem_multiple, data) {
		var h = [],
			hm = [],
			idx = -1,
			idx_m = -1,
			i,
			setValueFn = callback;

		if (includeNone) {
			h[++idx] = '<option value="0">';
			h[++idx] = localise.set["c_none"];
			h[++idx] = '</option>';
		}
		if (includeHrk) {
			hm[++idx_m] = h[++idx] = '<option value="_hrk">';
			hm[++idx_m] = h[++idx] = localise.set["ed_hrk"];
			hm[++idx_m] = h[++idx] = '</option>';

			hm[++idx_m] = h[++idx] = '<option value="_assigned">';
			hm[++idx_m] = h[++idx] = localise.set["t_assigned"];
			hm[++idx_m] = h[++idx] = '</option>';
		}
		for (i = 0; i < data.length; i++) {
			if(!textOnly || isTextStorageType(data[i].type)) {
				hm[++idx_m] = h[++idx] = '<option value="';
				hm[++idx_m] = h[++idx] = data[i].name;
				hm[++idx_m] = h[++idx] = '">';
				hm[++idx_m] = h[++idx] = htmlEncode(data[i].name);
				hm[++idx_m] = h[++idx] = '</option>';
			}
		}
		if($elem) {
			$elem.empty().append(h.join(''));
		}
		if($elem_multiple) {
			$elem_multiple.empty().append(hm.join(''));
			$elem_multiple.multiselect('deselectAll', false);
			$elem_multiple.multiselect('rebuild');
		}

		if(typeof setValueFn === "function") {
			setValueFn();
		}
	}

	if(sIdent === 'self') {
		populateElement($elem, $elem_multiple, globals.model.survey.forms[globals.gFormIndex].questions);
	} else if(gCache[sIdent]) {
		populateElement($elem, $elem_multiple, gCache[sIdent]);
	} else {
		if (sIdent && sIdent !== "0" && sIdent !== '' && sIdent !== '_none') {
			addHourglass();
			$.ajax({
				url: "/surveyKPI/questionListIdent/" + sIdent + "/none?inc_meta=true",
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();
					if(handleLogout(data)) {
						var theIdent = sIdent;
						var $theElem = $elem;
						var $theElemMultiple = $elem_multiple;

						gCache[theIdent] = data;
						populateElement($theElem, $theElemMultiple, data);
					}
				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if(handleLogout(xhr.responseText)) {
						if (xhr.readyState == 0 || xhr.status == 0) {
							return;  // Not an error
						} else {
							alert(localise.set["msg_err_get_q"] + ": " + err);
						}
					}
				}
			});
		} else {
			if (includeNone) {
				if($elem) {
					$elem.empty().append('option value="0">' + localise.set["c_none"] + '</option>');
				}
				if($elem_multiple) {
					$elem_multiple.empty().append('option value="0">' + localise.set["c_none"] + '</option>');
					$elem_multiple.multiselect('rebuild');
				}
			}
		}
	}

}

function getQuestionsInCsvFile($elem, $elem_multiple, index, includeNone) {
	var h = [],
		hm = [],
		idx = -1,
		idx_m = -1,
		i;

	if(globals.gCsvFiles[index]) {
		var data = globals.gCsvFiles[index].headers;

		if (includeNone) {		// Only include select none for single selects
			h[++idx] = '<option value="">';
			h[++idx] = localise.set["c_none"];
			h[++idx] = '</option>';
		}
		for (i = 0; i < data.length; i++) {
			hm[++idx_m] = h[++idx] = '<option value="';
			hm[++idx_m] = h[++idx] = data[i].fName;
			hm[++idx_m] = h[++idx] = '">';
			hm[++idx_m] = h[++idx] = htmlEncode(data[i].fName);
			hm[++idx_m] = h[++idx] = '</option>';
		}
		if ($elem) {
			$elem.empty().append(h.join(''));
		}
		if ($elem_multiple) {
			$elem_multiple.empty().append(hm.join(''));
			$elem_multiple.multiselect('deselectAll', false)
			$elem_multiple.multiselect('rebuild');
		}
	}
}

/*
 * Get the questions in a survey
 */
function getGroupQuestionsInSurvey($elem, sIdent) {

	function populateElement($elem, data) {
		var h = [],
			idx = -1,
			i;

		h[++idx] = '<option data-type="" value="">';
		h[++idx] = localise.set["c_none"];
		h[++idx] = '</option>';

		for (i = 0; i < data.length; i++) {
			h[++idx] = '<option data-type="';
			h[++idx] = data[i].type;
			h[++idx] = '" value="';
			h[++idx] = data[i].name;
			h[++idx] = '">';
			h[++idx] = htmlEncode(data[i].name);
			h[++idx] = '</option>';
		}
		$elem.empty().append(h.join(''));
	}

	if(gCacheGroup[sIdent]) {
		populateElement($elem, gCacheGroup[sIdent]);
	} else {
		if (sIdent !== "0") {
			addHourglass();
			$.ajax({
				url: "/surveyKPI/questionListIdent/" + sIdent + "/none/group",
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();
					if(handleLogout(data)) {
						var theIdent = sIdent;
						var $theElem = $elem;

						gCacheGroup[theIdent] = data;
						populateElement($theElem, data);
					}

				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if(handleLogout(xhr.responseText)) {
						if (xhr.readyState == 0 || xhr.status == 0) {
							return;  // Not an error
						} else {
							alert(localise.set["msg_err_get_q"] + ": " + err);
						}
					}
				}
			});
		} else {
			if (includeNone) {
				$elem.empty().append('option value="0">' + localise.set["c_none"] + '</option>');
			}
		}
	}

}

/*
 * Get the questions suitable for use as a status in a survey group using the survey id as the key
 */
function getGroupStatusQuestions($elem, sId) {

	function populateElement($elem, data) {
		var h = [],
			idx = -1,
			i;

		for (i = 0; i < data.length; i++) {
			h[++idx] = '<option value="';
			h[++idx] = data[i].column_name;
			h[++idx] = '">';
			h[++idx] = htmlEncode(data[i].name);
			h[++idx] = '</option>';
		}
		$elem.empty().append(h.join(''));
	}

	if(gCacheStatusQuestions[sId]) {
		populateElement($elem, gCacheStatusQuestions[sId]);
	} else {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/questionList/" + sId + "/none/group?status=true",
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				if(handleLogout(data)) {
					var theId = sId;
					var $theElem = $elem;

					gCacheStatusQuestions[theId] = data;
					populateElement($theElem, data);
				}

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_get_q"] + ": " + err);
					}
				}
			}
		});
	}
}

/*
 * Get the questions suitable for use as a status in a survey group using the survey id as the key
 */
function getGroupKeys($key, $key_policy, sId) {

	if(gCacheKeys[sId]) {
		$key.val(gCacheStatusQuestions[sId].key);
		$key_policy.val(gCacheStatusQuestions[sId].key_policy)
	} else {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/cases/keys/" + sId,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				if(handleLogout(data)) {
					var theId = sId;

					gCacheStatusQuestions[theId] = data;
					$key.val(gCacheStatusQuestions[sId].key);
					$key_policy.val(gCacheStatusQuestions[sId].key_policy);
				}

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["c_error"] + ": " + err);
					}
				}
			}
		});
	}
}

function tokenizeAppearance(input) {
	var chunks = [];
	var tokens = [];
	var chunkTokens = [];
	var i;
	var j;
	var chunk;

	// only search/lookup_choices needs special treatment
	var idx1 = input.indexOf('search');
	if(idx1 < 0) {
		idx1 = input.indexOf('lookup_choices');
	}
	if(idx1 >= 0) {
		chunks.push({
			val:input.substring(0, idx1),
			type: "text"
		});
		if(idx1 < input.length) {
			var idx2 = input.lastIndexOf(')');
			if(idx2 >= 0) {
				chunks.push({
					val: input.substring(idx1, idx2 + 1),
					type: "fn"
				});
				if(idx2 < input.length) {
					chunks.push({
						val: input.substring(idx2 + 1),
						type: "text"
					});
				}
			}
		}
	} else {
		chunks.push({
			val: input,
			type: "text"
		});
	}
	for(i = 0; i < chunks.length; i++) {
		chunk = chunks[i].val.trim();
		if(chunk.length > 0) {
			if(chunks[i].type === "text") {
				chunkTokens = chunk.split(/(\s+)/);
			} else {
				chunkTokens = [];
				chunkTokens.push(chunk);
			}
			for(j = 0; j < chunkTokens.length; j++) {
				if(chunkTokens[j].trim().length > 0) {
					tokens.push(chunkTokens[j].trim());
				}
			}
		}
	}
	return tokens;
}

function setOrganisationTheme() {

	if(globals.gSetAsTheme && globals.gOrgId > 0) {

		var mainLogoSrc = getFromLocalStorage("main_logo");
		var logo = "/media/organisation/" + globals.gOrgId + '/settings/mainLogo';
		if(mainLogoSrc !== logo) {
			setInLocalStorage('main_logo', logo);
			$('.main_logo').attr("src", "/media/organisation/" + globals.gOrgId + '/settings/mainLogo');
		}

		// navbar color
		var navbarColor = getFromLocalStorage("navbar_color");
		if(navbarColor !== globals.gNavbarColor) {
			setInLocalStorage('navbar_color', globals.gNavbarColor);
		}
		// navbar color
		var navbarTextColor = getFromLocalStorage("navbar_text_color");
		if(navbarTextColor !== globals.gNavbarTextColor) {
			setInLocalStorage('navbar_text_color', globals.gNavbarTextColor);
		}
	} else {
		// remove styles
		var navbarColorElement = document. getElementById("navbar_color");
		if(navbarColorElement) {
			navbarColorElement.parentNode.removeChild(navbarColorElement);
		}
		setInLocalStorage('navbar_color', undefined);
		setInLocalStorage('navbar_text_color', undefined);
		setInLocalStorage('main_logo', undefined);

		// Set the default logo
		if(typeof setCustomMainLogo === "function") {
			setCustomMainLogo();
		}
	}
}

/*
 * Surround get / set from local storage in case user has disabled local sorage reading in browser settings
 */
function getFromLocalStorage(key) {
	var value;
	try {
		value = localStorage.getItem(key);
	} catch (e) {

	}
	return value;
}

function setInLocalStorage(key, value) {
	try {
		localStorage.setItem(key, value);
	} catch(e) {

	}
}

function populateTaskGroupList() {
	if (typeof globals.gCurrentProject !== "undefined" && globals.gCurrentProject != -1) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/tasks/taskgroups/" + globals.gCurrentProject,
			cache: false,
			dataType: 'json',
			success: function (taskgroups) {
				removeHourglass();
				if(handleLogout(taskgroups)) {
					var h = [],
						idx = -1,
						i,
						grp,
						firstTg,
						hasCurrentTg = false;

					window.gTaskGroups = taskgroups;   // Keep the task group list

					if (typeof taskgroups != "undefined" && taskgroups.length > 0) {

						for (i = 0; i < taskgroups.length; i++) {
							grp = taskgroups[i];
							h[++idx] = '<option value="';
							h[++idx] = i;
							h[++idx] = '">';
							h[++idx] = htmlEncode(grp.name);
							h[++idx] = '</option>';
						}
					}
					$('.task_group_select').html(h.join(''));
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert("Failed to get task group data");
					}
				}
			}
		});
	}
}

/*
 * Show a loaded file as an image
 * From https://codepen.io/adamrifai/pen/YXdEwz
 */
function displayAsImage(file, img) {

	var imgURL = URL.createObjectURL(file);
	img.onload = function() {
		URL.revokeObjectURL(imgURL);
	};

	img.src = imgURL;
}

/*
 * If debug=yes is passed as a parameter then enable debuging statement
 */
function enableDebugging() {

	if(location.search.indexOf("debug=yes") >= 0) {
		$(document).on('click', function(e) { console.log(e.target) });
	}

}

/*
 * ----------------------------------------------------
 * Common task functions shared between task managmeent page and console
 */
function setupAssignType(user_id, role_id, emails, email_question) {
	$('.assign_group').hide();
	$('.assign_type').removeClass('active');
	if(user_id != 0) {
		$('.user_type_checkbox').addClass('active');
		$('.assign_user').show();
	} else  if(role_id != 0) {
		$('.role_type_checkbox').addClass('active');
		$('.assign_role').show();
	} else if((typeof emails !== "undefined" && emails.trim().length > 0)
			|| (typeof email_question !== "undefined" && email_question.trim().length > 0)) {
		$('.email_type_checkbox').addClass('active');
		$('.assign_email').show();
	} else {        // Default to user
		$('.user_type_checkbox').addClass('active');
		$('.assign_user').show();
	}
}

// Convert a location name into a location index
function getLocationIndex(name, tags) {
	var idx = -1,
		i;

	if(tags) {
		for(i = 0; i < tags.length; i++) {
			if(tags[i].name == name) {
				idx = i;
				break;
			}

		}
	}
	return idx;

}

function saveTask(isConsole, currentTaskFeature, saveType, updateId, callback, tg_id) {
	var url = "/surveyKPI/api/tasks?preserveInitialData=true&tz=UTC",	// Assume we use UTC times in interface
		taskFeature = {
			properties: {}
		},
		fromDate,
		toDate,
		MIN_SHOW_RANGE = 10;

	taskFeature = $.extend(true, {}, currentTaskFeature);
	taskFeature.properties.assignee_ident = undefined;
	taskFeature.properties.assignee_name = undefined;

	/*
	 * Set the properties of the taskFeature from the dialog
	 */
	taskFeature.properties.p_id = globals.gCurrentProject;
	taskFeature.properties.tg_id = tg_id;

	if (!taskFeature.properties.id || taskFeature.properties.id == "") {
		taskFeature.properties["id"] = 0;
	}
	taskFeature.properties.name = $('#tp_name').val();		// task name
	var surveyIdentifier = $('#tp_form_name').val();
	if(!surveyIdentifier) {
		alert(localise.set["msg_pss"]);
		return false;
	}
	if(isConsole) {
		taskFeature.properties.survey_ident = surveyIdentifier;	// Survey Ident
		taskFeature.properties.form_id = undefined;
	} else {
		// old fashioned
		taskFeature.properties.form_id = surveyIdentifier;	// form id
		taskFeature.properties.survey_ident = undefined;
	}

	taskFeature.properties.assign_type = $("button.assign_type.active", "#task_properties").attr("id");
	if(taskFeature.properties.assign_type == 'tp_user_type') {
		taskFeature.properties.assignee = $('#tp_user').val();
		taskFeature.properties.emails = undefined;
	} else if(taskFeature.properties.assign_type == 'tp_email_type') {
		taskFeature.properties.assignee = 0;
		taskFeature.properties.emails = $('#tp_assign_emails').val();
		if(!validateEmails(taskFeature.properties.emails)) {
			alert(localise.set["msg_inv_email"]);
			return false;
		}
	}

	if(isConsole) {
		taskFeature.properties.update_id = updateId;
		taskFeature.properties.initial_data_source = 'survey';
	}

	taskFeature.properties.repeat = $('#tp_repeat').prop('checked');
	taskFeature.properties.complete_all = $('#tp_pol').prop('checked');
	taskFeature.properties.assign_auto = $('#tp_assign_auto').prop('checked');

	fromDate = $('#tp_from').data("DateTimePicker").date();
	toDate = $('#tp_to').data("DateTimePicker").date();

	// Validate dates
	if(toDate && !fromDate) {       // Can't have a to date without a from date
		alert(localise.set["msg_no_from"]);
		return false;
	}
	if(toDate && fromDate && fromDate > toDate) {       // To date must be after from date
		alert(localise.set["msg_sel_dates"]);
		return false;
	}

	if (fromDate) {
		taskFeature.properties.from = utcTime(fromDate.format("YYYY-MM-DD HH:mm:ss"));
	}
	if (toDate) {
		taskFeature.properties.to = utcTime(toDate.format("YYYY-MM-DD HH:mm:ss"));
	}

	taskFeature.properties.location_trigger = $('#nfc_uid').val();
	taskFeature.properties.guidance = $('#tp_guidance').val();
	taskFeature.properties.show_dist = $('#tp_show_dist').val();

	/*
	 * Save location group and location name
	 */
	var locationIdx = $('#location_select').val();
	if(saveType == "nl") {
		taskFeature.properties.location_group = $('#locationGroupSave').val();
		taskFeature.properties.location_name = $('#locationSave').val();
	} else if(saveType == "ul" && locationIdx != "-1") {
		taskFeature.properties.location_group = $('.location_group_list_sel').text();
		taskFeature.properties.location_name = window.gTags[locationIdx].name;
	} else {
		taskFeature.properties.location_group = undefined;
		taskFeature.properties.location_name = undefined;
	}
	taskFeature.properties.save_type = saveType;

	/*
	 * Convert the geoJson geometry into longitude and latitude for update
	 */
	if (currentTaskFeature.geometry) {
		if (currentTaskFeature.geometry.coordinates && currentTaskFeature.geometry.coordinates.length > 1) {
			//taskFeature.properties.location = "POINT(" + gCurrentTaskFeature.geometry.coordinates.join(" ") + ")";  // deprecate
			taskFeature.properties.lon = currentTaskFeature.geometry.coordinates[0];
			taskFeature.properties.lat = currentTaskFeature.geometry.coordinates[1];

		} else {
			//taskFeature.properties.location = "POINT(0 0)"; // deprecate
			taskFeature.properties.lon = 0;
			taskFeature.properties.lat = 0;
		}
	}

	// TODO task update details (updating existing record)

	// Validations
	if(typeof taskFeature.properties.show_dist === "undefined") {
		taskFeature.properties.show_dist = 0;
	} else {
		taskFeature.properties.show_dist = +taskFeature.properties.show_dist;
	}
	if (taskFeature.properties.show_dist && taskFeature.properties.show_dist < MIN_SHOW_RANGE) {
		alert(localise.set["msg_val_show_dist"]);
		$('#tp_show_dist').focus();
		return;
	}


	var tpString = JSON.stringify(taskFeature.properties);

	addHourglass();
	$.ajax({
		type: "POST",
		dataType: 'text',
		cache: false,
		contentType: "application/x-www-form-urlencoded",
		url: url,
		data: {task: tpString},
		success: function (data, status) {
			removeHourglass();
			if(handleLogout(data)) {
				$('#task_properties').modal("hide");
				callback();
			}
		},
		error: function (xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				alert(localise.set["msg_err_upd"] + " " + xhr.responseText);	// Alerts htmlencode text already
			}
		}
	});
}

/*
 * Get the list of users from the server so they can be assigned to tasks
 */
function getTaskUsers(projectId) {
	var $users = $('.users_select,#users_filter'),
		i, user,
		h = [],
		idx = -1;

	$users.empty();
	$('#users_filter').append('<option value="0">' + localise.set["t_au"] + '</options>');

	$('#users_select_new_task, #users_task_group, #users_select_user, #tp_user')
		.append('<option value="-1">' + localise.set["t_u"] + '</options>');

	$('#users_task_group').append('<option value="-2">' + localise.set["t_ad"] + '</options>');
	$.ajax({
		url: "/surveyKPI/userList",
		cache: false,
		success: function (data) {

			if(handleLogout(data)) {
				for (i = 0; i < data.length; i++) {
					user = data[i];
					// Check that this user has access to the project

					if (!projectId || userHasAccessToProject(user, projectId)) {
						h[++idx] = '<option value="';
						h[++idx] = user.id;
						h[++idx] = '">';
						h[++idx] = htmlEncode(user.name);
						h[++idx] = '</option>';
					}
				}
				$users.append(h.join(''));
			}
		},
		error: function (xhr, textStatus, err) {
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + err);
				}
			}
		}
	});
}

function userHasAccessToProject(user, projectId) {
	var i;
	if(user.projects) {
		for (i = 0; i < user.projects.length; i++) {
			if (user.projects[i].id == projectId) {
				return true;
			}
		}
	}
	return false;
}

function setupTaskDialog() {
	$('#tp_email_type, #assign_email_type').click(function() {
		$('.assign_type').removeClass('active');
		$(this).addClass('active');

		$('.assign_user, .assign_role,.assign_data').hide();
		$('.assign_email').show();
		$('#assign_data').prop('placeholder', localise.set['n_eqc']);
		$('.assign_data').show();
	});
	$('#tp_user_type, #assign_user_type').click(function() {
		$('.assign_type').removeClass('active');
		$(this).addClass('active');

		$('.assign_user').show();
		$('.assign_role,.assign_email').hide();
		if($('#users_task_group').val() == -2) {
			$('#assign_data').prop('placeholder', "");
			$('.assign_data').show();
		} else {
			$('.assign_data').hide();
		}
	});
	$('#tp_role_type, #assign_role_type').click(function() {
		$('.assign_type').removeClass('active');
		$(this).addClass('active');

		$('.assign_user, .assign_email').hide();
		$('.assign_role').show();
		if($('#roles_task_group').val() == -2) {
			$('#assign_data').prop('placeholder', "");
			$('.assign_data').show();
		} else {
			$('.assign_data').hide();
		}
	});

	$('#tp_from').datetimepicker({
		useCurrent: false,
		locale: gUserLocale || 'en'
	});

	$('#tp_to').datetimepicker({
		useCurrent: false,
		locale: gUserLocale || 'en'
	});

	$('#tp_from').on("dp.change", function () {

		var startDateLocal = $(this).data("DateTimePicker").date(),
			endDateLocal = $('#tp_to').data("DateTimePicker").date(),
			originalStart = gCurrentTaskFeature.properties.from,
			originalEnd = gCurrentTaskFeature.properties.to,
			newEndDate,
			duration;

		if (startDateLocal) {

			if (originalEnd && originalStart) {
				duration = moment(originalEnd, "YYYY-MM-DD HH:mm:ss").diff(moment(originalStart, "YYYY-MM-DD HH:mm:ss"), 'hours');
				newEndDate = startDateLocal.add(duration, 'hours');
				$('#tp_to').data("DateTimePicker").date(newEndDate);
			}
		}



	});

}

function getStatusClass(status, assign_auto) {

	var statusClass = "";

	if (status === "new") {
		if(assign_auto) {
			statusClass = "bg-orange";
		} else {
			statusClass = "bg-info";
		}
	} else if (status === "submitted" || status === "success") {
		statusClass = "bg-success";
	} else if (status === "late") {
		statusClass = "bg-danger";
	} else if (status === "accepted" || status === "pending") {
		statusClass = "bg-warning";
	} else 	if (status === "error" || status === "unsent" || status === "unsubscribed"
		|| status === "blocked" || status === "rejected" || status === "cancelled" || status === "deleted") {
		statusClass = "bg-rejected";
	} else {
		statusClass = "bg-success";
	}
	return statusClass;
}

/*
 *------------------------------------------------------------------
 * Common notification functions shared between console and notifications
 */
function edit_notification(edit, idx, inconsole) {

	var notification;
	var title;

	document.getElementById("notification_edit_form").reset();

	if(edit) {
		notification = window.gNotifications[idx];

		$('#bundle').prop('checked', notification.bundle);
		$('#addNotificationLabel').text(localise.set["msg_edit_notification"]);
		$('#trigger').val(notification.trigger);
		$('#target').val(notification.target);
		$('#name').val(notification.name);
		setTargetDependencies(notification.target);
		$('.assign_question').hide();
		if(notification.target === 'escalate' && notification.remote_user === '_data') {
			$('.assign_question').removeClass('d-none').show();
		}

		gSelectedOversightQuestion = notification.updateQuestion;
		gSelectedOversightSurvey = notification.updateSurvey;
		setTriggerDependencies(notification.trigger);
		setAttachDependencies(notification.notifyDetails.attach);

		if (notification.trigger !== "task_reminder") {
			if(notification.bundle) {
				$('#bundle_survey').val(notification.bundle_ident).change();
			} else {
				$('#survey').val(notification.s_id).change();
			}
		}
		$('#not_filter').val(notification.filter);
		$('#update_value').val(notification.updateValue);
		$('#alerts').val(notification.alert_id);
		$('#sc_question').val(notification.updateQuestion);
		$('#sc_value').val(notification.updateValue);

		// reminder settings
		if (!inconsole) {
			$('#task_group').val(getTaskGroupIndex(notification.tgId));
			if ((notification.period)) {
				var periodArray = notification.period.split(" ");
				if (periodArray.length > 1) {
					$('#r_period').val(periodArray[0]);
					$('#period_list_sel').val(periodArray[1]);
				}
			}
			if(notification.trigger === "task_reminder") {
				taskGroupChanged($('#task_group').val(), notification.notifyDetails.emailQuestionName, notification.notifyDetails.emailMeta);
			}
		}

		// Periodic settings
		$('#periodic_period').val(notification.periodic_period);
		$('#periodic_time').val(notification.periodic_time);
		$('#periodic_week_day').val(notification.periodic_week_day);
		$('#periodic_month_day').val(notification.periodic_month_day);
		$('#periodic_month, #periodic_month_quarter').val(notification.periodic_month);
		$('#report').val(notification.r_id);
		setPeriodDependencies(notification.periodic_period);

		if(notification.trigger !== "task_reminder" && (typeof notification.alert_id !== 'undefined'
			|| (notification.notify_details && (notification.notifyDetails.emailQuestionName || notification.notifyDetails.emailMeta)))) {

				surveyChangedNotification(notification.notifyDetails.emailQuestionName,
					notification.notifyDetails.assign_question,
					notification.notifyDetails.emailMeta,
					notification.alert_id,
					notification.updateQuestion,
					notification.notifyDetails.survey_case);
		}

		if (notification.notifyDetails) {

			if (notification.target == "email" || notification.target == "escalate") {
				if (notification.notifyDetails.emails) {
					$('#notify_emails').val(notification.notifyDetails.emails.join(","));
				}
				$('#assigned_user').prop('checked', notification.notifyDetails.emailAssigned);
				$('#email_subject').val(notification.notifyDetails.subject);
				$('#email_content').val(notification.notifyDetails.content);
				$('#email_attach').val(notification.notifyDetails.attach);
				$('#include_references').prop('checked', notification.notifyDetails.include_references);
				$('#launched_only').prop('checked', notification.notifyDetails.launched_only);
			} else if (notification.target == "sms") {
				if (notification.notifyDetails.emails) {
					$('#notify_sms').val(notification.notifyDetails.emails.join(","));
				}
				$('#sms_content').val(notification.notifyDetails.content);
				$('#sms_attach').val(notification.notifyDetails.attach);
				$('#sms_sender_id').val(notification.notifyDetails.subject);
			} else if (notification.target == "conversation") {
				if (notification.notifyDetails.emails) {
					$('#notify_sms').val(notification.notifyDetails.emails.join(","));
				}
				$('#conversation_text').val(notification.notifyDetails.content);
			} else if (notification.target == "webhook") {
				$('#callback_url').val(notification.notifyDetails.callback_url);
			}
		}
		if (!inconsole) {
			$('#fwd_user,#user_to_assign').val(notification.remote_user).change();
			$('#assign_question').val(notification.notifyDetails.assign_question);
			$('#survey_case').val(notification.notifyDetails.survey_case);
			gEligibleUser = notification.remote_user;
			// Password not returned from server - leave blank

			$('#fwd_host').val(notification.remote_host);

			// assign user from data
			if($('#user_to_assign').val() === '_data') {
				$('.assign_question').removeClass('d-none').show();
			}

			if (notification.enabled) {
				$('#nt_enabled').prop('checked', true);
			} else {
				$('#nt_enabled').prop('checked', false);
			}
		}

		window.gUpdateFwdPassword = false;
		window.gSelectedNotification = notification.id;
	} else {

		$('#fwd_host').val(window.gRemote_host);	// Set the values to the one's last used
		$('#fwd_user').val(window.gRemote_user);

		$('#survey').change();

		setTargetDependencies('email');
		setTriggerDependencies('submission');

		// Reminders
		$('#r_period').val(1);
		$('#period_list_sel').val('days');
		$('#nt_enabled').prop('checked',true);
		window.gUpdateFwdPassword = true;
		window.gSelectedNotification = -1;
	}
	bundleSelectChanged();

}

function bundleSelectChanged() {
	if($('#bundle').is(':checked')) {
		$('.bundle').show();
		$('.notbundle').hide();
	} else {
		$('.bundle').hide();
		$('.notbundle').show();
	}
}
function setTargetDependencies(target) {
	$('.sms_options, .webhook_options, .email_options, .escalate_options, .conv_options').hide();
	if(target === "email") {
		$('.email_options').show();
		initMsgNotPopup(target);
	} else if(target === "sms") {
		$('.sms_options').show();
	} else if(target  === "webhook") {
		$('.webhook_options').show();
	} else if(target  === "escalate") {
		$('.escalate_options,.email_options').show();
	} else if(target  === "conversation") {
		$('.conv_options').show();
		initMsgNotPopup(target);
	}
}

function setTriggerDependencies(trigger) {
	$('.task_reminder_options,.update_options, .submission_options, .cm_alert_options, .periodic_options, .sc_options').hide();
	if(trigger === "submission") {
		$('.submission_options').show();
	} else if(trigger === "task_reminder") {
		$('.task_reminder_options').show();
		$('#target').val('email');
		setTargetDependencies('email');
	} else if(trigger === "cm_alert") {
		$('.cm_alert_options').show();
	} else if(trigger === "periodic") {
		$('.periodic_options').show();
	} else if(trigger === "server_calc") {
		$('.sc_options').show();
	}
}

function setAttachDependencies(attach) {
	if(attach === "pdf" || attach === "pdf_landscape") {
		$('.pdf_options').show();
	} else  {
		$('.pdf_options').hide();
	}
}

function setPeriodDependencies(period) {
	$('.periodic_week_day, .periodic_month_day, .periodic_month, .periodic_month_quarter').hide();
	if(period === "weekly") {
		$('.periodic_week_day').show();
	} else if(period === "monthly") {
		$('.periodic_month_day').show();
	} else if(period === "yearly") {
		$('.periodic_month').show();
	} else if(period === "quarterly") {
		$('.periodic_month_quarter').show();
	}
}

/*
 * Initialise notification popup
 * Only required if the eDitRecord variable is set as used in immediate notifications
 */
function initMsgNotPopup(target) {
	if(window.gEditRecord) {
		var $msg = $('#msg_cur_nbr');
		var $email = $('#email_cur');
		var other = localise.set["c_other"];

		$('.other_msg').hide();
		$('.recvd_emails').hide();

		$msg.empty();
		var hasSelect = false;
		var hasEmailSelect = false;
		if (window.gEditRecord.contacts) {
			for (const [key, value] of Object.entries(window.gEditRecord.contacts)) {
				// Hack fix up channel for old entries, its either sms or email
				if (!value.channel) {
					value.channel = (key.indexOf("@") > 0) ? 'email' : 'sms';
				}

				if (!value.channel || value.channel === 'sms' || value.channel === 'whatsapp') {
					hasSelect = true;
					$msg.append(`<option data-channel="${value.channel}" value="${key}">${key} - ${value.channel} </option>`);
				} else {
					hasEmailSelect = true;
					$email.append(`<option value="${key}">${key}</option>`);
				}
				setOurNumbersList();
			}
		}
		$msg.append(`<option value="other">${other}</option>`);
		$email.append(`<option value="other">${other}</option>`);
		if(target === "conversation") {
			msgCurNbrChanged();
		}

		if(hasEmailSelect) {
			$('.recvd_emails').show();
		}

		$('#msg_cur_nbr').change(function () {
			msgCurNbrChanged();
		});

		$('#msg_channel').change(function () {
			setOurNumbersList();
		});

	}
}

/*
 * Change attribute visibility if the user select an existing number to message or selects other
 */
function msgCurNbrChanged($choice) {
	if ($('#msg_cur_nbr').val() === 'other') {
		$('.other_msg').show();
		$('#msg_channel').prop( "disabled", false);
	} else {
		$('.other_msg').hide();
		$('#msg_channel').val($('#msg_cur_nbr option:selected').attr('data-channel')).prop( "disabled", true).trigger("change");
	}
}

/*
 * Update the notification list
 */
function updateNotificationTypes(data) {

	var $selector=$('#target'),
		i,
		h = [],
		idx = -1;

	for(i = 0; i < data.length; i++) {

		h[++idx] = '<option value="';
		h[++idx] = data[i];
		h[++idx] = '">';
		h[++idx] = localise.set["c_" + data[i]];
		h[++idx] = '</option>';
	}

	$selector.empty().append(h.join(''));
	gConversationalSMS = false;

}

/*
 * Load the existing notifications from the server
 */
function getNotificationTypes(page) {

	addHourglass();
	$.ajax({
		url: '/surveyKPI/notifications/types?page=' + page,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				window.gNotificationTypes = data;
				if (data) {
					updateNotificationTypes(data);
					if(gTasks && gTasks.cache && gTasks.cache.currentData) {
						updateConversationalSMS(gTasks.cache.currentData.sms);
					}
				}
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get list of notification types: " + err);
				}
			}
		}
	});
}

/*
 * Update anything related to using conversations and SMS
 */
function updateConversationalSMS(sms) {
	if(sms && !gConversationalSMS) {  // Add if there is SMS data associated with this survey and the type has not already been added
		var $selector=$('#target'),
			h = [],
			idx = -1;


		h[++idx] = '<option value="conversation">';
		h[++idx] = localise.set["c_conversation"];
		h[++idx] = '</option>';

		$selector.append(h.join(''));
		gConversationalSMS = true;
	}
}

function setupNotificationDialog() {

	// Set change function trigger
	$('#trigger').off().change(function() {
		var trigger = $(this).val();
		setTriggerDependencies(trigger);
		if(trigger === "task_reminder") {
			taskGroupChanged($('#task_group').val());
		}
		if(trigger === "console_update") {
			getGroupSurveys($('#survey').val(), showOversightSurveys);
		}
	});
	setTriggerDependencies("submission");

	// Set change function target
	$('#target').off().change(function() {
		setTargetDependencies($(this).val());
	});
	setTargetDependencies("email");

	// Set change function attach
	$('#email_attach').off().change(function() {
		setAttachDependencies($(this).val());
	});

	// Set dependencies on a periodic trigger period change
	setPeriodDependencies($('#period_period').val());
	$('#periodic_period').off().change(function() {
		setPeriodDependencies($(this).val());
	});


	// Set focus on notification name when edit notification is opened
	$('#addNotificationPopup').on('shown.bs.modal', function () {
		$('#name').focus();
	});

	/*
	 * Functions for forwarding
	 */
	$('#fwd_host').change(function(){
		var host = $(this).val();
		if(host.length === 0) {
			return false;
		} else if(host.substr(0, 4) !== "http") {
			alert(localise.set["msg_val_prot"]);
			return false;
		}
	});

	$('#fwd_password').change(function(){
		window.gUpdateFwdPassword = true;
	});

}

/*
 Get updated question names if the task group changes
 */
function taskGroupChanged(tgIndex, emailQuestionName, emailMetaName) {

	var tg = gTaskGroups[tgIndex];
	var language = "none";
	var qList;
	var metaList;

	if(tg && tg.source_s_id) {
		qList = globals.gSelector.getSurveyQuestions(tg.source_s_id, language);
		metaList = globals.gSelector.getSurveyMeta(tg.source_s_id);
	} else {
		qList = [];
		metaList = [];
	}

	if(!qList) {
		getQuestionList(tg.source_s_id, language, 0, "-1", undefined, false,
			undefined, undefined, emailQuestionName, undefined);
	} else {
		setSurveyViewQuestions(qList, undefined, undefined, undefined, emailQuestionName, undefined, undefined, undefined);
	}

	if(!metaList) {
		getMetaList(tg.source_s_id, undefined);
	} else {
		setSurveyViewMeta(metaList, undefined);
	}
}

/*
 * Process a save notification when the target is "email"
 */
function saveEmail() {

	var notification = {};
	var emails = $('#notify_emails').val();
	var emailQuestionName = $('#email_question').val();
	var emailMetaItem = $('#email_meta').val();
	var emailAssigned = $('#assigned_user').is(':checked');
	var emailArray;
	var i;

	// validate
	// Must specifify an email
	notification.error = false;
	if((!emails || emails.trim().length == 0) && (!emailQuestionName || emailQuestionName == "-1")
		&& (!emailMetaItem || emailMetaItem == "-1") && !emailAssigned) {
		notification.error = true;
		notification.errorMsg = localise.set["msg_inv_email"];
		notification.notifyDetails = {};
	}

	// Text email must be valid email addresses
	if(emails && emails.trim().length > 0) {
		emailArray = emails.split(",");
		for (i = 0; i < emailArray.length; i++) {
			if (!validateEmails(emailArray[i])) {
				notification.error = true;
				notification.errorMsg = localise.set["msg_inv_email"];
				notification.notifyDetails = {};
				break;
			}
		}
	}

	if(!notification.error) {
		notification.target = "email";
		notification.notifyDetails = {};
		notification.notifyDetails.emails = emailArray;
		notification.notifyDetails.emailQuestionName = emailQuestionName;
		notification.notifyDetails.emailAssigned = emailAssigned;
		notification.notifyDetails.emailMeta = emailMetaItem;
		notification.notifyDetails.subject = $('#email_subject').val();
		notification.notifyDetails.content = $('#email_content').val();
		notification.notifyDetails.attach = $('#email_attach').val();
		notification.notifyDetails.include_references = $('#include_references').prop('checked');
		notification.notifyDetails.launched_only = $('#launched_only').prop('checked');
	}

	return notification;
}

/*
 * Process a save notification when the target is "sms"
 */
function saveSMS() {

	var notification = {};

	notification.target = "sms";
	notification.notifyDetails = {};
	notification.notifyDetails.emails = $('#notify_sms').val().split(",");
	notification.notifyDetails.emailQuestionName = $('#sms_question').val();
	notification.notifyDetails.subject = $('#sms_sender_id').val();
	notification.notifyDetails.content = $('#sms_content').val();
	notification.notifyDetails.attach = $('#sms_attach').val();

	return notification;
}

/*
 * Process a save notification when the target is "document"
 */
function saveDocument() {

	var notification = {};

	notification.target = "document";
	notification.notifyDetails = {};

	return notification;
}

/*
 * Process a save notification when the target is "conversation"
 */
function saveConversation(columns, theirNumber, ourNumber, msgChannel, record) {

	var notification = {};

	notification.target = "conversation";
	notification.notifyDetails = {};
	notification.notifyDetails.content = $('#conversation_text').val();
	notification.notifyDetails.emails = [theirNumber];		// Must be sent as an array
	notification.notifyDetails.ourNumber = ourNumber;
	notification.notifyDetails.msgChannel = msgChannel;

	if(!theirNumber || theirNumber.length === 0) {
		notification.error = true;
		notification.errorMsg = localise.set["msg_no_nbr"];
	}
	return notification;
}

/*
 * Process a save notification when the target is "webhook"
 */
function saveWebhook() {

	var error = false,
		callback_url,
		notification = {};

	callback_url = $('#callback_url').val();

	if(!error) {

		notification.target = "webhook";
		notification.remote_user = $('#fwd_user').val();
		notification.remote_password = $('#fwd_password').val();
		notification.notifyDetails = {};
		notification.notifyDetails.callback_url = callback_url;
		notification.update_password = window.gUpdateFwdPassword;

	} else {
		notification.error = true;
	}

	return notification;
}

/*
 * Process a save notification when the target is "escalate"
 */
function saveEscalate() {

	var error = false,
		callback_url,
		notification = {};

	if(!error) {

		notification.target = "escalate";
		notification.remote_user = $('#user_to_assign').val();


		notification.notifyDetails = {};
		notification.notifyDetails.survey_case = $('#survey_case').val();
		notification.notifyDetails.assign_question = $('#assign_question').val();

	} else {
		notification.error = true;
	}

	return notification;
}

function getTaskGroupIndex(tgId) {
	var i;
	if(gTaskGroups && gTaskGroups.length > 0 && tgId) {
		for(i = 0; i < gTaskGroups.length; i++) {
			if(gTaskGroups[i].tg_id == tgId) {
				return i;
			}
		}
	}
	return 0;
}

function surveyChangedNotification(qName, assignQuestion, metaItem, alertId, updateQuestion, surveyVal) {

	var language = "none",
		bundle = $('#bundle').is(':checked'),
		sId = $('#survey').val() || 0,
		bundle_ident = $('#bundle_survey').val(),
		qList,
		metaList,
		alertList;

	if(bundle && bundle_ident) {
		getGroupSurveys(bundle_ident, setGroupSelector, surveyVal);		// Get the surveys in the group
	} else if(sId) {
		if(!qName) {
			qName = "-1";
		}

		getGroupSurveys(sId, setGroupSelector, surveyVal);		// Get the surveys in the group

		qList = globals.gSelector.getSurveyQuestions(sId, language);
		metaList = globals.gSelector.getSurveyMeta(sId);
		alertList = globals.gSelector.getSurveyAlerts(sId);

		if(!qList) {
			getQuestionList(sId, language, 0, "-1", undefined, false,
				undefined, undefined, qName, assignQuestion, updateQuestion);
		} else {
			setSurveyViewQuestions(qList, undefined, undefined, undefined, qName, assignQuestion, undefined, updateQuestion);
		}

		if(!metaList) {
			getMetaList(sId, metaItem);
		} else {
			setSurveyViewMeta(metaList, metaItem);
		}

		if(!alertList) {
			getAlertList(sId, alertId);
		} else {
			setSurveyAlerts(alertList, alertId);
		}

	}
}

function getInitialDataLink(task) {
	var tab = [];
	idx = -1;

	tab[++idx] = '<a href="';
	tab[++idx] = getWebFormUrl(task.properties.survey_ident,
		task.properties.update_id,
		task.properties.initial_data_source,
		task.properties.id,
		task.properties.a_id);
	tab[++idx] = '" target="_blank">'
	tab[++idx] = '<i class="fa fa-file-text"></i>';	// Edit existing data
	tab[++idx] = '</a>';

	return tab.join('');
}

function getWebFormUrl(form_ident, update_id, initial_data_source, taskId, assignmentId) {
	var url,
		hasParams = false;

	initial_data_souce = initial_data_source || 'none';

	url = "/webForm/" + form_ident;

	if (update_id && initial_data_source === 'survey') {
		url += "?datakey=instanceid&datakeyvalue=" + update_id;
		url += "&viewOnly=true"
		hasParams = true;
	} else {
		url += '?taskkey=';
		url += taskId;
		hasParams = true;
	}
	url += (hasParams ? '&' : '?');
	url += 'assignment_id=';
	url += assignmentId;

	return url;
}

function taskReport(taskGroup) {
	var tz = Intl.DateTimeFormat().resolvedOptions().timeZone,
		tzParam = "",
		url = '/surveyKPI/tasks/xls/' + taskGroup,
		hasParam = false,
		statusFilterArray = $('#status_filter').val(),
		period_filter = $('#period').val();

	// Add parameters
	if (tz) {
		url += (hasParam ? '&' : '?') + "tz=" + encodeURIComponent(tz);
		hasParam = true;
	}
	if(statusFilterArray) {
		url += (hasParam ? '&' : '?') + 'inc_status=' + statusFilterArray.join(',');
		hasParam = true;
	}
	if(period_filter) {
		url += (hasParam ? '&' : '?') + 'period=' + period_filter;
		hasParam = true;
	}

	downloadFile(url);
}

/*
 * Check to see if the status of the task means it should be included
 */
function includeByStatus(statusFilter, task, excludeZeroOrigin) {

	var include = statusFilter.indexOf(task.properties.status) >= 0;
	if(!include) {
		// check for late
		if(task.properties.status === 'accepted' && isLate(task.properties.to) && statusFilter.indexOf("late") >= 0) {
			include = true;
		}
	}
	if(include && excludeZeroOrigin) {
		// Remove points with 0,0 coordinates
		include = false;
		if(task.geometry) {
			include = true;
			if(task.geometry.type === "Point" && task.geometry.coordinates[0] == 0 && task.geometry.coordinates[1] == 0) {
				include = false;
			}
		}
	}

	return include;
}

/*
 * Return true if this question stores its data in a text type column
 */
function isTextStorageType(type) {
	return type === "string" || type === "select1" || type === "barcode" || type === "calculate"
		|| type === "conversation"
		|| type === "child_form" || type === "parent_form";
}

/*
 * Get surveys in the same bundle
 */
function getGroupSurveys(surveyId, callback, surveyVal) {

	var url = "/surveyKPI/surveyResults/" + surveyId + "/groups",
		survey = surveyId;

	if(surveyId) {

		if(gTasks.cache.groupSurveys[surveyId]) {
			if(typeof callback === 'function') {
				callback(gTasks.cache.groupSurveys[surveyId], surveyVal);
			}
		} else {
			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();
					if(handleLogout(data)) {
						gTasks.cache.groupSurveys[surveyId] = data;
						if (typeof callback === 'function') {
							callback(data, surveyVal);
						}
					}
				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if(handleLogout(xhr.responseText)) {
						if (xhr.readyState == 0 || xhr.status == 0) {
							return;  // Not an error
						} else {
							console.log(localise.set["c_error"] + ": " + err);
						}
					}
				}
			});
		}
	}
}

/*
 * Update a selector that is used for any data survey in a group that is not an oversight form
 */
function setGroupSelector(data, surveyVal) {
	var $elemGroups = $('#survey_case, #tp_form_name, #not_form_name');

	var i,
		item,
		h = [],
		idx = -1;

	for (i = 0; i < data.length; i++) {
		item = data[i];

		if (item.dataSurvey) {
			h[++idx] = '<option value="';
			h[++idx] = item.surveyIdent;
			h[++idx] = '">';
			h[++idx] = htmlEncode(item.surveyName);
			h[++idx] = '</option>';

			if(!surveyVal) {
				surveyVal = item.surveyIdent;
			}
		}
	}

	$elemGroups.empty().html(h.join(''));
	if(surveyVal) {
		$elemGroups.val(surveyVal).change();
	}

}

function showOversightSurveys(data) {
	var i,
		item,
		h = [],
		idx = -1,
		surveyId = $('#survey').val(),
		count = 0;

	$('#oversight_survey').empty();

	for (i = 0; i < data.length; i++) {
		item = data[i];

		if (item.oversightSurvey && item.sId != surveyId) {
			h[++idx] = '<option value="';
			h[++idx] = item.surveyIdent;
			h[++idx] = '">';
			h[++idx] = htmlEncode(item.surveyName);
			h[++idx] = '</option>';

			if(count == 0) {
				if(gSelectedOversightSurvey) {
					getOversightQuestionList(gSelectedOversightSurvey, showOversightQuestions);
				} else {
					getOversightQuestionList(item.surveyIdent, showOversightQuestions);
				}
			}
			count++;
		}
	}

	if(count == 0) {
		$('.update_options_msg').html(localise.set["n_no_oversight"]);
		$('.update_options_msg').show();
	} else {
		$('.update_options_msg').hide();
	}
	$('#oversight_survey').empty().html(h.join(''));
	if(gSelectedOversightSurvey) {
		$('#oversight_survey').val(gSelectedOversightSurvey);
	}
}

//Function to get the question list
function getOversightQuestionList(sIdent, callback) {

	var url = "/surveyKPI/questionListIdent/" + sIdent + "/none?exc_read_only=false&inc_meta=false";

	if(window.oversightQuestions[sIdent]) {
		callback(window.oversightQuestions[sIdent]);
	} else {
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					window.oversightQuestions[sIdent] = data;
					callback(data);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert("Error: Failed to get list of questions: " + err);
					}
				}
			}
		});
	}

}

function showOversightQuestions(data) {
	var i,
		item,
		h = [],
		idx = -1;

	for (i = 0; i < data.length; i++) {
		item = data[i];

		h[++idx] = '<option value="';
		h[++idx] = item.name;
		h[++idx] = '">';
		h[++idx] = htmlEncode(item.name);
		h[++idx] = '</option>';

	}

	$('#update_question').empty().html(h.join(''));
	if(gSelectedOversightQuestion) {
		$('#update_question').val(gSelectedOversightQuestion);
	}
}

/*
 * Convert system names for meta data into human names
 */
function translateKey(key) {
	if(key === "_device") {
		key = localise.set["c_device"];  //"Device";
	} else if (key === "_user") {
		key = localise.set["c_user"];  // "Submitted By";
	} else if (key === "_start") {
		key = localise.set["_start"] + " (" + localise.set["c_lt"] +")"; // "Start Survey";
	} else if (key === "_end") {
		key = key = localise.set["_end"] + " (" + localise.set["c_lt"] +")";  // "End Survey";
	} else if (key === "Upload Time") {
		key = key = localise.set[key] + " (" + localise.set["c_lt"] +")";
	} else if (key === "_scheduled_start") {
		key = key = localise.set[key] + " (" + localise.set["c_lt"] +")";
	} else if (key === "_bad") {
		key = localise.set["a_mb"];         // "Marked Bad";
	} else if (key === "_bad_reason") {
		key = localise.set["c_reason"];     // "Reason";
	} else if (key === "_complete") {
		key = localise.set["c_complete"];	// "Complete";
	}

	return key;
}

/*
 * Convert system names for meta values into human values
 */
function translateKeyValue(key, value) {

	if (key === "_bad") {
		if(value === "t") {
			value = localise.set["c_yes"];   // "Yes";
		} else {
			value = localise.set["c_no"];   // "No";
		}
	} else if (key === "_complete") {
		value = (value === "t") ? localise.set["c_yes"] : localise.set["c_no"];
	}

	return value;

}

function addCacheBuster(url) {
	var cb;
	if(url.indexOf("?") >= 0) {
		cb = "&";
	} else {
		cb = "?";
	}
	return cb + "_v=" + new Date().getTime().toString();
}

function getAppearanceParams(appearance) {

	var response = {};

	var idx1 = appearance.indexOf('(');
	var idx2 = appearance.lastIndexOf(')');
	var params = appearance.substring(idx1 + 1, idx2);
	var paramsArray = [];
	if(params) {
		paramsArray = params.split(',');
	}

	response.length = paramsArray.length;
	if(paramsArray.length > 0) {

		// 1. First parameter is the filename
		var filename = paramsArray[0].trim();
		response.filename = filename.replace(/'/g, "");

		response.filter = '';    // default
		if(paramsArray.length > 1) {
			// Second parameter is the filter
			response.filter = paramsArray[1].trim();
			response.filter = response.filter.replace(/'/g, "");
		}

		if(response.filter === 'eval') {
			if (paramsArray.length > 2) {
				// Third parameter for an evaluation type function is the expression
				// For an expression type filter only remove the first and last single quote if they exist
				response.expression = paramsArray[2].trim();
				if(response.expression.charAt(0) == '\'') {
					response.expression = response.expression.substring(1);
				}
				if(response.expression.charAt(response.expression.length - 1) == '\'') {
					response.expression = response.expression.substring(0, response.expression.length - 1);
				}
			}
		} else {

			if (paramsArray.length > 2) {
				// Third parameter is the filter column
				response.filter_column = paramsArray[2].trim();
				response.filter_column = response.filter_column.replace(/'/g, "");
			}

			if (paramsArray.length > 3) {
				// Fourth parameter is the filter value
				response.filter_value = paramsArray[3].trim();
				response.filter_value = response.filter_value.replace(/'/g, "");
			}

			if (paramsArray.length > 4) {
				// Fifth parameter is the second filter column
				response.second_filter_column = paramsArray[4].trim();
				response.second_filter_column = response.second_filter_column.replace(/'/g, "");
			}


			if (paramsArray.length > 5) {
				// Sixth parameter is the filter value
				response.second_filter_value = paramsArray[5].trim();
				response.second_filter_value = response.second_filter_value.replace(/'/g, "");
			}
		}

	}
	return response;
}

function getQuestionType(schema, qname) {
	var i;
	for(i = 0; i < schema.columns.length; i++) {
		if(schema.columns[i].question_name == qname) {
			return schema.columns[i].type;
		}
	}
}

function getTrailData(projectId, userId, startDate, endDate, callback, tz, mps) {

	var url = '/surveyKPI/usertrail/trail' +
		'?userId=' + userId +
		'&startDate=' + startDate +
		'&endDate=' + endDate +
		'&mps=' + (mps || 0) +
		(tz ? "&tz=" + tz : "");

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				callback(data);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get user trail: " + err);
				}
			}
		}
	});
}

/*
 * Reports
 */
function executeUsageReport(oId) {

	var usageMsec = $('#usageDate').data("DateTimePicker").date(),
		d = new Date(usageMsec),
		month = d.getMonth() + 1,
		year = d.getFullYear(),
		incTemp = $('#usage_inc_temp').prop('checked'),
		incAllTime = $('#usage_inc_alltime').prop('checked'),
		byProject = $('#usage_by_project').prop('checked'),
		bySurvey = $('#usage_by_survey').prop('checked'),
		byDevice = $('#usage_by_device').prop('checked'),
		i;

	var reportName = localise.set["u_usage"] + "_";

	// Add the organisation name
	if(oId > 0 && globals.gLoggedInUser.orgs.length > 0) {
		for(i = 0; i < globals.gLoggedInUser.orgs.length; i++) {
			if(globals.gLoggedInUser.orgs[i].id == oId) {
				reportName += globals.gLoggedInUser.orgs[i].name + "_";
				break;
			}
		}
	}

	if(byProject) {
		reportName += localise.set["c_project"];
	} else if(bySurvey) {
		reportName += localise.set["c_survey"];
	} else if(byDevice) {
		reportName += localise.set["c_device"];
	} else {
		reportName += localise.set["c_user"];
	}
	reportName += "_" + year + "_" + month;
	reportName = reportName.replaceAll(' ', '_');

	var reportObj = {
		report_type: 'u_usage',
		report_name: reportName,
		pId: 0,
		params: {
			oId: oId,
			byProject: byProject,
			bySurvey: bySurvey,
			byDevice: byDevice,
			month: month,
			year: year,
			incTemp: incTemp,
			incAllTime: incAllTime
		}
	}

	var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";

	addHourglass();
	$.ajax({
		type: "POST",
		cache: false,
		dataType: 'text',
		contentType: "application/x-www-form-urlencoded",
		url: "/surveyKPI/background_report" + tzString,
		data: { report: JSON.stringify(reportObj) },
		success: function(data, status) {
			if(handleLogout(data)) {
				removeHourglass();
				alert(localise.set["msg_ds_s_r"]);
			}
		}, error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_save"] + xhr.responseText);	// alerts htmlencode
				}
			}
		}
	});

}

function executeSurveyReport(oId) {

	var i;

	var reportName = localise.set["c_survey"];

	// Add the organisation name
	if(oId > 0 && globals.gLoggedInUser.orgs.length > 0) {
		for(i = 0; i < globals.gLoggedInUser.orgs.length; i++) {
			if(globals.gLoggedInUser.orgs[i].id == oId) {
				reportName += globals.gLoggedInUser.orgs[i].name + "_";
				break;
			}
		}
	}

	var reportObj = {
		report_type: 'survey',
		report_name: reportName,
		params: {
			oId: oId
		}
	}

	var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";

	addHourglass();
	$.ajax({
		type: "POST",
		cache: false,
		dataType: 'text',
		contentType: "application/x-www-form-urlencoded",
		url: "/surveyKPI/background_report" + tzString,
		data: { report: JSON.stringify(reportObj) },
		success: function(data, status) {
			if(handleLogout(data)) {
				removeHourglass();
				alert(localise.set["msg_ds_s_r"]);
			}
		}, error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_save"] + xhr.responseText);	// alerts htmlencode
				}
			}
		}
	});

}
function executeAttendanceReport(oId) {

	var attendanceMsec = $('#attendanceDate').data("DateTimePicker").date(),
		d = new Date(attendanceMsec),
		day = d.getDate(),
		month = d.getMonth() + 1,
		year = d.getFullYear(),
		i;

	var reportName = localise.set["u_attendance"] + "_";

	// Add the organisation name
	if(oId > 0 && globals.gLoggedInUser.orgs.length > 0) {
		for(i = 0; i < globals.gLoggedInUser.orgs.length; i++) {
			if(globals.gLoggedInUser.orgs[i].id == oId) {
				reportName += globals.gLoggedInUser.orgs[i].name + "_";
				break;
			}
		}
	}

	reportName += "_" + year + "_" + month + "_" + day;
	reportName = reportName.replaceAll(' ', '_');

	var reportObj = {
		report_type: 'u_attendance',
		report_name: reportName,
		pId: 0,
		params: {
			oId: oId,
			month: month,
			year: year,
			day: day
		}
	}

	var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";

	addHourglass();
	$.ajax({
		type: "POST",
		cache: false,
		dataType: 'text',
		contentType: "application/x-www-form-urlencoded",
		url: "/surveyKPI/background_report" + tzString,
		data: { report: JSON.stringify(reportObj) },
		success: function(data, status) {
			removeHourglass();
			if(handleLogout(data)) {
				alert(localise.set["msg_ds_s_r"]);
			}
		}, error: function(xhr, textStatus, err) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_save"] + " " + xhr.responseText);  // alerts htmlencode
				}
			}
		}
	});

}

/*
 * Decode escaped HTML
 * From https://stackoverflow.com/questions/1912501/unescape-html-entities-in-javascript
 */
function htmlDecode(input) {
	var doc = new DOMParser().parseFromString(input, "text/html");
	return doc.documentElement.textContent;
}

function htmlEncode(input) {
	if(input) {
		return $('<div>').text(input).html();
	}
}

/*
 * Get the list of users from the server
 */
function getEligibleUsers(sIdent, isNotification) {

	if(window.gTasks && window.gTasks.cache.eligibleUsers[sIdent]) {
		fillUsersList(isNotification, window.gTasks && window.gTasks.cache.eligibleUsers[sIdent]);
	} else if(sIdent) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/userList/survey/" + sIdent,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				if(handleLogout(data)) {
					window.gTasks.cache.eligibleUsers[sIdent] = data;
					fillUsersList(isNotification, data);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if(handleLogout(xhr.responseText)) {
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else if (err == 403) {
						return;  // Ignore errors where the survey cannot be found. The survey requested may be the global default current survey which may be out of date
					} else {
						alert(localise.set["error"] + ": " + err);
					}
				}
			}
		});
	}
}

/*
 * Fill a list with the users who can be selected
 */
function fillUsersList(isNotification, data) {
	var h = [],
		idx = -1,
		$elem = $('#user_to_assign');

	$elem.empty();

	h[++idx] = '<option value="_none">';
	h[++idx] = localise.set["c_none"];
	h[++idx] = '</option>';

	if (isNotification) {
		h[++idx] = '<option value="_submitter">';
		h[++idx] = localise.set["c_submitter"];
		h[++idx] = '</option>';

		h[++idx] = '<option value="_data">';
		h[++idx] = localise.set["t_ad"];
		h[++idx] = '</option>';
	}

	if (data && data.length > 0) {
		for (i = 0; i < data.length; i++) {
			h[++idx] = '<option value="';
			h[++idx] = data[i].ident;
			h[++idx] = '">';
			h[++idx] = htmlEncode(data[i].name);
			h[++idx] = '</option>';
		}
	}
	$elem.html(h.join(''));

	if (typeof gEligibleUser !== 'undefined') {
		$elem.val(gEligibleUser);
	}
}

/*
 * Return true if the passed in value is accepted by xlsFormConverter
 */
function isValidODKQuestionName(val) {

	var sqlCheck = /^[A-Za-z_][A-Za-z0-9_\-\.]*$/;
	return sqlCheck.test(val);
}

function isValidODKOptionName(val) {

	var sqlCheck = /^[A-Za-z0-9_@&\-\.\+\(\),%:\/ ]*$/;
	return sqlCheck.test(val);
}

/*
 * Check item names such as; a username or an organisation name for invalid characters
 */
function validGeneralName(val) {

	if(val.indexOf('<') >= 0 || val.indexOf('>') >= 0) {
		return false;
	}
	return true;
}

/*
 * Get the names of referenced questions in the passed in string
 */
function getReferenceNames(elem, refQuestions) {
	var names = [],
		reg = /\$\{[A-Za-z_][A-Za-z0-9_\-\.]*\}/g,
		i,
		name;

	if (elem) {
		names = elem.match(reg);
		if(names) {
			for(i = 0; i < names.length; i++) {
				if(names[i].length > 3) {
					name = names[i].substring(2, names[i].length - 1);		// Remove the curly brackets
					refQuestions[name] = {
						name: name,
						exists: false
					};
				}
			}
		}
	}
}

/*
 * Add an exists flag to each question in the references object
 */
function checkExistenceOfReferences(refQuestions, survey) {

	var refCount = 0,
		i = 0,
		j = 0,
		name,
		form;

	for (name in refQuestions) {
		if (refQuestions.hasOwnProperty(name)) {
			refCount++;
		}
	}

	if(refCount > 0) {

		for (i = 0; i < survey.forms.length; i++) {
			form = survey.forms[i];
			for (j = 0; j < form.questions.length; j++) {
				var otherItem = form.questions[j];
				var questionType = otherItem.type;
				if (!otherItem.deleted && !otherItem.soft_deleted && questionType !== "end group") {
					otherItem = form.questions[j];

					for (name in refQuestions) {
						if (refQuestions.hasOwnProperty(name)) {
							if (name === otherItem.name) {
								refQuestions[name].exists = true;
								break;
							}
						}
					}
				}
			}
		}

		// Check against preloads
		console.log("check against preloads");
		if (survey.meta) {
			for (i = 0; i < survey.meta.length; i++) {
				for (name in refQuestions) {
					if (name === survey.meta[i].name) {
						refQuestions[name].exists = true;
					}
				}
			}
		}
	}
	return refCount;
}

function checkLoggedIn(callback) {
	$.ajax({
		cache: false,
		url: "/authenticate/login.txt",
		success: function (data) {
			if(handleLogout(data)) {
				callback();
			}

		}, error: function (data, status) {
			if(handleLogout(data.responseText)) {
				alert(data);
			}
		}
	});
}

/*
 * Respond to a logged out redirect
 */
function handleLogout(data) {
	if(data) {
		if(    (data.code && data.code === 401)
			|| (data.status && data.status === 405)
			|| (data.status && data.status === 413)
			|| (typeof data === "string" && data.indexOf('"code": 401') >= 0)
			|| (typeof data === "string" && data.indexOf('Error: 401') >= 0)
			|| (typeof data === "string" && data.indexOf('Status 401 – Unauthorized') >= 0)
			|| (typeof data === "string" && data.indexOf('notloggedin.json') >= 0)
			|| (typeof data === "string" && data.toLowerCase().indexOf("method not allowed") >= 0)) {
				window.open("/login.html");
				return false;
		}

	} else if(data && (typeof data === "string" && data.indexOf('multilogon') >= 0)) {
		alert("Logon on another device detected - logging out");
		window.open("/dologout.html");
		return false;
	}
	return true;
}

/*
 * Load the sms numbers from the server
 */
function getOurNumbers() {

	var url="/surveyKPI/smsnumbers?org=true";
	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				gNumbers = data;
				setOurNumbersList();
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

function setOurNumbersList() {
	var i = 0;
	if(gNumbers && gNumbers.length > 0) {
		var $elem = $('#msg_our_nbr');
		var channel = $('#msg_channel').val();
		$elem.empty();
		for(i = 0; i < gNumbers.length; i++) {
			var n = gNumbers[i];
			if(n.channel === channel) {
				$elem.append(`<option value="${n.ourNumber}">${n.ourNumber} - ${n.channel} </option>`);
			}
		}
	}
}


/***/ },

/***/ "../smapServer/WebContent/js/app/globals.js"
/*!**************************************************!*\
  !*** ../smapServer/WebContent/js/app/globals.js ***!
  \**************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
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
 * Quick solution to issue of legacy globals after migrating to AMD / require.js
 */
(function () {
    var globals;

    globals = window.globals = {

        // Security groups
        GROUP_ADMIN: 1,
        GROUP_ANALYST: 2,
        GROUP_ENUM: 3,
        GROUP_ORG_ADMIN : 4,
        GROUP_MANAGE: 5,
        GROUP_SECURITY: 6,
        GROUP_VIEW_DATA: 7,
        GROUP_ENTERPRISE : 8,
        GROUP_OWNER : 9,
		GROUP_VIEW_OWN_DATA : 10,
	    GROUP_MANAGE_TASKS : 11,
	    GROUP_DASHBOARD : 12,
        GROUP_LINKAGES : 13,
        GROUP_CONSOLE_ADMIN : 14,
        GROUP_MCP_ACCESS : 15,

        REC_LIMIT: 200,     // Page size for table views in analysis
	    MAP_REC_LIMIT: 10000,    // Max size for map views in analysis

        gProjectList: undefined,
        gRoleList: undefined,
        gCmSettings: undefined,
        gCurrentProject: 0,
        gCurrentSurvey: 0,
        gCurrentSurveyIdent: undefined,
	    gGroupSurveys: {},
	    gSubForms: {},
        gCurrentForm: 0,
        gCurrentLayer: undefined,
        gLoggedInUser: undefined,
        gEditingReportProject: undefined,   		// Set if fieldAnalysis called to edit a report
        gIsAdministrator: false,
        gIsEnum: false,
        gIsAnalyst: false,
	    gIsDashboard: false,
        gIsManage: false,
        gIsOrgAdministrator: false,
        gIsSecurityAdministrator: false,
        gIsEnterpriseAdministrator: false,
        gIsLinkFollower: false,
        gIsServerOwner: false,
        gIsConsoleAdmin: false,
        gViewData: false,
	    gManageTasks: false,
        gBillingData: false,
        gOrgBillingData: false,
        gSendTrail: 'off',
        gViewIdx: 0,
        gSelector: new Selector(),
        gOrgId: 0,
        gTimezone: undefined,
	    gEnterpriseName: undefined,
	    gSetAsTheme: undefined,
	    gNavbarColor: undefined,

        gRegions: undefined,
        gRegion: {},

        gServerCanSendEmail: false,

        // Reports
        gEmailEnabled: false,
        gFacebookEnabled: false,
        gTwitterEnabled: false,

        // Tasks
        gCurrentUserId: undefined,
        gCurrentUserName: undefined,
        gAssignmentsLayer: undefined,
        gPendingUpdates: [],
        gCurrentTaskGroup: undefined,
	    gCurrentMailout: undefined,
        gTaskList: undefined,
        gCurrentSurveyIndex: 0,
	    gCurrentInstance: undefined,
        gAlertSeen: false,
        gLastAlertTime: undefined,

        // Editor
        gExistingSurvey: false,		// Set true if modifying an existing survey
        gElementIndex: 0,			// Manage creation of unique identifier for each element (question, option) in editor
        gHasItems: false,			// Set true if there are questions or choice lists in the survey
        gNewQuestionButtonIndex: 0,	// Manage creation of unique identifier for buttons that add new questions
        gNewOptionButtonIndex: 0,
        gSId: 0,
        gLanguage: 0,
        gLanguage1: 0,
        gLanguage2: 0,
        errors: [],
        changes: [],
        gErrorPosition: 0,
        gSelProperty: 'label',
        gSelLabel: 'Question Text',
        gSelQuestionProperty: 'label',
        gSelQuestionLabel: 'Question Text',
        gSelChoiceProperty: 'label',
        gSelChoiceLabel: 'Question Text',
        gIsQuestionView: true,
        gShowingChoices: false,
        gMaxOptionList: 0,
        gLatestOptionList: undefined,	// Hack to record the last option list name added
	    gCsvFiles: undefined,

        gListName: undefined,					// Choice Modal parameters, Set if started from choice list view
        gOptionList: undefined,					// The option list name applying to this set of choices
        gSelOptionId: undefined,				// Selected option index
        gFormIndex: undefined,					// Selected form index
        gItemIndex: undefined,					// Selected question index
        gSelectedFilters: undefined,
        gFilterArray: undefined,

        gSaveInProgress: false,

        // Dashboard
        gMainTable: undefined,			// Data tables
        gReports: undefined,			// reports
        gCharts: {},					// charts
	    gRecordMaps: [],                // Maps shown when editing a record
	    gRecordChangeMaps: [],          // Maps shown when viewing change history
        gMapLayersShown: false,
        gViewId: 0,						// Current survey view

	    gTraining: undefined,
	    gRefreshRate: 0,

        gMapboxDefault: undefined,		// Mapbox key
        
        model: new Model()

    }


    function Selector() {

        this.dataItems = new Object();
        this.surveys = new Object();
        this.surveysExtended = new Object();
        this.surveyLanguages = new Object();
        this.surveyQuestions = new Object();
        this.surveyMeta = new Object();
        this.surveyAlerts = new Object();
        this.questions = new Object();
        this.allSurveys;				// Simple list of surveys
        this.allRegions;
        this.sharedMaps;
        this.views = [];			// Simple list of views
        this.maps = {};				// map panels indexed by the panel id
        this.changed = false;
        this.SURVEY_KEY_PREFIX = "surveys";
        this.TASK_KEY = "tasks";
        this.TASK_COLOR = "#dd00aa";
        this.SURVEY_COLOR = "#00aa00";
        this.SELECTED_COLOR = "#0000aa";
        this.currentPanel = "map";

        /*
         * Get Functions
         */
        this.getAll = function () {
            return this.dataItems;
        };

        this.getItem = function (key) {
            return this.dataItems[key];
        };

        // Return all the table data available for a survey
        this.getFormItems = function (sId) {
            var tableItems = new Object();
            for (var key in this.dataItems) {
                var item = this.dataItems[key];
                if (item.table == true && item.sId == sId) {
                    tableItems[key] = item;
                }
            }
            return tableItems;
        };

        this.getSurvey = function (key) {
            return this.surveys[key];
        };

        this.getSurveyExtended = function (key) {
            return this.surveysExtended[key];
        };

        this.getSurveyQuestions = function (sId, language) {
            var langQ = this.surveyQuestions[sId];
            if (langQ) {
                return langQ[language];
            } else {
                return null;
            }
        };

        this.getSurveyMeta = function (key) {
            return this.surveyMeta[key];
        };

        this.getSurveyAlerts = function (key) {
            return this.surveyAlerts[key];
        };

        this.getSurveyLanguages = function (key) {
            return this.surveyLanguages[key];
        };

        // Returns the list of surveys on the home server
        this.getSurveyList = function () {
            return this.allSurveys;
        };

        this.getRegionList = function () {
            return this.allRegions;
        };

        this.getSharedMaps = function () {
            return this.sharedMaps;
        };

        // deprecate question meta should be replaced by all question details in the question list
        this.getQuestion = function (qId, language) {
            var langQ = this.questions[qId];
            if (langQ) {
                return langQ[language];
            } else {
                return null;
            }
        };

        /*
         * Get the question details that came with the question list
         * This approach should replace the concept of "question meta"
         */
        this.getQuestionDetails = function (sId, qId, language) {
            var qList = this.getSurveyQuestions(sId, language),
                i;

            if (qList) {
                for (i = 0; i < qList.length; i++) {
                    if (qList[i].id == qId) {
                        return qList[i];
                    }
                }
            }
            return null;
        };

        this.hasQuestion = function (key) {
            if (this.questions[key] != undefined) {
                return true;
            } else {
                return false;
            }
        };

        // Return the list of current views
        this.getViews = function () {
            return this.views;
        };

        // Return a map if it exists
        this.getMap = function (key) {
            return this.maps[key];
        };


        /*
         * Set Functions
         */
        this.addDataItem = function (key, value) {
            this.dataItems[key] = value;
            this.changed = true;
        };

        this.clearDataItems = function () {
            this.dataItems = new Object();
        };

        this.clearSurveys = function () {
            this.surveys = new Object();
            this.surveyLanguages = new Object();
            this.surveyQuestions = new Object();
            this.surveyMeta = new Object();
            this.surveyAlerts = new Object();
            this.questions = new Object();
            this.allSurveys = undefined;
            this.allRegions = undefined;
        };

        this.setSurveyList = function (list) {
            this.allSurveys = list;
            if (typeof list[0] !== "undefined") {
                this.selectedSurvey = list[0].sId;
            }
        };

        this.setSurveyLanguages = function (key, value) {
            this.surveyLanguages[key] = value;
        };

        this.setSurveyQuestions = function (sId, language, value) {
            var langQ = new Object();
            langQ[language] = value;
            this.surveyQuestions[sId] = langQ;
        };

        this.setSurveyMeta = function (key, value) {
            this.surveyMeta[key] = value;
        };

        this.setSurveyAlerts = function (key, value) {
            this.surveyAlerts[key] = value;
        };

        this.setRegionList = function (list) {
            this.allRegions = list;
        };

        this.setSharedMaps = function (list) {
            this.sharedMaps = list;
        };

        this.addSurvey = function (key, value) {
            this.surveys[key] = value;
        };

        this.addSurveyExtended = function (key, value) {
            this.surveysExtended[key] = value;
        };

        this.setSelectedSurvey = function (survey) {
            this.selectedSurvey = survey;
        };

        this.setSelectedQuestion = function (id) {
            this.selectedQuestion = id;
        };

        this.addQuestion = function (qId, language, value) {
            var langQ = this.questions[qId];
            if (!langQ) {
                this.questions[qId] = new Object();
                langQ = this.questions[qId];
            }
            langQ[language] = value;
        };

        // Set the list of views to the passed in array
        this.setViews = function (list) {
            this.views = list;
        };

        // Set the passed in map into the maps object indexed by key
        this.setMap = function (key, value) {
            this.maps[key] = value;
        };

    }

    /*
     * Model for Survey editing
     */
    function Model() {

        this.survey = undefined;
        this.translateChanges = [];
        this.currentTranslateChange = 0;
        this.savedSettings = undefined;
        this.forceSettingsChange = false;

	    // A list of valid appearances for each question type
	    this.qAppearances = {
		    'begin group': ['page', 'w', 'no-collapse'],
            'begin repeat': ['extendable', 'no-collapse'],
		    string: ['numbers', 'thousands-sep', 'w', 'url'],
		    note: ['w'],
            select1: ['select1_type', 'search', 'likert', 'no-buttons', 'w'],
            select: ['select_type', 'search', 'no-buttons', 'w'],
            image: ['image_type', 'selfie', 'new', 'w'],
            int:['thousands-sep', 'w'],
		    geopoint:['placement-map', 'w'],
		    audio:['w', 'new'],
		    video:['selfie', 'w', 'new'],
		    barcode:['read_nfc', 'w'],
		    date:['date_type', 'w'],
		    dateTime:['date_type', 'no-calendar', 'w'],
		    time:['w'],
            decimal:['thousands-sep', 'bearing', 'w'],
		    geotrace:['placement-map', 'w'],
		    geoshape:['placement-map', 'w'],
		    acknowledge:['w'],
		    range:['w', 'rating', 'vertical', 'picker'],
		    file:['w'],
		    rank:['w'],
            geocompound:['w', 'placement-map']
	    };

	    this.appearanceDetails = {
		    'page': {
			    field: 'a_page',
			    type: 'select',
                rex: 'field-list|table-list',
                valIsAppearance: true,
			    value_offset: 0,
                undef_value: ''
		    },
		    'image_type': {
			    field: 'a_image_type',
			    type: 'select',
			    rex: 'annotate|draw|signature',
			    valIsAppearance: true,
			    value_offset: 0,
			    undef_value: ''
		    },
		    'select1_type': {
			    field: 'a_select1_type',
			    type: 'form',
			    rex: 'minimal|quick$|autocomplete|columns|quickcompact|image-map|compact'
		    },
		    'select_type': {
			    field: 'a_select_type',
			    type: 'form',
			    rex: 'minimal|autocomplete|columns|image-map|compact|autocomplete-minimal'
		    },
		    'date_type': {
			    field: 'a_date_type',
			    type: 'select',
			    rex: 'no-calendar|month-year|year|coptic|ethiopian|islamic|myanmar|persian|bikram-sambat',
			    valIsAppearance: true,
			    value_offset: 0,
			    undef_value: ''
		    },
		    'no-calendar': {
			    field: 'a_no_calendar',
			    type: 'boolean',
			    rex: 'no-calendar'
		    },
		    'placement-map': {
			    field: 'a_placement-map',
			    type: 'boolean',
			    rex: 'placement-map'
		    },
		    'search': {
			    field: 'a_search',
			    type: 'form',
			    rex: 'search\\(|lookup_choices\\('
		    },
		    'rating': {
			    field: 'a_rating',
			    type: 'boolean',
			    rex: 'rating'
		    },
		    'likert': {
			    field: 'a_likert',
			    type: 'boolean',
			    rex: 'likert'
		    },
		    'no-buttons': {
			    field: 'a_no_buttons',
			    type: 'boolean',
			    rex: 'no-buttons'
		    },
		    'selfie': {
			    field: 'a_selfie',
			    type: 'boolean',
			    rex: 'selfie'
		    },
		    'new': {
			    field: 'a_new',
			    type: 'boolean',
			    rex: 'new'
		    },
		    'read_nfc': {
			    field: 'a_read_nfc',
			    type: 'boolean',
			    rex: 'read_nfc'
		    },
		    'vertical': {
			    field: 'a_vertical',
			    type: 'boolean',
			    rex: 'vertical'
		    },
		    'picker': {
			    field: 'a_picker',
			    type: 'boolean',
			    rex: 'picker'
		    },
		    'bearing': {
			    field: 'a_bearing',
			    type: 'boolean',
			    rex: 'bearing'
		    },
            'thousands-sep': {
                field: 'a_sep',
                type: 'boolean',
                rex: 'thousands-sep'
            },
		    'no-collapse': {
			    field: 'a_no_collapse',
			    type: 'boolean',
			    rex: 'no-collapse',
                value_offset: 0
		    },
            'extendable': {
                field: 'a_extendable',
                type: 'boolean',
                rex: 'extendable'
            },
		    'numbers': {
			    field: 'a_numbers',
			    type: 'boolean',
			    rex: 'numbers'
		    },
		    'url': {
			    field: 'a_url',
			    type: 'boolean',
			    rex: 'url'
		    },
		    'w': {
			    field: 'a_width',
			    type: 'select',
                rex: 'w10|w[1-9]',
                value_offset: 1,
                undef_value: ''
		    }
	    };

        // A list of valid parameters for each question type
        this.qParams = {
            string: ['rows', 'auto_annotate', 'source', 'from_lang', 'to_lang', 'medical', 'med_type'],
	        calculate: ['auto_annotate', 'source', 'from_lang', 'to_lang', 'medical', 'med_type'],
	        barcode: ['auto'],
            image: ['max-pixels', 'auto'],
	        video: ['auto'],
	        audio: ['auto', 'quality'],
            range: ['start', 'end', 'step'],
            select: ['randomize'],
            select1: ['randomize'],
            rank: ['randomize'],
            parent_form: ['form_identifier', 'key_question', 'auto'],
	        child_form: ['form_identifier', 'key_question', 'auto'],
	        geopoint: ['auto'],
            geotrace: ['geotextlength'],
            geoshape: ['geotextlength'],
            geocompound: ['geotextlength'],
            'begin repeat':['ref', 'instance_order', 'instance_count', 'key_policy'],
	        chart: ['chart_type', 'stacked', 'normalized']
        };

        this.paramDetails = {
	        rows: {
	            field: 'p_rows',
                type: 'integer'
            },
            geotextlength: {
                field: 'p_geotextlength',
                type: 'integer'
            },
            'max-pixels': {
	            field: 'p_max_pixels',
                type: 'integer'
            },
            start: {
	            field: 'p_start',
                type: 'number'
            },
	        end: {
		        field: 'p_end',
		        type: 'number'
	        },
	        step: {
		        field: 'p_step',
		        type: 'number'
	        },
	        randomize: {
		        field: 'p_randomize',
		        type: 'boolean'
	        },
	        auto: {
		        field: 'p_auto',
		        type: 'boolean'
	        },
	        quality: {
		        field: 'p_quality',
		        type: 'select'
	        },
	        auto_annotate: {
		        field: 'p_auto_annotate',
		        type: 'boolean'
	        },
	        medical: {
		        field: 'p_medical',
		        type: 'boolean'
	        },
	        med_type: {
		        field: 'p_med_type',
		        type: 'select'
	        },
	        source: {
		        field: 'p_source',
		        type: 'select'
	        },
	        from_lang: {
		        field: 'from_lang',
		        type: 'select'
	        },
	        to_lang: {
		        field: 'to_lang',
		        type: 'select'
	        },
	        form_identifier: {
		        field: 'p_form_identifier',
		        type: 'select'
	        },
	        key_question: {
		        field: 'p_key_question',
                type: 'select'
            },
	        ref: {
		        field: 'p_ref',
		        type: 'select'
	        },
	        instance_order: {
		        field: 'p_instance_order',
		        type: 'select'
	        },
	        instance_count: {
		        field: 'p_instance_count',
		        type: 'integer'
	        },
	        key_policy: {
		        field: 'p_key_policy',
		        type: 'select'
	        },
	        chart_type: {
		        field: 'p_chart_type',
		        type: 'select'
	        },
	        stacked: {
		        field: 'p_stacked',
		        type: 'boolean'
	        },
	        normalized: {
		        field: 'p_normalized',
		        type: 'boolean'
	        },
	        _other: {
		        field: 'p_other',
		        type: 'text'
	        }
        };

        this.qTypes = [{
	            name: "Text",
	            trans: "rev_text",
	            type: "string",
	            icon: "font",
	            canSelect: true,
	            visible: true,
		        source: "user",
		        compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Note",
                type: "note",
                trans: "c_note",
                icon: "pencil-alt",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Select One",
                type: "select1",
                trans: "ed_s1",
                image: "/images/select1_64.png",
                canSelect: true,
                visible: true,
				source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Select Multiple",
                type: "select",
                trans: "ed_s",
                image: "/images/select_64.png",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Form",
                type: "begin repeat",
                trans: "c_rep_type",
                icon: "redo-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Group",
                type: "begin group",
                trans: "sr_g",
                icon: "folder-open",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Image",
                type: "image",
                trans: "ed_image",
                icon: "camera",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Integer",
                type: "int",
                trans: "ed_int",
                text: "#",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["pdf_field"]
            },
            {
                name: "Phone Number",
                type: "phone",
                trans: "c_phone",
                icon: "phone",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation"]
            },
            {
                name: "Conversation",
                type: "conversation",
                trans: "ed_mat_c",
                icon: "sms",
                canSelect: true,
                visible: true,
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "phone"]
            },
            {
                name: "GPS Point",
                type: "geopoint",
                trans: "ed_gps",
                icon: "map-marker-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Calculation",
                type: "calculate",
                trans: "ed_calc",
                calculation: true,
                image: "/images/calc_64.png",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Audio",
                type: "audio",
                trans: "ed_audio",
                icon: "volume-up",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Video",
                type: "video",
                trans: "ed_video",
                icon: "video",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Barcode",
                type: "barcode",
                trans: "ed_bc",
                icon: "barcode",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Date",
                type: "date",
                trans: "c_date",
                icon: "calendar-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Date and Time",
                type: "dateTime",
                trans: "ed_dt",
                icon: "calendar-alt, clock",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Time",
                type: "time",
                trans: "ed_t",
                icon: "clock",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Decimal",
                type: "decimal",
                trans: "ed_dec",
                text: "#.#",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "GPS Line",
                type: "geotrace",
                trans: "ed_gps_line",
                image: "/images/linestring_64.png",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "GPS Area",
                type: "geoshape",
                trans: "ed_gps_area",
                image: "/images/polygon_64.png",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Acknowledge",
                type: "acknowledge",
                trans: "ed_ack",
                text: "OK",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Range",
                type: "range",
                trans: "ed_range",
                icon: "arrows-alt-h",
                text: "Range",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Chart",
                type: "chart",
                trans: "c_chart",
                icon: "chart-bar",
                text: "Chart",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
	        {
		        name: "Parent Form",
		        type: "parent_form",
		        trans: "c_parent_form",
		        icon: "file-upload",
		        text: "Parent Form",
		        canSelect: true,
		        visible: true,
		        source: "user"
	        },
	        {
		        name: "Child Form",
		        type: "child_form",
		        trans: "c_child_form",
		        icon: "file-download",
		        text: "Child Form",
		        canSelect: true,
		        visible: true,
		        source: "user"
	        },
            {
                name: "File",
                type: "file",
                trans: "c_file",
                icon: "file",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Rank",
                type: "rank",
                trans: "c_rank",
                icon: "sort-amount-down-alt",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
	        {
		        name: "Server Calculation",
		        type: "server_calculate",
		        trans: "ed_s_calc",
		        calculation: true,
		        image: "/images/server_calc_64.png",
		        canSelect: true,
		        visible: true,
		        source: "user",
		        compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
	        },
            {
                name: "Compound Pdf Image",
                type: "pdf_field",
                trans: "ed_ci",
                calculation: false,
                icon: "pallet",
                canSelect: true,
                visible: false,
            },
            {
                name: "Compound map",
                type: "geocompound",
                trans: "ed_cm",
                calculation: false,
                icon: "map-pin",
                canSelect: true,
                visible: false,
                compatTypes: ["geotrace"]
            },
            {
                name: "Unknown Type",
                icon: "ellipses-h",
                canSelect: false
            }
        ];

        // Set the survey model
        this.setSurveyData = function (data) {
            this.survey = data;
            this.survey.forms_orig = $.extend(true, {}, data.forms);
            this.survey.optionLists_orig = $.extend(true, {}, data.optionLists);
        }

        // Save the settings for the survey
        this.save_settings = function () {

            var settings = JSON.stringify(this.getSettings(true));

            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                data: { settings: settings },
                url: "/surveyKPI/surveys/save_settings/" + globals.gCurrentSurvey,
                success: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        globals.model.savedSettings = settings;
                        globals.model.survey.pdfTemplateName = data;
                        globals.model.forceSettingsChange = false;
                        $('#save_settings').prop("disabled", true);

                        $('.formName').text(globals.model.survey.displayName);
                        $('#m_media').prop('href', '/app/resources.html?survey=true&survey_name=' + globals.model.survey.displayName);

                        $('#settingsModal').modal("hide");
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            bootbox.alert("Error saving settings. " + htmlEncode(xhr.responseText));
                        }
                    }
                }
            });

        };

        // Modify a label for a question or an option called from translate where multiple questions can be modified at once if the text is the same
        this.modLabel = function (language, changedQ, newVal, element, prop) {

            var labelMod = {
                changeType: prop,
                action: "update",
                items: []
            }

            var i,
                label = {},
                item,
                item_orig,
                qname,
                translation;


            for (i = 0; i < changedQ.length; i++) {
                translation = {
                    changeType: prop,
                    action: "update",
                    source: "editor"

                };

                // For questions
                if (typeof changedQ[i].form !== "undefined") {

                    label.formIndex = changedQ[i].form;
                    label.itemIndex = changedQ[i].question;
                    item = this.survey.forms[label.formIndex].questions[label.itemIndex];
                    item_orig = this.survey.forms_orig[label.formIndex].questions[label.itemIndex];

                    label.type = "question";
                    label.name = item.name;
                    label.prop = "label";
                    label.qId = item.id;

	                if(changedQ[i].constraint_msg) {
		                label.propType = "constraint_msg";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].required_msg) {
		                label.propType = "required_msg";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].guidance_hint) {
		                label.propType = "guidance_hint";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].hint) {
		                label.propType = "hint";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else {
		                label.propType = "text";
		                label.oldVal = item_orig.labels[language][element];
	                }

                } else {
	                // For options
                    label.optionList = changedQ[i].optionList;
                    label.optionIdx = changedQ[i].option;

                    item = this.survey.optionLists[label.optionList].options[label.optionIdx];
                    item_orig = this.survey.optionLists_orig[label.optionList].options[label.optionIdx];

                    label.type = "option";
                    label.name = item.value;
	                label.propType = "text";
	                label.oldVal = item_orig.labels[language][element];
                }

                label.newVal = newVal;

                label.element = element;
                label.languageName = language;
                label.allLanguages = false;

                label.languageName = this.survey.languages[language].name;			// For logging the event
                var form = this.survey.forms[label.formIdx];

                if (item.text_id) {
                    label.key = item.text_id;
                } else {
                    // Create reference for this new Label
                    if (typeof changedQ[i].form !== "undefined") {
                        label.key = "/" + form.name + "/" + item.name + ":label";	// TODO hint
                    } else {
                        label.key = "/" + form.name + "/" + qname + "/" + item.name + ":label";
                    }
                }

                translation.property = label;

                labelMod.items.push(translation);
            }

            this.removeDuplicateTranslateChange(this.translateChanges, labelMod);
            if (labelMod.items[0].property.newVal !== labelMod.items[0].property.oldVal) {		// Add if the value has changed
                this.currentTranslateChange = this.translateChanges.push(labelMod) - 1;
                //this.doChange();				// Apply the current change
            }

            $('.m_save_survey').find('.badge').html(this.translateChanges.length);
            if (this.translateChanges.length > 0) {
                $('.m_save_survey').removeClass('disabled').prop('disabled', false);
	            $('#m_auto_translate').closest('li').addClass("disabled").prop("disabled", true);
            } else {
                $('.m_save_survey').addClass('disabled').prop('disabled', true);
	            $('#m_auto_translate').closest('li').removeClass("disabled").prop("disabled", false);
            }
        }

        // Clear the change list
        this.clearChanges = function () {
            this.translateChanges = [];
            $('.m_save_survey').find('.badge').html(this.translateChanges.length);
            if (this.translateChanges.length > 0) {
                $('.m_save_survey').removeClass('disabled').prop('disabled', false);
            } else {
                $('.m_save_survey').addClass('disabled').prop('disabled', true);
	            $('#m_auto_translate').closest('li').removeClass("disabled").prop("disabled", false);
            }
        }

        /*
         * If the label has been modified before then remove it from the change list
         */
        this.removeDuplicateTranslateChange = function () {
            // TODO
        }

        /*
         * Functions for managing settings
         */
        this.getSettings = function (save) {
            var current = this.createSettingsObject(
                $('#set_survey_name').val(),
                $('#set_instance_name').val(),
                $('#set_style').val(),
                $('#set_project_name option:selected').val(),
                $('#set_default_language option:selected').text(),
                $('#task_file').prop('checked'),
                $('#timing_data').prop('checked'),
	            $('#audit_location_data').prop('checked'),
	            $('#track_changes').prop('checked'),
	            $('#hide_on_device').prop('checked'),
	            $('#search_local_data').prop('checked'),
	            $('#data_survey').prop('checked'),
	            $('#oversight_survey').prop('checked'),
                $('#read_only_survey').prop('checked'),
                $('#my_reference_data').prop('checked'),
                $('#exclude_empty').prop('checked'),
                $('#compress_pdf').prop('checked'),
	            $('#default_logo').val()
            );

            // Update the model to reflect the current values
            if (save) {
                this.survey.displayName = current.displayName;
                this.survey.instanceNameDefn = current.instanceNameDefn;
                this.survey.surveyClass = current.surveyClass;
                this.survey.p_id = current.p_id;
                this.survey.def_lang = current.def_lang;
                this.survey.task_file = current.task_file;
                this.survey.timing_data = current.timing_data;
	            this.survey.audit_location_data = current.audit_location_data;
	            this.survey.track_changes = current.track_changes;
	            this.survey.hideOnDevice = current.hideOnDevice;
	            this.survey.searchLocalData = current.searchLocalData;
	            this.survey.dataSurvey = current.dataSurvey;
	            this.survey.oversightSurvey = current.oversightSurvey;
                this.survey.myReferenceData = current.myReferenceData;
                this.survey.readOnlySurvey = current.readOnlySurvey;
                this.survey.exclude_empty = current.exclude_empty;
                this.survey.compress_pdf = current.compress_pdf;
	            this.survey.default_logo = current.default_logo;
            }

            return current;
        }

        this.setSettings = function () {
            this.savedSettings = JSON.stringify(
                this.createSettingsObject(
                    this.survey.displayName,
                    this.survey.instanceNameDefn,
                    this.survey.surveyClass,
                    this.survey.p_id,
                    this.survey.def_lang,
                    this.survey.task_file,
                    this.survey.timing_data,
	                this.survey.audit_location_data,
	                this.survey.track_changes,
                    this.survey.hideOnDevice,
	                this.survey.searchLocalData,
	                this.survey.dataSurvey,
	                this.survey.oversightSurvey,
                    this.survey.myReferenceData,
                    this.survey.readOnlySurvey,
                    this.survey.exclude_empty,
                    this.survey.compress_pdf,
                    this.survey.hrk,
                    this.survey.key_policy,
	                this.survey.default_logo
                ));

            this.forceSettingsChange = false;
        }

        this.createSettingsObject = function (displayName, instanceNameDefn,
                                              surveyClass,
                                              p_id,
                                              def_lang,
                                              task_file,
                                              timing_data,
                                              audit_location_data,
                                              track_changes,
                                              hideOnDevice,
                                              searchLocalData,
                                              dataSurvey,
                                              oversightSurvey,
                                              readOnlySurvey,
                                              myReferenceData,
                                              exclude_empty,
                                              compress_pdf,
                                              default_logo) {

            var projId;
            if (typeof p_id === "string") {
                projId = parseInt(p_id);
            } else {
                projId = p_id;
            }
            return {
                displayName: displayName,
                instanceNameDefn: instanceNameDefn,
                surveyClass: surveyClass,
                p_id: projId,
                def_lang: def_lang,
                task_file: task_file,
                timing_data: timing_data,
	            audit_location_data: audit_location_data,
	            track_changes: track_changes,
                hideOnDevice: hideOnDevice,
                searchLocalData: searchLocalData,
	            dataSurvey: dataSurvey,
	            oversightSurvey: oversightSurvey,
                myReferenceData: myReferenceData,
                readOnlySurvey: readOnlySurvey,
                exclude_empty: exclude_empty,
                compress_pdf: compress_pdf,
	            default_logo: default_logo
            }
        }

        this.settingsChange = function () {
            var current = globals.model.getSettings(false);

            if (JSON.stringify(current) !== globals.model.savedSettings || globals.model.forceSettingsChange) {
                $('#save_settings').prop("disabled", false);
            } else {
                $('#save_settings').prop("disabled", true);
            }
        }

    }

    return globals;
})();

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.globals);


/***/ },

/***/ "../smapServer/WebContent/js/app/localise.js"
/*!***************************************************!*\
  !*** ../smapServer/WebContent/js/app/localise.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
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

const $ = window.$;

const dtLangFiles = {
	en: "",
	es: "/js/libs/DataTables.i18n/es.json",
	ar: "/js/libs/DataTables.i18n/ar.json",
	fr: "/js/libs/DataTables.i18n/fr.json",
	pt: "/js/libs/DataTables.i18n/pt.json",
	hi: "/js/libs/DataTables.i18n/hi.json"
};

const localeCache = {};
let currentLocale = "en";

function normalizeLocale(locale) {
	if (!locale) {
		return "en";
	}
	return locale.toLowerCase().replace("_", "-");
}

function localeCandidates(locale) {
	const normalized = normalizeLocale(locale);
	const base = normalized.split("-")[0];
	const candidates = [];

	if (normalized && normalized !== "en") {
		candidates.push(normalized);
	}
	if (base && base !== normalized && base !== "en") {
		candidates.push(base);
	}
	if (!candidates.includes("root")) {
		candidates.push("root");
	}

	return candidates;
}

function parseAmdLocale(text) {
	const trimmed = text.trim();
	const prefix = "define(";
	const start = trimmed.indexOf(prefix);
	const end = trimmed.lastIndexOf(")");
	if (start === -1 || end === -1 || end <= start) {
		throw new Error("Invalid locale format");
	}
	const objectText = trimmed.slice(start + prefix.length, end).trim();
	const jsonText = objectText
		.replace(/\s*\/\/.*$/gm, "")
		.replace(/\s\/\*[\s\S]*?\*\//g, "")
		.trim();
	return JSON.parse(jsonText);
}

async function loadLocaleFile(locale) {
	if (localeCache[locale]) {
		return localeCache[locale];
	}

	const src = `/js/nls/${locale}/lang.js`;
	const data = await new Promise((resolve, reject) => {
		const previousDefine = window.define;
		const script = document.createElement("script");

		window.define = function (payload) {
			window.define = previousDefine;
			script.remove();
			resolve(payload);
		};
		window.define.amd = true;

		script.src = src;
		script.async = true;
		script.onerror = function () {
			window.define = previousDefine;
			script.remove();
			reject(new Error(`Locale ${locale} not found`));
		};

		document.head.appendChild(script);
	});

	localeCache[locale] = data;
	return data;
}

async function initLocale(locale) {
	const candidates = localeCandidates(locale);
	const rootLocale = await loadLocaleFile("root");
	let merged = { ...rootLocale };
	let resolvedLocale = "root";

	for (const candidate of candidates) {
		if (candidate === "root") {
			continue;
		}
		try {
			const data = await loadLocaleFile(candidate);
			merged = { ...merged, ...data };
			resolvedLocale = candidate;
			break;
		} catch (error) {
			// fallback to next candidate
		}
	}

	currentLocale = resolvedLocale;
	window.localise.set = merged;
	return merged;
}

window.localise = {
	setlang: function () {
		$(".lang").each(function() {
			const $this = $(this);
			const code = $this.data("lang");
			if (code) {
				$this.html(window.localise.set[code]);
			}
		});

		$(".lang_tt").each(function() {
			const $this = $(this);
			const code = $this.data("lang_tt");
			if (code) {
				$this.prop("title", window.localise.set[code]);
			}
		});

		$(".lang_ph").each(function() {
			const $this = $(this);
			const code = $this.data("lang_ph");
			if (code) {
				$this.prop("placeholder", window.localise.set[code]);
			}
		});

		if (typeof responsiveMobileMenu === "function") {
			rmmResizeLabels();
		}
	},
	set: {},
	dt: function() {
		return dtLangFiles[currentLocale] || dtLangFiles.en;
	},
	initLocale
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.localise);


/***/ },

/***/ "../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47.js"
/*!****************************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47.js ***!
  \****************************************************************************/
(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*! version : 4.17.47
 =========================================================
 bootstrap-datetimejs
 https://github.com/Eonasdan/bootstrap-datetimepicker
 Copyright (c) 2015 Jonathan Peterson
 =========================================================
 */
/*
 The MIT License (MIT)

 Copyright (c) 2015 Jonathan Peterson

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 */
/*global define:false */
/*global exports:false */
/*global require:false */
/*global jQuery:false */
/*global moment:false */
(function (factory) {
	'use strict';
	if (true) {
		// AMD is used - Register as an anonymous module.
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! jquery */ "jquery"), __webpack_require__(/*! moment */ "moment")], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else // removed by dead control flow
{}
}(function ($, moment) {
	'use strict';
	if (!moment) {
		throw new Error('bootstrap-datetimepicker requires Moment.js to be loaded first');
	}

	var dateTimePicker = function (element, options) {
		var picker = {},
			date,
			viewDate,
			unset = true,
			input,
			component = false,
			widget = false,
			use24Hours,
			minViewModeNumber = 0,
			actualFormat,
			parseFormats,
			currentViewMode,
			datePickerModes = [
				{
					clsName: 'days',
					navFnc: 'M',
					navStep: 1
				},
				{
					clsName: 'months',
					navFnc: 'y',
					navStep: 1
				},
				{
					clsName: 'years',
					navFnc: 'y',
					navStep: 10
				},
				{
					clsName: 'decades',
					navFnc: 'y',
					navStep: 100
				}
			],
			viewModes = ['days', 'months', 'years', 'decades'],
			verticalModes = ['top', 'bottom', 'auto'],
			horizontalModes = ['left', 'right', 'auto'],
			toolbarPlacements = ['default', 'top', 'bottom'],
			keyMap = {
				'up': 38,
				38: 'up',
				'down': 40,
				40: 'down',
				'left': 37,
				37: 'left',
				'right': 39,
				39: 'right',
				'tab': 9,
				9: 'tab',
				'escape': 27,
				27: 'escape',
				'enter': 13,
				13: 'enter',
				'pageUp': 33,
				33: 'pageUp',
				'pageDown': 34,
				34: 'pageDown',
				'shift': 16,
				16: 'shift',
				'control': 17,
				17: 'control',
				'space': 32,
				32: 'space',
				't': 84,
				84: 't',
				'delete': 46,
				46: 'delete'
			},
			keyState = {},

			/********************************************************************************
			 *
			 * Private functions
			 *
			 ********************************************************************************/

			hasTimeZone = function () {
				return moment.tz !== undefined && options.timeZone !== undefined && options.timeZone !== null && options.timeZone !== '';
			},

			getMoment = function (d) {
				var returnMoment;

				if (d === undefined || d === null) {
					returnMoment = moment(); //TODO should this use format? and locale?
				} else if (moment.isDate(d) || moment.isMoment(d)) {
					// If the date that is passed in is already a Date() or moment() object,
					// pass it directly to moment.
					returnMoment = moment(d);
				} else if (hasTimeZone()) { // There is a string to parse and a default time zone
					// parse with the tz function which takes a default time zone if it is not in the format string
					returnMoment = moment.tz(d, parseFormats, options.useStrict, options.timeZone);
				} else {
					returnMoment = moment(d, parseFormats, options.useStrict);
				}

				if (hasTimeZone()) {
					returnMoment.tz(options.timeZone);
				}

				return returnMoment;
			},

			isEnabled = function (granularity) {
				if (typeof granularity !== 'string' || granularity.length > 1) {
					throw new TypeError('isEnabled expects a single character string parameter');
				}
				switch (granularity) {
					case 'y':
						return actualFormat.indexOf('Y') !== -1;
					case 'M':
						return actualFormat.indexOf('M') !== -1;
					case 'd':
						return actualFormat.toLowerCase().indexOf('d') !== -1;
					case 'h':
					case 'H':
						return actualFormat.toLowerCase().indexOf('h') !== -1;
					case 'm':
						return actualFormat.indexOf('m') !== -1;
					case 's':
						return actualFormat.indexOf('s') !== -1;
					default:
						return false;
				}
			},

			hasTime = function () {
				return (isEnabled('h') || isEnabled('m') || isEnabled('s'));
			},

			hasDate = function () {
				return (isEnabled('y') || isEnabled('M') || isEnabled('d'));
			},

			getDatePickerTemplate = function () {
				var headTemplate = $('<thead>')
						.append($('<tr>')
							.append($('<th>').addClass('prev').attr('data-action', 'previous')
								.append($('<span>').addClass(options.icons.previous))
							)
							.append($('<th>').addClass('picker-switch').attr('data-action', 'pickerSwitch').attr('colspan', (options.calendarWeeks ? '6' : '5')))
							.append($('<th>').addClass('next').attr('data-action', 'next')
								.append($('<span>').addClass(options.icons.next))
							)
						),
					contTemplate = $('<tbody>')
						.append($('<tr>')
							.append($('<td>').attr('colspan', (options.calendarWeeks ? '8' : '7')))
						);

				return [
					$('<div>').addClass('datepicker-days')
						.append($('<table>').addClass('table-condensed')
							.append(headTemplate)
							.append($('<tbody>'))
						),
					$('<div>').addClass('datepicker-months')
						.append($('<table>').addClass('table-condensed')
							.append(headTemplate.clone())
							.append(contTemplate.clone())
						),
					$('<div>').addClass('datepicker-years')
						.append($('<table>').addClass('table-condensed')
							.append(headTemplate.clone())
							.append(contTemplate.clone())
						),
					$('<div>').addClass('datepicker-decades')
						.append($('<table>').addClass('table-condensed')
							.append(headTemplate.clone())
							.append(contTemplate.clone())
						)
				];
			},

			getTimePickerMainTemplate = function () {
				var topRow = $('<tr>'),
					middleRow = $('<tr>'),
					bottomRow = $('<tr>');

				if (isEnabled('h')) {
					topRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementHour }).addClass('btn').attr('data-action', 'incrementHours').append($('<span>').addClass(options.icons.up))));
					middleRow.append($('<td>')
						.append($('<span>').addClass('timepicker-hour').attr({ 'data-time-component': 'hours', 'title': options.tooltips.pickHour }).attr('data-action', 'showHours')));
					bottomRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementHour }).addClass('btn').attr('data-action', 'decrementHours').append($('<span>').addClass(options.icons.down))));
				}
				if (isEnabled('m')) {
					if (isEnabled('h')) {
						topRow.append($('<td>').addClass('separator'));
						middleRow.append($('<td>').addClass('separator').html(':'));
						bottomRow.append($('<td>').addClass('separator'));
					}
					topRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementMinute }).addClass('btn').attr('data-action', 'incrementMinutes')
							.append($('<span>').addClass(options.icons.up))));
					middleRow.append($('<td>')
						.append($('<span>').addClass('timepicker-minute').attr({ 'data-time-component': 'minutes', 'title': options.tooltips.pickMinute }).attr('data-action', 'showMinutes')));
					bottomRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementMinute }).addClass('btn').attr('data-action', 'decrementMinutes')
							.append($('<span>').addClass(options.icons.down))));
				}
				if (isEnabled('s')) {
					if (isEnabled('m')) {
						topRow.append($('<td>').addClass('separator'));
						middleRow.append($('<td>').addClass('separator').html(':'));
						bottomRow.append($('<td>').addClass('separator'));
					}
					topRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.incrementSecond }).addClass('btn').attr('data-action', 'incrementSeconds')
							.append($('<span>').addClass(options.icons.up))));
					middleRow.append($('<td>')
						.append($('<span>').addClass('timepicker-second').attr({ 'data-time-component': 'seconds', 'title': options.tooltips.pickSecond }).attr('data-action', 'showSeconds')));
					bottomRow.append($('<td>')
						.append($('<a>').attr({ href: '#', tabindex: '-1', 'title': options.tooltips.decrementSecond }).addClass('btn').attr('data-action', 'decrementSeconds')
							.append($('<span>').addClass(options.icons.down))));
				}

				if (!use24Hours) {
					topRow.append($('<td>').addClass('separator'));
					middleRow.append($('<td>')
						.append($('<button>').addClass('btn btn-primary').attr({ 'data-action': 'togglePeriod', tabindex: '-1', 'title': options.tooltips.togglePeriod })));
					bottomRow.append($('<td>').addClass('separator'));
				}

				return $('<div>').addClass('timepicker-picker')
					.append($('<table>').addClass('table-condensed')
						.append([topRow, middleRow, bottomRow]));
			},

			getTimePickerTemplate = function () {
				var hoursView = $('<div>').addClass('timepicker-hours')
						.append($('<table>').addClass('table-condensed')),
					minutesView = $('<div>').addClass('timepicker-minutes')
						.append($('<table>').addClass('table-condensed')),
					secondsView = $('<div>').addClass('timepicker-seconds')
						.append($('<table>').addClass('table-condensed')),
					ret = [getTimePickerMainTemplate()];

				if (isEnabled('h')) {
					ret.push(hoursView);
				}
				if (isEnabled('m')) {
					ret.push(minutesView);
				}
				if (isEnabled('s')) {
					ret.push(secondsView);
				}

				return ret;
			},

			getToolbar = function () {
				var row = [];
				if (options.showTodayButton) {
					row.push($('<td>').append($('<a>').attr({ 'data-action': 'today', 'title': options.tooltips.today }).append($('<span>').addClass(options.icons.today))));
				}
				if (!options.sideBySide && hasDate() && hasTime()) {
					row.push($('<td>').append($('<a>').attr({ 'data-action': 'togglePicker', 'title': options.tooltips.selectTime }).append($('<span>').addClass(options.icons.time))));
				}
				if (options.showClear) {
					row.push($('<td>').append($('<a>').attr({ 'data-action': 'clear', 'title': options.tooltips.clear }).append($('<span>').addClass(options.icons.clear))));
				}
				if (options.showClose) {
					row.push($('<td>').append($('<a>').attr({ 'data-action': 'close', 'title': options.tooltips.close }).append($('<span>').addClass(options.icons.close))));
				}
				return $('<table>').addClass('table-condensed').append($('<tbody>').append($('<tr>').append(row)));
			},

			getTemplate = function () {
				var template = $('<div>').addClass('bootstrap-datetimepicker-widget dropdown-menu'),
					dateView = $('<div>').addClass('datepicker').append(getDatePickerTemplate()),
					timeView = $('<div>').addClass('timepicker').append(getTimePickerTemplate()),
					content = $('<ul>').addClass('list-unstyled'),
					toolbar = $('<li>').addClass('picker-switch' + (options.collapse ? ' accordion-toggle' : '')).append(getToolbar());

				if (options.inline) {
					template.removeClass('dropdown-menu');
				}

				if (use24Hours) {
					template.addClass('usetwentyfour');
				}

				if (isEnabled('s') && !use24Hours) {
					template.addClass('wider');
				}

				if (options.sideBySide && hasDate() && hasTime()) {
					template.addClass('timepicker-sbs');
					if (options.toolbarPlacement === 'top') {
						template.append(toolbar);
					}
					template.append(
						$('<div>').addClass('row')
							.append(dateView.addClass('col-md-6'))
							.append(timeView.addClass('col-md-6'))
					);
					if (options.toolbarPlacement === 'bottom') {
						template.append(toolbar);
					}
					return template;
				}

				if (options.toolbarPlacement === 'top') {
					content.append(toolbar);
				}
				if (hasDate()) {
					content.append($('<li>').addClass((options.collapse && hasTime() ? 'collapse show' : '')).append(dateView));  // smap bootstrap v4
				}
				if (options.toolbarPlacement === 'default') {
					content.append(toolbar);
				}
				if (hasTime()) {
					content.append($('<li>').addClass((options.collapse && hasDate() ? 'collapse' : '')).append(timeView));
				}
				if (options.toolbarPlacement === 'bottom') {
					content.append(toolbar);
				}
				return template.append(content);
			},

			dataToOptions = function () {
				var eData,
					dataOptions = {};

				if (element.is('input') || options.inline) {
					eData = element.data();
				} else {
					eData = element.find('input').data();
				}

				if (eData.dateOptions && eData.dateOptions instanceof Object) {
					dataOptions = $.extend(true, dataOptions, eData.dateOptions);
				}

				$.each(options, function (key) {
					var attributeName = 'date' + key.charAt(0).toUpperCase() + key.slice(1);
					if (eData[attributeName] !== undefined) {
						dataOptions[key] = eData[attributeName];
					}
				});
				return dataOptions;
			},

			place = function () {
				var position = (component || element).position(),
					offset = (component || element).offset(),
					vertical = options.widgetPositioning.vertical,
					horizontal = options.widgetPositioning.horizontal,
					parent;

				if (options.widgetParent) {
					parent = options.widgetParent.append(widget);
				} else if (element.is('input')) {
					parent = element.after(widget).parent();
				} else if (options.inline) {
					parent = element.append(widget);
					return;
				} else {
					parent = element;
					element.children().first().after(widget);
				}

				// Top and bottom logic
				if (vertical === 'auto') {
					if (offset.top + widget.height() * 1.5 >= $(window).height() + $(window).scrollTop() &&
						widget.height() + element.outerHeight() < offset.top) {
						vertical = 'top';
					} else {
						vertical = 'bottom';
					}
				}

				// Left and right logic
				if (horizontal === 'auto') {
					if (parent.width() < offset.left + widget.outerWidth() / 2 &&
						offset.left + widget.outerWidth() > $(window).width()) {
						horizontal = 'right';
					} else {
						horizontal = 'left';
					}
				}

				if (vertical === 'top') {
					widget.addClass('top').removeClass('bottom');
				} else {
					widget.addClass('bottom').removeClass('top');
				}

				if (horizontal === 'right') {
					widget.addClass('pull-right');
				} else {
					widget.removeClass('pull-right');
				}

				// find the first parent element that has a non-static css positioning
				if (parent.css('position') === 'static') {
					parent = parent.parents().filter(function () {
						return $(this).css('position') !== 'static';
					}).first();
				}

				if (parent.length === 0) {
					throw new Error('datetimepicker component should be placed within a non-static positioned container');
				}

				widget.css({
					top: vertical === 'top' ? 'auto' : position.top + element.outerHeight(),
					bottom: vertical === 'top' ? parent.outerHeight() - (parent === element ? 0 : position.top) : 'auto',
					left: horizontal === 'left' ? (parent === element ? 0 : position.left) : 'auto',
					right: horizontal === 'left' ? 'auto' : parent.outerWidth() - element.outerWidth() - (parent === element ? 0 : position.left)
				});
			},

			notifyEvent = function (e) {
				if (e.type === 'dp.change' && ((e.date && e.date.isSame(e.oldDate)) || (!e.date && !e.oldDate))) {
					return;
				}
				element.trigger(e);
			},

			viewUpdate = function (e) {
				if (e === 'y') {
					e = 'YYYY';
				}
				notifyEvent({
					type: 'dp.update',
					change: e,
					viewDate: viewDate.clone()
				});
			},

			showMode = function (dir) {
				if (!widget) {
					return;
				}
				if (dir) {
					currentViewMode = Math.max(minViewModeNumber, Math.min(3, currentViewMode + dir));
				}
				widget.find('.datepicker > div').hide().filter('.datepicker-' + datePickerModes[currentViewMode].clsName).show();
			},

			fillDow = function () {
				var row = $('<tr>'),
					currentDate = viewDate.clone().startOf('w').startOf('d');

				if (options.calendarWeeks === true) {
					row.append($('<th>').addClass('cw').text('#'));
				}

				while (currentDate.isBefore(viewDate.clone().endOf('w'))) {
					row.append($('<th>').addClass('dow').text(currentDate.format('dd')));
					currentDate.add(1, 'd');
				}
				widget.find('.datepicker-days thead').append(row);
			},

			isInDisabledDates = function (testDate) {
				return options.disabledDates[testDate.format('YYYY-MM-DD')] === true;
			},

			isInEnabledDates = function (testDate) {
				return options.enabledDates[testDate.format('YYYY-MM-DD')] === true;
			},

			isInDisabledHours = function (testDate) {
				return options.disabledHours[testDate.format('H')] === true;
			},

			isInEnabledHours = function (testDate) {
				return options.enabledHours[testDate.format('H')] === true;
			},

			isValid = function (targetMoment, granularity) {
				if (!targetMoment.isValid()) {
					return false;
				}
				if (options.disabledDates && granularity === 'd' && isInDisabledDates(targetMoment)) {
					return false;
				}
				if (options.enabledDates && granularity === 'd' && !isInEnabledDates(targetMoment)) {
					return false;
				}
				if (options.minDate && targetMoment.isBefore(options.minDate, granularity)) {
					return false;
				}
				if (options.maxDate && targetMoment.isAfter(options.maxDate, granularity)) {
					return false;
				}
				if (options.daysOfWeekDisabled && granularity === 'd' && options.daysOfWeekDisabled.indexOf(targetMoment.day()) !== -1) {
					return false;
				}
				if (options.disabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && isInDisabledHours(targetMoment)) {
					return false;
				}
				if (options.enabledHours && (granularity === 'h' || granularity === 'm' || granularity === 's') && !isInEnabledHours(targetMoment)) {
					return false;
				}
				if (options.disabledTimeIntervals && (granularity === 'h' || granularity === 'm' || granularity === 's')) {
					var found = false;
					$.each(options.disabledTimeIntervals, function () {
						if (targetMoment.isBetween(this[0], this[1])) {
							found = true;
							return false;
						}
					});
					if (found) {
						return false;
					}
				}
				return true;
			},

			fillMonths = function () {
				var spans = [],
					monthsShort = viewDate.clone().startOf('y').startOf('d');
				while (monthsShort.isSame(viewDate, 'y')) {
					spans.push($('<span>').attr('data-action', 'selectMonth').addClass('month').text(monthsShort.format('MMM')));
					monthsShort.add(1, 'M');
				}
				widget.find('.datepicker-months td').empty().append(spans);
			},

			updateMonths = function () {
				var monthsView = widget.find('.datepicker-months'),
					monthsViewHeader = monthsView.find('th'),
					months = monthsView.find('tbody').find('span');

				monthsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevYear);
				monthsViewHeader.eq(1).attr('title', options.tooltips.selectYear);
				monthsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextYear);

				monthsView.find('.disabled').removeClass('disabled');

				if (!isValid(viewDate.clone().subtract(1, 'y'), 'y')) {
					monthsViewHeader.eq(0).addClass('disabled');
				}

				monthsViewHeader.eq(1).text(viewDate.year());

				if (!isValid(viewDate.clone().add(1, 'y'), 'y')) {
					monthsViewHeader.eq(2).addClass('disabled');
				}

				months.removeClass('active');
				if (date.isSame(viewDate, 'y') && !unset) {
					months.eq(date.month()).addClass('active');
				}

				months.each(function (index) {
					if (!isValid(viewDate.clone().month(index), 'M')) {
						$(this).addClass('disabled');
					}
				});
			},

			updateYears = function () {
				var yearsView = widget.find('.datepicker-years'),
					yearsViewHeader = yearsView.find('th'),
					startYear = viewDate.clone().subtract(5, 'y'),
					endYear = viewDate.clone().add(6, 'y'),
					html = '';

				yearsViewHeader.eq(0).find('span').attr('title', options.tooltips.prevDecade);
				yearsViewHeader.eq(1).attr('title', options.tooltips.selectDecade);
				yearsViewHeader.eq(2).find('span').attr('title', options.tooltips.nextDecade);

				yearsView.find('.disabled').removeClass('disabled');

				if (options.minDate && options.minDate.isAfter(startYear, 'y')) {
					yearsViewHeader.eq(0).addClass('disabled');
				}

				yearsViewHeader.eq(1).text(startYear.year() + '-' + endYear.year());

				if (options.maxDate && options.maxDate.isBefore(endYear, 'y')) {
					yearsViewHeader.eq(2).addClass('disabled');
				}

				while (!startYear.isAfter(endYear, 'y')) {
					html += '<span data-action="selectYear" class="year' + (startYear.isSame(date, 'y') && !unset ? ' active' : '') + (!isValid(startYear, 'y') ? ' disabled' : '') + '">' + startYear.year() + '</span>';
					startYear.add(1, 'y');
				}

				yearsView.find('td').html(html);
			},

			updateDecades = function () {
				var decadesView = widget.find('.datepicker-decades'),
					decadesViewHeader = decadesView.find('th'),
					startDecade = moment({ y: viewDate.year() - (viewDate.year() % 100) - 1 }),
					endDecade = startDecade.clone().add(100, 'y'),
					startedAt = startDecade.clone(),
					minDateDecade = false,
					maxDateDecade = false,
					endDecadeYear,
					html = '';

				decadesViewHeader.eq(0).find('span').attr('title', options.tooltips.prevCentury);
				decadesViewHeader.eq(2).find('span').attr('title', options.tooltips.nextCentury);

				decadesView.find('.disabled').removeClass('disabled');

				if (startDecade.isSame(moment({ y: 1900 })) || (options.minDate && options.minDate.isAfter(startDecade, 'y'))) {
					decadesViewHeader.eq(0).addClass('disabled');
				}

				decadesViewHeader.eq(1).text(startDecade.year() + '-' + endDecade.year());

				if (startDecade.isSame(moment({ y: 2000 })) || (options.maxDate && options.maxDate.isBefore(endDecade, 'y'))) {
					decadesViewHeader.eq(2).addClass('disabled');
				}

				while (!startDecade.isAfter(endDecade, 'y')) {
					endDecadeYear = startDecade.year() + 12;
					minDateDecade = options.minDate && options.minDate.isAfter(startDecade, 'y') && options.minDate.year() <= endDecadeYear;
					maxDateDecade = options.maxDate && options.maxDate.isAfter(startDecade, 'y') && options.maxDate.year() <= endDecadeYear;
					html += '<span data-action="selectDecade" class="decade' + (date.isAfter(startDecade) && date.year() <= endDecadeYear ? ' active' : '') +
						(!isValid(startDecade, 'y') && !minDateDecade && !maxDateDecade ? ' disabled' : '') + '" data-selection="' + (startDecade.year() + 6) + '">' + (startDecade.year() + 1) + ' - ' + (startDecade.year() + 12) + '</span>';
					startDecade.add(12, 'y');
				}
				html += '<span></span><span></span><span></span>'; //push the dangling block over, at least this way it's even

				decadesView.find('td').html(html);
				decadesViewHeader.eq(1).text((startedAt.year() + 1) + '-' + (startDecade.year()));
			},

			fillDate = function () {
				var daysView = widget.find('.datepicker-days'),
					daysViewHeader = daysView.find('th'),
					currentDate,
					html = [],
					row,
					clsNames = [],
					i;

				if (!hasDate()) {
					return;
				}

				daysViewHeader.eq(0).find('span').attr('title', options.tooltips.prevMonth);
				daysViewHeader.eq(1).attr('title', options.tooltips.selectMonth);
				daysViewHeader.eq(2).find('span').attr('title', options.tooltips.nextMonth);

				daysView.find('.disabled').removeClass('disabled');
				daysViewHeader.eq(1).text(viewDate.format(options.dayViewHeaderFormat));

				if (!isValid(viewDate.clone().subtract(1, 'M'), 'M')) {
					daysViewHeader.eq(0).addClass('disabled');
				}
				if (!isValid(viewDate.clone().add(1, 'M'), 'M')) {
					daysViewHeader.eq(2).addClass('disabled');
				}

				currentDate = viewDate.clone().startOf('M').startOf('w').startOf('d');

				for (i = 0; i < 42; i++) { //always display 42 days (should show 6 weeks)
					if (currentDate.weekday() === 0) {
						row = $('<tr>');
						if (options.calendarWeeks) {
							row.append('<td class="cw">' + currentDate.week() + '</td>');
						}
						html.push(row);
					}
					clsNames = ['day'];
					if (currentDate.isBefore(viewDate, 'M')) {
						clsNames.push('old');
					}
					if (currentDate.isAfter(viewDate, 'M')) {
						clsNames.push('new');
					}
					if (currentDate.isSame(date, 'd') && !unset) {
						clsNames.push('active');
					}
					if (!isValid(currentDate, 'd')) {
						clsNames.push('disabled');
					}
					if (currentDate.isSame(getMoment(), 'd')) {
						clsNames.push('today');
					}
					if (currentDate.day() === 0 || currentDate.day() === 6) {
						clsNames.push('weekend');
					}
					notifyEvent({
						type: 'dp.classify',
						date: currentDate,
						classNames: clsNames
					});
					row.append('<td data-action="selectDay" data-day="' + currentDate.format('L') + '" class="' + clsNames.join(' ') + '">' + currentDate.date() + '</td>');
					currentDate.add(1, 'd');
				}

				daysView.find('tbody').empty().append(html);

				updateMonths();

				updateYears();

				updateDecades();
			},

			fillHours = function () {
				var table = widget.find('.timepicker-hours table'),
					currentHour = viewDate.clone().startOf('d'),
					html = [],
					row = $('<tr>');

				if (viewDate.hour() > 11 && !use24Hours) {
					currentHour.hour(12);
				}
				while (currentHour.isSame(viewDate, 'd') && (use24Hours || (viewDate.hour() < 12 && currentHour.hour() < 12) || viewDate.hour() > 11)) {
					if (currentHour.hour() % 4 === 0) {
						row = $('<tr>');
						html.push(row);
					}
					row.append('<td data-action="selectHour" class="hour' + (!isValid(currentHour, 'h') ? ' disabled' : '') + '">' + currentHour.format(use24Hours ? 'HH' : 'hh') + '</td>');
					currentHour.add(1, 'h');
				}
				table.empty().append(html);
			},

			fillMinutes = function () {
				var table = widget.find('.timepicker-minutes table'),
					currentMinute = viewDate.clone().startOf('h'),
					html = [],
					row = $('<tr>'),
					step = options.stepping === 1 ? 5 : options.stepping;

				while (viewDate.isSame(currentMinute, 'h')) {
					if (currentMinute.minute() % (step * 4) === 0) {
						row = $('<tr>');
						html.push(row);
					}
					row.append('<td data-action="selectMinute" class="minute' + (!isValid(currentMinute, 'm') ? ' disabled' : '') + '">' + currentMinute.format('mm') + '</td>');
					currentMinute.add(step, 'm');
				}
				table.empty().append(html);
			},

			fillSeconds = function () {
				var table = widget.find('.timepicker-seconds table'),
					currentSecond = viewDate.clone().startOf('m'),
					html = [],
					row = $('<tr>');

				while (viewDate.isSame(currentSecond, 'm')) {
					if (currentSecond.second() % 20 === 0) {
						row = $('<tr>');
						html.push(row);
					}
					row.append('<td data-action="selectSecond" class="second' + (!isValid(currentSecond, 's') ? ' disabled' : '') + '">' + currentSecond.format('ss') + '</td>');
					currentSecond.add(5, 's');
				}

				table.empty().append(html);
			},

			fillTime = function () {
				var toggle, newDate, timeComponents = widget.find('.timepicker span[data-time-component]');

				if (!use24Hours) {
					toggle = widget.find('.timepicker [data-action=togglePeriod]');
					newDate = date.clone().add((date.hours() >= 12) ? -12 : 12, 'h');

					toggle.text(date.format('A'));

					if (isValid(newDate, 'h')) {
						toggle.removeClass('disabled');
					} else {
						toggle.addClass('disabled');
					}
				}
				timeComponents.filter('[data-time-component=hours]').text(date.format(use24Hours ? 'HH' : 'hh'));
				timeComponents.filter('[data-time-component=minutes]').text(date.format('mm'));
				timeComponents.filter('[data-time-component=seconds]').text(date.format('ss'));

				fillHours();
				fillMinutes();
				fillSeconds();
			},

			update = function () {
				if (!widget) {
					return;
				}
				fillDate();
				fillTime();
			},

			setValue = function (targetMoment) {
				var oldDate = unset ? null : date;

				// case of calling setValue(null or false)
				if (!targetMoment) {
					unset = true;
					input.val('');
					element.data('date', '');
					notifyEvent({
						type: 'dp.change',
						date: false,
						oldDate: oldDate
					});
					update();
					return;
				}

				targetMoment = targetMoment.clone().locale(options.locale);

				if (hasTimeZone()) {
					targetMoment.tz(options.timeZone);
				}

				if (options.stepping !== 1) {
					targetMoment.minutes((Math.round(targetMoment.minutes() / options.stepping) * options.stepping)).seconds(0);

					while (options.minDate && targetMoment.isBefore(options.minDate)) {
						targetMoment.add(options.stepping, 'minutes');
					}
				}

				if (isValid(targetMoment)) {
					date = targetMoment;
					viewDate = date.clone();
					input.val(date.format(actualFormat));
					element.data('date', date.format(actualFormat));
					unset = false;
					update();
					notifyEvent({
						type: 'dp.change',
						date: date.clone(),
						oldDate: oldDate
					});
				} else {
					if (!options.keepInvalid) {
						input.val(unset ? '' : date.format(actualFormat));
					} else {
						notifyEvent({
							type: 'dp.change',
							date: targetMoment,
							oldDate: oldDate
						});
					}
					notifyEvent({
						type: 'dp.error',
						date: targetMoment,
						oldDate: oldDate
					});
				}
			},

			/**
			 * Hides the widget. Possibly will emit dp.hide
			 */
			hide = function () {
				var transitioning = false;
				if (!widget) {
					return picker;
				}
				// Ignore event if in the middle of a picker transition
				widget.find('.collapse').each(function () {
					var collapseData = $(this).data('collapse');
					if (collapseData && collapseData.transitioning) {
						transitioning = true;
						return false;
					}
					return true;
				});
				if (transitioning) {
					return picker;
				}
				if (component && component.hasClass('btn')) {
					component.toggleClass('active');
				}
				widget.hide();

				$(window).off('resize', place);
				widget.off('click', '[data-action]');
				widget.off('mousedown', false);

				widget.remove();
				widget = false;

				notifyEvent({
					type: 'dp.hide',
					date: date.clone()
				});

				input.blur();

				viewDate = date.clone();

				return picker;
			},

			clear = function () {
				setValue(null);
			},

			parseInputDate = function (inputDate) {
				if (options.parseInputDate === undefined) {
					if (!moment.isMoment(inputDate) || inputDate instanceof Date) {
						inputDate = getMoment(inputDate);
					}
				} else {
					inputDate = options.parseInputDate(inputDate);
				}
				//inputDate.locale(options.locale);
				return inputDate;
			},

			/********************************************************************************
			 *
			 * Widget UI interaction functions
			 *
			 ********************************************************************************/
			actions = {
				next: function () {
					var navFnc = datePickerModes[currentViewMode].navFnc;
					viewDate.add(datePickerModes[currentViewMode].navStep, navFnc);
					fillDate();
					viewUpdate(navFnc);
				},

				previous: function () {
					var navFnc = datePickerModes[currentViewMode].navFnc;
					viewDate.subtract(datePickerModes[currentViewMode].navStep, navFnc);
					fillDate();
					viewUpdate(navFnc);
				},

				pickerSwitch: function () {
					showMode(1);
				},

				selectMonth: function (e) {
					var month = $(e.target).closest('tbody').find('span').index($(e.target));
					viewDate.month(month);
					if (currentViewMode === minViewModeNumber) {
						setValue(date.clone().year(viewDate.year()).month(viewDate.month()));
						if (!options.inline) {
							hide();
						}
					} else {
						showMode(-1);
						fillDate();
					}
					viewUpdate('M');
				},

				selectYear: function (e) {
					var year = parseInt($(e.target).text(), 10) || 0;
					viewDate.year(year);
					if (currentViewMode === minViewModeNumber) {
						setValue(date.clone().year(viewDate.year()));
						if (!options.inline) {
							hide();
						}
					} else {
						showMode(-1);
						fillDate();
					}
					viewUpdate('YYYY');
				},

				selectDecade: function (e) {
					var year = parseInt($(e.target).data('selection'), 10) || 0;
					viewDate.year(year);
					if (currentViewMode === minViewModeNumber) {
						setValue(date.clone().year(viewDate.year()));
						if (!options.inline) {
							hide();
						}
					} else {
						showMode(-1);
						fillDate();
					}
					viewUpdate('YYYY');
				},

				selectDay: function (e) {
					var day = viewDate.clone();
					if ($(e.target).is('.old')) {
						day.subtract(1, 'M');
					}
					if ($(e.target).is('.new')) {
						day.add(1, 'M');
					}
					setValue(day.date(parseInt($(e.target).text(), 10)));
					if (!hasTime() && !options.keepOpen && !options.inline) {
						hide();
					}
				},

				incrementHours: function () {
					var newDate = date.clone().add(1, 'h');
					if (isValid(newDate, 'h')) {
						setValue(newDate);
					}
				},

				incrementMinutes: function () {
					var newDate = date.clone().add(options.stepping, 'm');
					if (isValid(newDate, 'm')) {
						setValue(newDate);
					}
				},

				incrementSeconds: function () {
					var newDate = date.clone().add(1, 's');
					if (isValid(newDate, 's')) {
						setValue(newDate);
					}
				},

				decrementHours: function () {
					var newDate = date.clone().subtract(1, 'h');
					if (isValid(newDate, 'h')) {
						setValue(newDate);
					}
				},

				decrementMinutes: function () {
					var newDate = date.clone().subtract(options.stepping, 'm');
					if (isValid(newDate, 'm')) {
						setValue(newDate);
					}
				},

				decrementSeconds: function () {
					var newDate = date.clone().subtract(1, 's');
					if (isValid(newDate, 's')) {
						setValue(newDate);
					}
				},

				togglePeriod: function () {
					setValue(date.clone().add((date.hours() >= 12) ? -12 : 12, 'h'));
				},

				togglePicker: function (e) {
					var $this = $(e.target),
						$parent = $this.closest('ul'),
						expanded = $parent.find('.show'),               // smap bootstrap v4
						closed = $parent.find('.collapse:not(.show)'),  // smap bootstrap v4
						collapseData;

					if (expanded && expanded.length) {
						collapseData = expanded.data('collapse');
						if (collapseData && collapseData.transitioning) {
							return;
						}
						if (expanded.collapse) { // if collapse plugin is available through bootstrap.js then use it
							expanded.collapse('hide');
							closed.collapse('show');
						} else { // otherwise just toggle in class on the two views
							expanded.removeClass('show');   // smap bootstrap v4
							closed.addClass('show');        // smap bootstrap v4
						}
						if ($this.is('span')) {
							$this.toggleClass(options.icons.time + ' ' + options.icons.date);
						} else {
							$this.find('span').toggleClass(options.icons.time + ' ' + options.icons.date);
						}

						// NOTE: uncomment if toggled state will be restored in show()
						//if (component) {
						//    component.find('span').toggleClass(options.icons.time + ' ' + options.icons.date);
						//}
					}
				},

				showPicker: function () {
					widget.find('.timepicker > div:not(.timepicker-picker)').hide();
					widget.find('.timepicker .timepicker-picker').show();
				},

				showHours: function () {
					widget.find('.timepicker .timepicker-picker').hide();
					widget.find('.timepicker .timepicker-hours').show();
				},

				showMinutes: function () {
					widget.find('.timepicker .timepicker-picker').hide();
					widget.find('.timepicker .timepicker-minutes').show();
				},

				showSeconds: function () {
					widget.find('.timepicker .timepicker-picker').hide();
					widget.find('.timepicker .timepicker-seconds').show();
				},

				selectHour: function (e) {
					var hour = parseInt($(e.target).text(), 10);

					if (!use24Hours) {
						if (date.hours() >= 12) {
							if (hour !== 12) {
								hour += 12;
							}
						} else {
							if (hour === 12) {
								hour = 0;
							}
						}
					}
					setValue(date.clone().hours(hour));
					actions.showPicker.call(picker);
				},

				selectMinute: function (e) {
					setValue(date.clone().minutes(parseInt($(e.target).text(), 10)));
					actions.showPicker.call(picker);
				},

				selectSecond: function (e) {
					setValue(date.clone().seconds(parseInt($(e.target).text(), 10)));
					actions.showPicker.call(picker);
				},

				clear: clear,

				today: function () {
					var todaysDate = getMoment();
					if (isValid(todaysDate, 'd')) {
						setValue(todaysDate);
					}
				},

				close: hide
			},

			doAction = function (e) {
				if ($(e.currentTarget).is('.disabled')) {
					return false;
				}
				actions[$(e.currentTarget).data('action')].apply(picker, arguments);
				return false;
			},

			/**
			 * Shows the widget. Possibly will emit dp.show and dp.change
			 */
			show = function () {
				var currentMoment,
					useCurrentGranularity = {
						'year': function (m) {
							return m.month(0).date(1).hours(0).seconds(0).minutes(0);
						},
						'month': function (m) {
							return m.date(1).hours(0).seconds(0).minutes(0);
						},
						'day': function (m) {
							return m.hours(0).seconds(0).minutes(0);
						},
						'hour': function (m) {
							return m.seconds(0).minutes(0);
						},
						'minute': function (m) {
							return m.seconds(0);
						}
					};

				if (input.prop('disabled') || (!options.ignoreReadonly && input.prop('readonly')) || widget) {
					return picker;
				}
				if (input.val() !== undefined && input.val().trim().length !== 0) {
					setValue(parseInputDate(input.val().trim()));
				} else if (unset && options.useCurrent && (options.inline || (input.is('input') && input.val().trim().length === 0))) {
					currentMoment = getMoment();
					if (typeof options.useCurrent === 'string') {
						currentMoment = useCurrentGranularity[options.useCurrent](currentMoment);
					}
					setValue(currentMoment);
				}
				widget = getTemplate();

				fillDow();
				fillMonths();

				widget.find('.timepicker-hours').hide();
				widget.find('.timepicker-minutes').hide();
				widget.find('.timepicker-seconds').hide();

				update();
				showMode();

				$(window).on('resize', place);
				widget.on('click', '[data-action]', doAction); // this handles clicks on the widget
				widget.on('mousedown', false);

				if (component && component.hasClass('btn')) {
					component.toggleClass('active');
				}
				place();
				widget.show();
				if (options.focusOnShow && !input.is(':focus')) {
					input.focus();
				}

				notifyEvent({
					type: 'dp.show'
				});
				return picker;
			},

			/**
			 * Shows or hides the widget
			 */
			toggle = function () {
				return (widget ? hide() : show());
			},

			keydown = function (e) {
				var handler = null,
					index,
					index2,
					pressedKeys = [],
					pressedModifiers = {},
					currentKey = e.which,
					keyBindKeys,
					allModifiersPressed,
					pressed = 'p';

				keyState[currentKey] = pressed;

				for (index in keyState) {
					if (keyState.hasOwnProperty(index) && keyState[index] === pressed) {
						pressedKeys.push(index);
						if (parseInt(index, 10) !== currentKey) {
							pressedModifiers[index] = true;
						}
					}
				}

				for (index in options.keyBinds) {
					if (options.keyBinds.hasOwnProperty(index) && typeof (options.keyBinds[index]) === 'function') {
						keyBindKeys = index.split(' ');
						if (keyBindKeys.length === pressedKeys.length && keyMap[currentKey] === keyBindKeys[keyBindKeys.length - 1]) {
							allModifiersPressed = true;
							for (index2 = keyBindKeys.length - 2; index2 >= 0; index2--) {
								if (!(keyMap[keyBindKeys[index2]] in pressedModifiers)) {
									allModifiersPressed = false;
									break;
								}
							}
							if (allModifiersPressed) {
								handler = options.keyBinds[index];
								break;
							}
						}
					}
				}

				if (handler) {
					handler.call(picker, widget);
					e.stopPropagation();
					e.preventDefault();
				}
			},

			keyup = function (e) {
				keyState[e.which] = 'r';
				e.stopPropagation();
				e.preventDefault();
			},

			change = function (e) {
				var val = $(e.target).val().trim(),
					parsedDate = val ? parseInputDate(val) : null;
				setValue(parsedDate);
				e.stopImmediatePropagation();
				return false;
			},

			attachDatePickerElementEvents = function () {
				input.on({
					'change': change,
					'blur': options.debug ? '' : hide,
					'keydown': keydown,
					'keyup': keyup,
					'focus': options.allowInputToggle ? show : ''
				});

				if (element.is('input')) {
					input.on({
						'focus': show
					});
				} else if (component) {
					component.on('click', toggle);
					component.on('mousedown', false);
				}
			},

			detachDatePickerElementEvents = function () {
				input.off({
					'change': change,
					'blur': blur,
					'keydown': keydown,
					'keyup': keyup,
					'focus': options.allowInputToggle ? hide : ''
				});

				if (element.is('input')) {
					input.off({
						'focus': show
					});
				} else if (component) {
					component.off('click', toggle);
					component.off('mousedown', false);
				}
			},

			indexGivenDates = function (givenDatesArray) {
				// Store given enabledDates and disabledDates as keys.
				// This way we can check their existence in O(1) time instead of looping through whole array.
				// (for example: options.enabledDates['2014-02-27'] === true)
				var givenDatesIndexed = {};
				$.each(givenDatesArray, function () {
					var dDate = parseInputDate(this);
					if (dDate.isValid()) {
						givenDatesIndexed[dDate.format('YYYY-MM-DD')] = true;
					}
				});
				return (Object.keys(givenDatesIndexed).length) ? givenDatesIndexed : false;
			},

			indexGivenHours = function (givenHoursArray) {
				// Store given enabledHours and disabledHours as keys.
				// This way we can check their existence in O(1) time instead of looping through whole array.
				// (for example: options.enabledHours['2014-02-27'] === true)
				var givenHoursIndexed = {};
				$.each(givenHoursArray, function () {
					givenHoursIndexed[this] = true;
				});
				return (Object.keys(givenHoursIndexed).length) ? givenHoursIndexed : false;
			},

			initFormatting = function () {
				var format = options.format || 'L LT';

				actualFormat = format.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (formatInput) {
					var newinput = date.localeData().longDateFormat(formatInput) || formatInput;
					return newinput.replace(/(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g, function (formatInput2) { //temp fix for #740
						return date.localeData().longDateFormat(formatInput2) || formatInput2;
					});
				});


				parseFormats = options.extraFormats ? options.extraFormats.slice() : [];
				if (parseFormats.indexOf(format) < 0 && parseFormats.indexOf(actualFormat) < 0) {
					parseFormats.push(actualFormat);
				}

				use24Hours = (actualFormat.toLowerCase().indexOf('a') < 1 && actualFormat.replace(/\[.*?\]/g, '').indexOf('h') < 1);

				if (isEnabled('y')) {
					minViewModeNumber = 2;
				}
				if (isEnabled('M')) {
					minViewModeNumber = 1;
				}
				if (isEnabled('d')) {
					minViewModeNumber = 0;
				}

				currentViewMode = Math.max(minViewModeNumber, currentViewMode);

				if (!unset) {
					setValue(date);
				}
			};

		/********************************************************************************
		 *
		 * Public API functions
		 * =====================
		 *
		 * Important: Do not expose direct references to private objects or the options
		 * object to the outer world. Always return a clone when returning values or make
		 * a clone when setting a private variable.
		 *
		 ********************************************************************************/
		picker.destroy = function () {
			///<summary>Destroys the widget and removes all attached event listeners</summary>
			hide();
			detachDatePickerElementEvents();
			element.removeData('DateTimePicker');
			element.removeData('date');
		};

		picker.toggle = toggle;

		picker.show = show;

		picker.hide = hide;

		picker.disable = function () {
			///<summary>Disables the input element, the component is attached to, by adding a disabled="true" attribute to it.
			///If the widget was visible before that call it is hidden. Possibly emits dp.hide</summary>
			hide();
			if (component && component.hasClass('btn')) {
				component.addClass('disabled');
			}
			input.prop('disabled', true);
			return picker;
		};

		picker.enable = function () {
			///<summary>Enables the input element, the component is attached to, by removing disabled attribute from it.</summary>
			if (component && component.hasClass('btn')) {
				component.removeClass('disabled');
			}
			input.prop('disabled', false);
			return picker;
		};

		picker.ignoreReadonly = function (ignoreReadonly) {
			if (arguments.length === 0) {
				return options.ignoreReadonly;
			}
			if (typeof ignoreReadonly !== 'boolean') {
				throw new TypeError('ignoreReadonly () expects a boolean parameter');
			}
			options.ignoreReadonly = ignoreReadonly;
			return picker;
		};

		picker.options = function (newOptions) {
			if (arguments.length === 0) {
				return $.extend(true, {}, options);
			}

			if (!(newOptions instanceof Object)) {
				throw new TypeError('options() options parameter should be an object');
			}
			$.extend(true, options, newOptions);
			$.each(options, function (key, value) {
				if (picker[key] !== undefined) {
					picker[key](value);
				} else {
					throw new TypeError('option ' + key + ' is not recognized!');
				}
			});
			return picker;
		};

		picker.date = function (newDate) {
			///<signature helpKeyword="$.fn.datetimepicker.date">
			///<summary>Returns the component's model current date, a moment object or null if not set.</summary>
			///<returns type="Moment">date.clone()</returns>
			///</signature>
			///<signature>
			///<summary>Sets the components model current moment to it. Passing a null value unsets the components model current moment. Parsing of the newDate parameter is made using moment library with the options.format and options.useStrict components configuration.</summary>
			///<param name="newDate" locid="$.fn.datetimepicker.date_p:newDate">Takes string, Date, moment, null parameter.</param>
			///</signature>
			if (arguments.length === 0) {
				if (unset) {
					return null;
				}
				return date.clone();
			}

			if (newDate !== null && typeof newDate !== 'string' && !moment.isMoment(newDate) && !(newDate instanceof Date)) {
				throw new TypeError('date() parameter must be one of [null, string, moment or Date]');
			}

			setValue(newDate === null ? null : parseInputDate(newDate));
			return picker;
		};

		picker.format = function (newFormat) {
			///<summary>test su</summary>
			///<param name="newFormat">info about para</param>
			///<returns type="string|boolean">returns foo</returns>
			if (arguments.length === 0) {
				return options.format;
			}

			if ((typeof newFormat !== 'string') && ((typeof newFormat !== 'boolean') || (newFormat !== false))) {
				throw new TypeError('format() expects a string or boolean:false parameter ' + newFormat);
			}

			options.format = newFormat;
			if (actualFormat) {
				initFormatting(); // reinit formatting
			}
			return picker;
		};

		picker.timeZone = function (newZone) {
			if (arguments.length === 0) {
				return options.timeZone;
			}

			if (typeof newZone !== 'string') {
				throw new TypeError('newZone() expects a string parameter');
			}

			options.timeZone = newZone;

			return picker;
		};

		picker.dayViewHeaderFormat = function (newFormat) {
			if (arguments.length === 0) {
				return options.dayViewHeaderFormat;
			}

			if (typeof newFormat !== 'string') {
				throw new TypeError('dayViewHeaderFormat() expects a string parameter');
			}

			options.dayViewHeaderFormat = newFormat;
			return picker;
		};

		picker.extraFormats = function (formats) {
			if (arguments.length === 0) {
				return options.extraFormats;
			}

			if (formats !== false && !(formats instanceof Array)) {
				throw new TypeError('extraFormats() expects an array or false parameter');
			}

			options.extraFormats = formats;
			if (parseFormats) {
				initFormatting(); // reinit formatting
			}
			return picker;
		};

		picker.disabledDates = function (dates) {
			///<signature helpKeyword="$.fn.datetimepicker.disabledDates">
			///<summary>Returns an array with the currently set disabled dates on the component.</summary>
			///<returns type="array">options.disabledDates</returns>
			///</signature>
			///<signature>
			///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
			///options.enabledDates if such exist.</summary>
			///<param name="dates" locid="$.fn.datetimepicker.disabledDates_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
			///</signature>
			if (arguments.length === 0) {
				return (options.disabledDates ? $.extend({}, options.disabledDates) : options.disabledDates);
			}

			if (!dates) {
				options.disabledDates = false;
				update();
				return picker;
			}
			if (!(dates instanceof Array)) {
				throw new TypeError('disabledDates() expects an array parameter');
			}
			options.disabledDates = indexGivenDates(dates);
			options.enabledDates = false;
			update();
			return picker;
		};

		picker.enabledDates = function (dates) {
			///<signature helpKeyword="$.fn.datetimepicker.enabledDates">
			///<summary>Returns an array with the currently set enabled dates on the component.</summary>
			///<returns type="array">options.enabledDates</returns>
			///</signature>
			///<signature>
			///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of options.disabledDates if such exist.</summary>
			///<param name="dates" locid="$.fn.datetimepicker.enabledDates_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
			///</signature>
			if (arguments.length === 0) {
				return (options.enabledDates ? $.extend({}, options.enabledDates) : options.enabledDates);
			}

			if (!dates) {
				options.enabledDates = false;
				update();
				return picker;
			}
			if (!(dates instanceof Array)) {
				throw new TypeError('enabledDates() expects an array parameter');
			}
			options.enabledDates = indexGivenDates(dates);
			options.disabledDates = false;
			update();
			return picker;
		};

		picker.daysOfWeekDisabled = function (daysOfWeekDisabled) {
			if (arguments.length === 0) {
				return options.daysOfWeekDisabled.splice(0);
			}

			if ((typeof daysOfWeekDisabled === 'boolean') && !daysOfWeekDisabled) {
				options.daysOfWeekDisabled = false;
				update();
				return picker;
			}

			if (!(daysOfWeekDisabled instanceof Array)) {
				throw new TypeError('daysOfWeekDisabled() expects an array parameter');
			}
			options.daysOfWeekDisabled = daysOfWeekDisabled.reduce(function (previousValue, currentValue) {
				currentValue = parseInt(currentValue, 10);
				if (currentValue > 6 || currentValue < 0 || isNaN(currentValue)) {
					return previousValue;
				}
				if (previousValue.indexOf(currentValue) === -1) {
					previousValue.push(currentValue);
				}
				return previousValue;
			}, []).sort();
			if (options.useCurrent && !options.keepInvalid) {
				var tries = 0;
				while (!isValid(date, 'd')) {
					date.add(1, 'd');
					if (tries === 31) {
						throw 'Tried 31 times to find a valid date';
					}
					tries++;
				}
				setValue(date);
			}
			update();
			return picker;
		};

		picker.maxDate = function (maxDate) {
			if (arguments.length === 0) {
				return options.maxDate ? options.maxDate.clone() : options.maxDate;
			}

			if ((typeof maxDate === 'boolean') && maxDate === false) {
				options.maxDate = false;
				update();
				return picker;
			}

			if (typeof maxDate === 'string') {
				if (maxDate === 'now' || maxDate === 'moment') {
					maxDate = getMoment();
				}
			}

			var parsedDate = parseInputDate(maxDate);

			if (!parsedDate.isValid()) {
				throw new TypeError('maxDate() Could not parse date parameter: ' + maxDate);
			}
			if (options.minDate && parsedDate.isBefore(options.minDate)) {
				throw new TypeError('maxDate() date parameter is before options.minDate: ' + parsedDate.format(actualFormat));
			}
			options.maxDate = parsedDate;
			if (options.useCurrent && !options.keepInvalid && date.isAfter(maxDate)) {
				setValue(options.maxDate);
			}
			if (viewDate.isAfter(parsedDate)) {
				viewDate = parsedDate.clone().subtract(options.stepping, 'm');
			}
			update();
			return picker;
		};

		picker.minDate = function (minDate) {
			if (arguments.length === 0) {
				return options.minDate ? options.minDate.clone() : options.minDate;
			}

			if ((typeof minDate === 'boolean') && minDate === false) {
				options.minDate = false;
				update();
				return picker;
			}

			if (typeof minDate === 'string') {
				if (minDate === 'now' || minDate === 'moment') {
					minDate = getMoment();
				}
			}

			var parsedDate = parseInputDate(minDate);

			if (!parsedDate.isValid()) {
				throw new TypeError('minDate() Could not parse date parameter: ' + minDate);
			}
			if (options.maxDate && parsedDate.isAfter(options.maxDate)) {
				throw new TypeError('minDate() date parameter is after options.maxDate: ' + parsedDate.format(actualFormat));
			}
			options.minDate = parsedDate;
			if (options.useCurrent && !options.keepInvalid && date.isBefore(minDate)) {
				setValue(options.minDate);
			}
			if (viewDate.isBefore(parsedDate)) {
				viewDate = parsedDate.clone().add(options.stepping, 'm');
			}
			update();
			return picker;
		};

		picker.defaultDate = function (defaultDate) {
			///<signature helpKeyword="$.fn.datetimepicker.defaultDate">
			///<summary>Returns a moment with the options.defaultDate option configuration or false if not set</summary>
			///<returns type="Moment">date.clone()</returns>
			///</signature>
			///<signature>
			///<summary>Will set the picker's inital date. If a boolean:false value is passed the options.defaultDate parameter is cleared.</summary>
			///<param name="defaultDate" locid="$.fn.datetimepicker.defaultDate_p:defaultDate">Takes a string, Date, moment, boolean:false</param>
			///</signature>
			if (arguments.length === 0) {
				return options.defaultDate ? options.defaultDate.clone() : options.defaultDate;
			}
			if (!defaultDate) {
				options.defaultDate = false;
				return picker;
			}

			if (typeof defaultDate === 'string') {
				if (defaultDate === 'now' || defaultDate === 'moment') {
					defaultDate = getMoment();
				} else {
					defaultDate = getMoment(defaultDate);
				}
			}

			var parsedDate = parseInputDate(defaultDate);
			if (!parsedDate.isValid()) {
				throw new TypeError('defaultDate() Could not parse date parameter: ' + defaultDate);
			}
			if (!isValid(parsedDate)) {
				throw new TypeError('defaultDate() date passed is invalid according to component setup validations');
			}

			options.defaultDate = parsedDate;

			if ((options.defaultDate && options.inline) || input.val().trim() === '') {
				setValue(options.defaultDate);
			}
			return picker;
		};

		picker.locale = function (locale) {
			if (arguments.length === 0) {
				return options.locale;
			}

			if (!moment.localeData(locale)) {
				throw new TypeError('locale() locale ' + locale + ' is not loaded from moment locales!');
			}

			options.locale = locale;
			date.locale(options.locale);
			viewDate.locale(options.locale);

			if (actualFormat) {
				initFormatting(); // reinit formatting
			}
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.stepping = function (stepping) {
			if (arguments.length === 0) {
				return options.stepping;
			}

			stepping = parseInt(stepping, 10);
			if (isNaN(stepping) || stepping < 1) {
				stepping = 1;
			}
			options.stepping = stepping;
			return picker;
		};

		picker.useCurrent = function (useCurrent) {
			var useCurrentOptions = ['year', 'month', 'day', 'hour', 'minute'];
			if (arguments.length === 0) {
				return options.useCurrent;
			}

			if ((typeof useCurrent !== 'boolean') && (typeof useCurrent !== 'string')) {
				throw new TypeError('useCurrent() expects a boolean or string parameter');
			}
			if (typeof useCurrent === 'string' && useCurrentOptions.indexOf(useCurrent.toLowerCase()) === -1) {
				throw new TypeError('useCurrent() expects a string parameter of ' + useCurrentOptions.join(', '));
			}
			options.useCurrent = useCurrent;
			return picker;
		};

		picker.collapse = function (collapse) {
			if (arguments.length === 0) {
				return options.collapse;
			}

			if (typeof collapse !== 'boolean') {
				throw new TypeError('collapse() expects a boolean parameter');
			}
			if (options.collapse === collapse) {
				return picker;
			}
			options.collapse = collapse;
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.icons = function (icons) {
			if (arguments.length === 0) {
				return $.extend({}, options.icons);
			}

			if (!(icons instanceof Object)) {
				throw new TypeError('icons() expects parameter to be an Object');
			}
			$.extend(options.icons, icons);
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.tooltips = function (tooltips) {
			if (arguments.length === 0) {
				return $.extend({}, options.tooltips);
			}

			if (!(tooltips instanceof Object)) {
				throw new TypeError('tooltips() expects parameter to be an Object');
			}
			$.extend(options.tooltips, tooltips);
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.useStrict = function (useStrict) {
			if (arguments.length === 0) {
				return options.useStrict;
			}

			if (typeof useStrict !== 'boolean') {
				throw new TypeError('useStrict() expects a boolean parameter');
			}
			options.useStrict = useStrict;
			return picker;
		};

		picker.sideBySide = function (sideBySide) {
			if (arguments.length === 0) {
				return options.sideBySide;
			}

			if (typeof sideBySide !== 'boolean') {
				throw new TypeError('sideBySide() expects a boolean parameter');
			}
			options.sideBySide = sideBySide;
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.viewMode = function (viewMode) {
			if (arguments.length === 0) {
				return options.viewMode;
			}

			if (typeof viewMode !== 'string') {
				throw new TypeError('viewMode() expects a string parameter');
			}

			if (viewModes.indexOf(viewMode) === -1) {
				throw new TypeError('viewMode() parameter must be one of (' + viewModes.join(', ') + ') value');
			}

			options.viewMode = viewMode;
			currentViewMode = Math.max(viewModes.indexOf(viewMode), minViewModeNumber);

			showMode();
			return picker;
		};

		picker.toolbarPlacement = function (toolbarPlacement) {
			if (arguments.length === 0) {
				return options.toolbarPlacement;
			}

			if (typeof toolbarPlacement !== 'string') {
				throw new TypeError('toolbarPlacement() expects a string parameter');
			}
			if (toolbarPlacements.indexOf(toolbarPlacement) === -1) {
				throw new TypeError('toolbarPlacement() parameter must be one of (' + toolbarPlacements.join(', ') + ') value');
			}
			options.toolbarPlacement = toolbarPlacement;

			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.widgetPositioning = function (widgetPositioning) {
			if (arguments.length === 0) {
				return $.extend({}, options.widgetPositioning);
			}

			if (({}).toString.call(widgetPositioning) !== '[object Object]') {
				throw new TypeError('widgetPositioning() expects an object variable');
			}
			if (widgetPositioning.horizontal) {
				if (typeof widgetPositioning.horizontal !== 'string') {
					throw new TypeError('widgetPositioning() horizontal variable must be a string');
				}
				widgetPositioning.horizontal = widgetPositioning.horizontal.toLowerCase();
				if (horizontalModes.indexOf(widgetPositioning.horizontal) === -1) {
					throw new TypeError('widgetPositioning() expects horizontal parameter to be one of (' + horizontalModes.join(', ') + ')');
				}
				options.widgetPositioning.horizontal = widgetPositioning.horizontal;
			}
			if (widgetPositioning.vertical) {
				if (typeof widgetPositioning.vertical !== 'string') {
					throw new TypeError('widgetPositioning() vertical variable must be a string');
				}
				widgetPositioning.vertical = widgetPositioning.vertical.toLowerCase();
				if (verticalModes.indexOf(widgetPositioning.vertical) === -1) {
					throw new TypeError('widgetPositioning() expects vertical parameter to be one of (' + verticalModes.join(', ') + ')');
				}
				options.widgetPositioning.vertical = widgetPositioning.vertical;
			}
			update();
			return picker;
		};

		picker.calendarWeeks = function (calendarWeeks) {
			if (arguments.length === 0) {
				return options.calendarWeeks;
			}

			if (typeof calendarWeeks !== 'boolean') {
				throw new TypeError('calendarWeeks() expects parameter to be a boolean value');
			}

			options.calendarWeeks = calendarWeeks;
			update();
			return picker;
		};

		picker.showTodayButton = function (showTodayButton) {
			if (arguments.length === 0) {
				return options.showTodayButton;
			}

			if (typeof showTodayButton !== 'boolean') {
				throw new TypeError('showTodayButton() expects a boolean parameter');
			}

			options.showTodayButton = showTodayButton;
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.showClear = function (showClear) {
			if (arguments.length === 0) {
				return options.showClear;
			}

			if (typeof showClear !== 'boolean') {
				throw new TypeError('showClear() expects a boolean parameter');
			}

			options.showClear = showClear;
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.widgetParent = function (widgetParent) {
			if (arguments.length === 0) {
				return options.widgetParent;
			}

			if (typeof widgetParent === 'string') {
				widgetParent = $(widgetParent);
			}

			if (widgetParent !== null && (typeof widgetParent !== 'string' && !(widgetParent instanceof $))) {
				throw new TypeError('widgetParent() expects a string or a jQuery object parameter');
			}

			options.widgetParent = widgetParent;
			if (widget) {
				hide();
				show();
			}
			return picker;
		};

		picker.keepOpen = function (keepOpen) {
			if (arguments.length === 0) {
				return options.keepOpen;
			}

			if (typeof keepOpen !== 'boolean') {
				throw new TypeError('keepOpen() expects a boolean parameter');
			}

			options.keepOpen = keepOpen;
			return picker;
		};

		picker.focusOnShow = function (focusOnShow) {
			if (arguments.length === 0) {
				return options.focusOnShow;
			}

			if (typeof focusOnShow !== 'boolean') {
				throw new TypeError('focusOnShow() expects a boolean parameter');
			}

			options.focusOnShow = focusOnShow;
			return picker;
		};

		picker.inline = function (inline) {
			if (arguments.length === 0) {
				return options.inline;
			}

			if (typeof inline !== 'boolean') {
				throw new TypeError('inline() expects a boolean parameter');
			}

			options.inline = inline;
			return picker;
		};

		picker.clear = function () {
			clear();
			return picker;
		};

		picker.keyBinds = function (keyBinds) {
			if (arguments.length === 0) {
				return options.keyBinds;
			}

			options.keyBinds = keyBinds;
			return picker;
		};

		picker.getMoment = function (d) {
			return getMoment(d);
		};

		picker.debug = function (debug) {
			if (typeof debug !== 'boolean') {
				throw new TypeError('debug() expects a boolean parameter');
			}

			options.debug = debug;
			return picker;
		};

		picker.allowInputToggle = function (allowInputToggle) {
			if (arguments.length === 0) {
				return options.allowInputToggle;
			}

			if (typeof allowInputToggle !== 'boolean') {
				throw new TypeError('allowInputToggle() expects a boolean parameter');
			}

			options.allowInputToggle = allowInputToggle;
			return picker;
		};

		picker.showClose = function (showClose) {
			if (arguments.length === 0) {
				return options.showClose;
			}

			if (typeof showClose !== 'boolean') {
				throw new TypeError('showClose() expects a boolean parameter');
			}

			options.showClose = showClose;
			return picker;
		};

		picker.keepInvalid = function (keepInvalid) {
			if (arguments.length === 0) {
				return options.keepInvalid;
			}

			if (typeof keepInvalid !== 'boolean') {
				throw new TypeError('keepInvalid() expects a boolean parameter');
			}
			options.keepInvalid = keepInvalid;
			return picker;
		};

		picker.datepickerInput = function (datepickerInput) {
			if (arguments.length === 0) {
				return options.datepickerInput;
			}

			if (typeof datepickerInput !== 'string') {
				throw new TypeError('datepickerInput() expects a string parameter');
			}

			options.datepickerInput = datepickerInput;
			return picker;
		};

		picker.parseInputDate = function (parseInputDate) {
			if (arguments.length === 0) {
				return options.parseInputDate;
			}

			if (typeof parseInputDate !== 'function') {
				throw new TypeError('parseInputDate() sholud be as function');
			}

			options.parseInputDate = parseInputDate;

			return picker;
		};

		picker.disabledTimeIntervals = function (disabledTimeIntervals) {
			///<signature helpKeyword="$.fn.datetimepicker.disabledTimeIntervals">
			///<summary>Returns an array with the currently set disabled dates on the component.</summary>
			///<returns type="array">options.disabledTimeIntervals</returns>
			///</signature>
			///<signature>
			///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
			///options.enabledDates if such exist.</summary>
			///<param name="dates" locid="$.fn.datetimepicker.disabledTimeIntervals_p:dates">Takes an [ string or Date or moment ] of values and allows the user to select only from those days.</param>
			///</signature>
			if (arguments.length === 0) {
				return (options.disabledTimeIntervals ? $.extend({}, options.disabledTimeIntervals) : options.disabledTimeIntervals);
			}

			if (!disabledTimeIntervals) {
				options.disabledTimeIntervals = false;
				update();
				return picker;
			}
			if (!(disabledTimeIntervals instanceof Array)) {
				throw new TypeError('disabledTimeIntervals() expects an array parameter');
			}
			options.disabledTimeIntervals = disabledTimeIntervals;
			update();
			return picker;
		};

		picker.disabledHours = function (hours) {
			///<signature helpKeyword="$.fn.datetimepicker.disabledHours">
			///<summary>Returns an array with the currently set disabled hours on the component.</summary>
			///<returns type="array">options.disabledHours</returns>
			///</signature>
			///<signature>
			///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of
			///options.enabledHours if such exist.</summary>
			///<param name="hours" locid="$.fn.datetimepicker.disabledHours_p:hours">Takes an [ int ] of values and disallows the user to select only from those hours.</param>
			///</signature>
			if (arguments.length === 0) {
				return (options.disabledHours ? $.extend({}, options.disabledHours) : options.disabledHours);
			}

			if (!hours) {
				options.disabledHours = false;
				update();
				return picker;
			}
			if (!(hours instanceof Array)) {
				throw new TypeError('disabledHours() expects an array parameter');
			}
			options.disabledHours = indexGivenHours(hours);
			options.enabledHours = false;
			if (options.useCurrent && !options.keepInvalid) {
				var tries = 0;
				while (!isValid(date, 'h')) {
					date.add(1, 'h');
					if (tries === 24) {
						throw 'Tried 24 times to find a valid date';
					}
					tries++;
				}
				setValue(date);
			}
			update();
			return picker;
		};

		picker.enabledHours = function (hours) {
			///<signature helpKeyword="$.fn.datetimepicker.enabledHours">
			///<summary>Returns an array with the currently set enabled hours on the component.</summary>
			///<returns type="array">options.enabledHours</returns>
			///</signature>
			///<signature>
			///<summary>Setting this takes precedence over options.minDate, options.maxDate configuration. Also calling this function removes the configuration of options.disabledHours if such exist.</summary>
			///<param name="hours" locid="$.fn.datetimepicker.enabledHours_p:hours">Takes an [ int ] of values and allows the user to select only from those hours.</param>
			///</signature>
			if (arguments.length === 0) {
				return (options.enabledHours ? $.extend({}, options.enabledHours) : options.enabledHours);
			}

			if (!hours) {
				options.enabledHours = false;
				update();
				return picker;
			}
			if (!(hours instanceof Array)) {
				throw new TypeError('enabledHours() expects an array parameter');
			}
			options.enabledHours = indexGivenHours(hours);
			options.disabledHours = false;
			if (options.useCurrent && !options.keepInvalid) {
				var tries = 0;
				while (!isValid(date, 'h')) {
					date.add(1, 'h');
					if (tries === 24) {
						throw 'Tried 24 times to find a valid date';
					}
					tries++;
				}
				setValue(date);
			}
			update();
			return picker;
		};
		/**
		 * Returns the component's model current viewDate, a moment object or null if not set. Passing a null value unsets the components model current moment. Parsing of the newDate parameter is made using moment library with the options.format and options.useStrict components configuration.
		 * @param {Takes string, viewDate, moment, null parameter.} newDate
		 * @returns {viewDate.clone()}
		 */
		picker.viewDate = function (newDate) {
			if (arguments.length === 0) {
				return viewDate.clone();
			}

			if (!newDate) {
				viewDate = date.clone();
				return picker;
			}

			if (typeof newDate !== 'string' && !moment.isMoment(newDate) && !(newDate instanceof Date)) {
				throw new TypeError('viewDate() parameter must be one of [string, moment or Date]');
			}

			viewDate = parseInputDate(newDate);
			viewUpdate();
			return picker;
		};

		// initializing element and component attributes
		if (element.is('input')) {
			input = element;
		} else {
			input = element.find(options.datepickerInput);
			if (input.length === 0) {
				input = element.find('input');
			} else if (!input.is('input')) {
				throw new Error('CSS class "' + options.datepickerInput + '" cannot be applied to non input element');
			}
		}

		if (element.hasClass('input-group')) {
			// in case there is more then one 'input-group-addon' Issue #48
			if (element.find('.datepickerbutton').length === 0) {
				component = element.find('.input-group-addon');
			} else {
				component = element.find('.datepickerbutton');
			}
		}

		if (!options.inline && !input.is('input')) {
			throw new Error('Could not initialize DateTimePicker without an input element');
		}

		// Set defaults for date here now instead of in var declaration
		date = getMoment();
		viewDate = date.clone();

		$.extend(true, options, dataToOptions());

		picker.options(options);

		initFormatting();

		attachDatePickerElementEvents();

		if (input.prop('disabled')) {
			picker.disable();
		}
		if (input.is('input') && input.val().trim().length !== 0) {
			setValue(parseInputDate(input.val().trim()));
		}
		else if (options.defaultDate && input.attr('placeholder') === undefined) {
			setValue(options.defaultDate);
		}
		if (options.inline) {
			show();
		}
		return picker;
	};

	/********************************************************************************
	 *
	 * jQuery plugin constructor and defaults object
	 *
	 ********************************************************************************/

	/**
	 * See (http://jquery.com/).
	 * @name jQuery
	 * @class
	 * See the jQuery Library  (http://jquery.com/) for full details.  This just
	 * documents the function and classes that are added to jQuery by this plug-in.
	 */
	/**
	 * See (http://jquery.com/)
	 * @name fn
	 * @class
	 * See the jQuery Library  (http://jquery.com/) for full details.  This just
	 * documents the function and classes that are added to jQuery by this plug-in.
	 * @memberOf jQuery
	 */
	/**
	 * Show comments
	 * @class datetimepicker
	 * @memberOf jQuery.fn
	 */
	$.fn.datetimepicker = function (options) {
		options = options || {};

		var args = Array.prototype.slice.call(arguments, 1),
			isInstance = true,
			thisMethods = ['destroy', 'hide', 'show', 'toggle'],
			returnValue;

		if (typeof options === 'object') {
			return this.each(function () {
				var $this = $(this),
					_options;
				if (!$this.data('DateTimePicker')) {
					// create a private copy of the defaults object
					_options = $.extend(true, {}, $.fn.datetimepicker.defaults, options);
					$this.data('DateTimePicker', dateTimePicker($this, _options));
				}
			});
		} else if (typeof options === 'string') {
			this.each(function () {
				var $this = $(this),
					instance = $this.data('DateTimePicker');
				if (!instance) {
					throw new Error('bootstrap-datetimepicker("' + options + '") method was called on an element that is not using DateTimePicker');
				}

				returnValue = instance[options].apply(instance, args);
				isInstance = returnValue === instance;
			});

			if (isInstance || $.inArray(options, thisMethods) > -1) {
				return this;
			}

			return returnValue;
		}

		throw new TypeError('Invalid arguments for DateTimePicker: ' + options);
	};

	$.fn.datetimepicker.defaults = {
		timeZone: '',
		format: false,
		dayViewHeaderFormat: 'MMMM YYYY',
		extraFormats: false,
		stepping: 1,
		minDate: false,
		maxDate: false,
		useCurrent: true,
		collapse: true,
		locale: moment.locale(),
		defaultDate: false,
		disabledDates: false,
		enabledDates: false,
		icons: {
			time: 'glyphicon glyphicon-time',
			date: 'glyphicon glyphicon-calendar',
			up: 'glyphicon glyphicon-chevron-up',
			down: 'glyphicon glyphicon-chevron-down',
			previous: 'glyphicon glyphicon-chevron-left',
			next: 'glyphicon glyphicon-chevron-right',
			today: 'glyphicon glyphicon-screenshot',
			clear: 'glyphicon glyphicon-trash',
			close: 'glyphicon glyphicon-remove'
		},
		tooltips: {
			today: 'Go to today',
			clear: 'Clear selection',
			close: 'Close the picker',
			selectMonth: 'Select Month',
			prevMonth: 'Previous Month',
			nextMonth: 'Next Month',
			selectYear: 'Select Year',
			prevYear: 'Previous Year',
			nextYear: 'Next Year',
			selectDecade: 'Select Decade',
			prevDecade: 'Previous Decade',
			nextDecade: 'Next Decade',
			prevCentury: 'Previous Century',
			nextCentury: 'Next Century',
			pickHour: 'Pick Hour',
			incrementHour: 'Increment Hour',
			decrementHour: 'Decrement Hour',
			pickMinute: 'Pick Minute',
			incrementMinute: 'Increment Minute',
			decrementMinute: 'Decrement Minute',
			pickSecond: 'Pick Second',
			incrementSecond: 'Increment Second',
			decrementSecond: 'Decrement Second',
			togglePeriod: 'Toggle Period',
			selectTime: 'Select Time'
		},
		useStrict: false,
		sideBySide: false,
		daysOfWeekDisabled: false,
		calendarWeeks: false,
		viewMode: 'days',
		toolbarPlacement: 'default',
		showTodayButton: false,
		showClear: false,
		showClose: false,
		widgetPositioning: {
			horizontal: 'auto',
			vertical: 'auto'
		},
		widgetParent: null,
		ignoreReadonly: false,
		keepOpen: false,
		focusOnShow: true,
		inline: false,
		keepInvalid: false,
		datepickerInput: '.datepickerinput',
		keyBinds: {
			up: function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().subtract(7, 'd'));
				} else {
					this.date(d.clone().add(this.stepping(), 'm'));
				}
			},
			down: function (widget) {
				if (!widget) {
					this.show();
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().add(7, 'd'));
				} else {
					this.date(d.clone().subtract(this.stepping(), 'm'));
				}
			},
			'control up': function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().subtract(1, 'y'));
				} else {
					this.date(d.clone().add(1, 'h'));
				}
			},
			'control down': function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().add(1, 'y'));
				} else {
					this.date(d.clone().subtract(1, 'h'));
				}
			},
			left: function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().subtract(1, 'd'));
				}
			},
			right: function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().add(1, 'd'));
				}
			},
			pageUp: function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().subtract(1, 'M'));
				}
			},
			pageDown: function (widget) {
				if (!widget) {
					return;
				}
				var d = this.date() || this.getMoment();
				if (widget.find('.datepicker').is(':visible')) {
					this.date(d.clone().add(1, 'M'));
				}
			},
			enter: function () {
				this.hide();
			},
			escape: function () {
				this.hide();
			},
			//tab: function (widget) { //this break the flow of the form. disabling for now
			//    var toggle = widget.find('.picker-switch a[data-action="togglePicker"]');
			//    if(toggle.length > 0) toggle.click();
			//},
			'control space': function (widget) {
				if (!widget) {
					return;
				}
				if (widget.find('.timepicker').is(':visible')) {
					widget.find('.btn[data-action="togglePeriod"]').click();
				}
			},
			t: function () {
				this.date(this.getMoment());
			},
			'delete': function () {
				this.clear();
			}
		},
		debug: false,
		allowInputToggle: false,
		disabledTimeIntervals: false,
		disabledHours: false,
		enabledHours: false,
		viewDate: false
	};

	return $.fn.datetimepicker;
}));

/***/ },

/***/ "../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min.js"
/*!********************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min.js ***!
  \********************************************************************/
(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*! pace 1.0.2 */
(function(){var a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X=[].slice,Y={}.hasOwnProperty,Z=function(a,b){function c(){this.constructor=a}for(var d in b)Y.call(b,d)&&(a[d]=b[d]);return c.prototype=b.prototype,a.prototype=new c,a.__super__=b.prototype,a},$=[].indexOf||function(a){for(var b=0,c=this.length;c>b;b++)if(b in this&&this[b]===a)return b;return-1};for(u={catchupTime:100,initialRate:.03,minTime:250,ghostTime:100,maxProgressPerFrame:20,easeFactor:1.25,startOnPageLoad:!0,restartOnPushState:!0,restartOnRequestAfter:500,target:"body",elements:{checkInterval:100,selectors:["body"]},eventLag:{minSamples:10,sampleCount:3,lagThreshold:3},ajax:{trackMethods:["GET"],trackWebSockets:!0,ignoreURLs:[]}},C=function(){var a;return null!=(a="undefined"!=typeof performance&&null!==performance&&"function"==typeof performance.now?performance.now():void 0)?a:+new Date},E=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame,t=window.cancelAnimationFrame||window.mozCancelAnimationFrame,null==E&&(E=function(a){return setTimeout(a,50)},t=function(a){return clearTimeout(a)}),G=function(a){var b,c;return b=C(),(c=function(){var d;return d=C()-b,d>=33?(b=C(),a(d,function(){return E(c)})):setTimeout(c,33-d)})()},F=function(){var a,b,c;return c=arguments[0],b=arguments[1],a=3<=arguments.length?X.call(arguments,2):[],"function"==typeof c[b]?c[b].apply(c,a):c[b]},v=function(){var a,b,c,d,e,f,g;for(b=arguments[0],d=2<=arguments.length?X.call(arguments,1):[],f=0,g=d.length;g>f;f++)if(c=d[f])for(a in c)Y.call(c,a)&&(e=c[a],null!=b[a]&&"object"==typeof b[a]&&null!=e&&"object"==typeof e?v(b[a],e):b[a]=e);return b},q=function(a){var b,c,d,e,f;for(c=b=0,e=0,f=a.length;f>e;e++)d=a[e],c+=Math.abs(d),b++;return c/b},x=function(a,b){var c,d,e;if(null==a&&(a="options"),null==b&&(b=!0),e=document.querySelector("[data-pace-"+a+"]")){if(c=e.getAttribute("data-pace-"+a),!b)return c;try{return JSON.parse(c)}catch(f){return d=f,"undefined"!=typeof console&&null!==console?console.error("Error parsing inline pace options",d):void 0}}},g=function(){function a(){}return a.prototype.on=function(a,b,c,d){var e;return null==d&&(d=!1),null==this.bindings&&(this.bindings={}),null==(e=this.bindings)[a]&&(e[a]=[]),this.bindings[a].push({handler:b,ctx:c,once:d})},a.prototype.once=function(a,b,c){return this.on(a,b,c,!0)},a.prototype.off=function(a,b){var c,d,e;if(null!=(null!=(d=this.bindings)?d[a]:void 0)){if(null==b)return delete this.bindings[a];for(c=0,e=[];c<this.bindings[a].length;)e.push(this.bindings[a][c].handler===b?this.bindings[a].splice(c,1):c++);return e}},a.prototype.trigger=function(){var a,b,c,d,e,f,g,h,i;if(c=arguments[0],a=2<=arguments.length?X.call(arguments,1):[],null!=(g=this.bindings)?g[c]:void 0){for(e=0,i=[];e<this.bindings[c].length;)h=this.bindings[c][e],d=h.handler,b=h.ctx,f=h.once,d.apply(null!=b?b:this,a),i.push(f?this.bindings[c].splice(e,1):e++);return i}},a}(),j=window.Pace||{},window.Pace=j,v(j,g.prototype),D=j.options=v({},u,window.paceOptions,x()),U=["ajax","document","eventLag","elements"],Q=0,S=U.length;S>Q;Q++)K=U[Q],D[K]===!0&&(D[K]=u[K]);i=function(a){function b(){return V=b.__super__.constructor.apply(this,arguments)}return Z(b,a),b}(Error),b=function(){function a(){this.progress=0}return a.prototype.getElement=function(){var a;if(null==this.el){if(a=document.querySelector(D.target),!a)throw new i;this.el=document.createElement("div"),this.el.className="pace pace-active",document.body.className=document.body.className.replace(/pace-done/g,""),document.body.className+=" pace-running",this.el.innerHTML='<div class="pace-progress">\n  <div class="pace-progress-inner"></div>\n</div>\n<div class="pace-activity"></div>',null!=a.firstChild?a.insertBefore(this.el,a.firstChild):a.appendChild(this.el)}return this.el},a.prototype.finish=function(){var a;return a=this.getElement(),a.className=a.className.replace("pace-active",""),a.className+=" pace-inactive",document.body.className=document.body.className.replace("pace-running",""),document.body.className+=" pace-done"},a.prototype.update=function(a){return this.progress=a,this.render()},a.prototype.destroy=function(){try{this.getElement().parentNode.removeChild(this.getElement())}catch(a){i=a}return this.el=void 0},a.prototype.render=function(){var a,b,c,d,e,f,g;if(null==document.querySelector(D.target))return!1;for(a=this.getElement(),d="translate3d("+this.progress+"%, 0, 0)",g=["webkitTransform","msTransform","transform"],e=0,f=g.length;f>e;e++)b=g[e],a.children[0].style[b]=d;return(!this.lastRenderedProgress||this.lastRenderedProgress|0!==this.progress|0)&&(a.children[0].setAttribute("data-progress-text",""+(0|this.progress)+"%"),this.progress>=100?c="99":(c=this.progress<10?"0":"",c+=0|this.progress),a.children[0].setAttribute("data-progress",""+c)),this.lastRenderedProgress=this.progress},a.prototype.done=function(){return this.progress>=100},a}(),h=function(){function a(){this.bindings={}}return a.prototype.trigger=function(a,b){var c,d,e,f,g;if(null!=this.bindings[a]){for(f=this.bindings[a],g=[],d=0,e=f.length;e>d;d++)c=f[d],g.push(c.call(this,b));return g}},a.prototype.on=function(a,b){var c;return null==(c=this.bindings)[a]&&(c[a]=[]),this.bindings[a].push(b)},a}(),P=window.XMLHttpRequest,O=window.XDomainRequest,N=window.WebSocket,w=function(a,b){var c,d,e;e=[];for(d in b.prototype)try{e.push(null==a[d]&&"function"!=typeof b[d]?"function"==typeof Object.defineProperty?Object.defineProperty(a,d,{get:function(){return b.prototype[d]},configurable:!0,enumerable:!0}):a[d]=b.prototype[d]:void 0)}catch(f){c=f}return e},A=[],j.ignore=function(){var a,b,c;return b=arguments[0],a=2<=arguments.length?X.call(arguments,1):[],A.unshift("ignore"),c=b.apply(null,a),A.shift(),c},j.track=function(){var a,b,c;return b=arguments[0],a=2<=arguments.length?X.call(arguments,1):[],A.unshift("track"),c=b.apply(null,a),A.shift(),c},J=function(a){var b;if(null==a&&(a="GET"),"track"===A[0])return"force";if(!A.length&&D.ajax){if("socket"===a&&D.ajax.trackWebSockets)return!0;if(b=a.toUpperCase(),$.call(D.ajax.trackMethods,b)>=0)return!0}return!1},k=function(a){function b(){var a,c=this;b.__super__.constructor.apply(this,arguments),a=function(a){var b;return b=a.open,a.open=function(d,e){return J(d)&&c.trigger("request",{type:d,url:e,request:a}),b.apply(a,arguments)}},window.XMLHttpRequest=function(b){var c;return c=new P(b),a(c),c};try{w(window.XMLHttpRequest,P)}catch(d){}if(null!=O){window.XDomainRequest=function(){var b;return b=new O,a(b),b};try{w(window.XDomainRequest,O)}catch(d){}}if(null!=N&&D.ajax.trackWebSockets){window.WebSocket=function(a,b){var d;return d=null!=b?new N(a,b):new N(a),J("socket")&&c.trigger("request",{type:"socket",url:a,protocols:b,request:d}),d};try{w(window.WebSocket,N)}catch(d){}}}return Z(b,a),b}(h),R=null,y=function(){return null==R&&(R=new k),R},I=function(a){var b,c,d,e;for(e=D.ajax.ignoreURLs,c=0,d=e.length;d>c;c++)if(b=e[c],"string"==typeof b){if(-1!==a.indexOf(b))return!0}else if(b.test(a))return!0;return!1},y().on("request",function(b){var c,d,e,f,g;return f=b.type,e=b.request,g=b.url,I(g)?void 0:j.running||D.restartOnRequestAfter===!1&&"force"!==J(f)?void 0:(d=arguments,c=D.restartOnRequestAfter||0,"boolean"==typeof c&&(c=0),setTimeout(function(){var b,c,g,h,i,k;if(b="socket"===f?e.readyState<2:0<(h=e.readyState)&&4>h){for(j.restart(),i=j.sources,k=[],c=0,g=i.length;g>c;c++){if(K=i[c],K instanceof a){K.watch.apply(K,d);break}k.push(void 0)}return k}},c))}),a=function(){function a(){var a=this;this.elements=[],y().on("request",function(){return a.watch.apply(a,arguments)})}return a.prototype.watch=function(a){var b,c,d,e;return d=a.type,b=a.request,e=a.url,I(e)?void 0:(c="socket"===d?new n(b):new o(b),this.elements.push(c))},a}(),o=function(){function a(a){var b,c,d,e,f,g,h=this;if(this.progress=0,null!=window.ProgressEvent)for(c=null,a.addEventListener("progress",function(a){return h.progress=a.lengthComputable?100*a.loaded/a.total:h.progress+(100-h.progress)/2},!1),g=["load","abort","timeout","error"],d=0,e=g.length;e>d;d++)b=g[d],a.addEventListener(b,function(){return h.progress=100},!1);else f=a.onreadystatechange,a.onreadystatechange=function(){var b;return 0===(b=a.readyState)||4===b?h.progress=100:3===a.readyState&&(h.progress=50),"function"==typeof f?f.apply(null,arguments):void 0}}return a}(),n=function(){function a(a){var b,c,d,e,f=this;for(this.progress=0,e=["error","open"],c=0,d=e.length;d>c;c++)b=e[c],a.addEventListener(b,function(){return f.progress=100},!1)}return a}(),d=function(){function a(a){var b,c,d,f;for(null==a&&(a={}),this.elements=[],null==a.selectors&&(a.selectors=[]),f=a.selectors,c=0,d=f.length;d>c;c++)b=f[c],this.elements.push(new e(b))}return a}(),e=function(){function a(a){this.selector=a,this.progress=0,this.check()}return a.prototype.check=function(){var a=this;return document.querySelector(this.selector)?this.done():setTimeout(function(){return a.check()},D.elements.checkInterval)},a.prototype.done=function(){return this.progress=100},a}(),c=function(){function a(){var a,b,c=this;this.progress=null!=(b=this.states[document.readyState])?b:100,a=document.onreadystatechange,document.onreadystatechange=function(){return null!=c.states[document.readyState]&&(c.progress=c.states[document.readyState]),"function"==typeof a?a.apply(null,arguments):void 0}}return a.prototype.states={loading:0,interactive:50,complete:100},a}(),f=function(){function a(){var a,b,c,d,e,f=this;this.progress=0,a=0,e=[],d=0,c=C(),b=setInterval(function(){var g;return g=C()-c-50,c=C(),e.push(g),e.length>D.eventLag.sampleCount&&e.shift(),a=q(e),++d>=D.eventLag.minSamples&&a<D.eventLag.lagThreshold?(f.progress=100,clearInterval(b)):f.progress=100*(3/(a+3))},50)}return a}(),m=function(){function a(a){this.source=a,this.last=this.sinceLastUpdate=0,this.rate=D.initialRate,this.catchup=0,this.progress=this.lastProgress=0,null!=this.source&&(this.progress=F(this.source,"progress"))}return a.prototype.tick=function(a,b){var c;return null==b&&(b=F(this.source,"progress")),b>=100&&(this.done=!0),b===this.last?this.sinceLastUpdate+=a:(this.sinceLastUpdate&&(this.rate=(b-this.last)/this.sinceLastUpdate),this.catchup=(b-this.progress)/D.catchupTime,this.sinceLastUpdate=0,this.last=b),b>this.progress&&(this.progress+=this.catchup*a),c=1-Math.pow(this.progress/100,D.easeFactor),this.progress+=c*this.rate*a,this.progress=Math.min(this.lastProgress+D.maxProgressPerFrame,this.progress),this.progress=Math.max(0,this.progress),this.progress=Math.min(100,this.progress),this.lastProgress=this.progress,this.progress},a}(),L=null,H=null,r=null,M=null,p=null,s=null,j.running=!1,z=function(){return D.restartOnPushState?j.restart():void 0},null!=window.history.pushState&&(T=window.history.pushState,window.history.pushState=function(){return z(),T.apply(window.history,arguments)}),null!=window.history.replaceState&&(W=window.history.replaceState,window.history.replaceState=function(){return z(),W.apply(window.history,arguments)}),l={ajax:a,elements:d,document:c,eventLag:f},(B=function(){var a,c,d,e,f,g,h,i;for(j.sources=L=[],g=["ajax","elements","document","eventLag"],c=0,e=g.length;e>c;c++)a=g[c],D[a]!==!1&&L.push(new l[a](D[a]));for(i=null!=(h=D.extraSources)?h:[],d=0,f=i.length;f>d;d++)K=i[d],L.push(new K(D));return j.bar=r=new b,H=[],M=new m})(),j.stop=function(){return j.trigger("stop"),j.running=!1,r.destroy(),s=!0,null!=p&&("function"==typeof t&&t(p),p=null),B()},j.restart=function(){return j.trigger("restart"),j.stop(),j.start()},j.go=function(){var a;return j.running=!0,r.render(),a=C(),s=!1,p=G(function(b,c){var d,e,f,g,h,i,k,l,n,o,p,q,t,u,v,w;for(l=100-r.progress,e=p=0,f=!0,i=q=0,u=L.length;u>q;i=++q)for(K=L[i],o=null!=H[i]?H[i]:H[i]=[],h=null!=(w=K.elements)?w:[K],k=t=0,v=h.length;v>t;k=++t)g=h[k],n=null!=o[k]?o[k]:o[k]=new m(g),f&=n.done,n.done||(e++,p+=n.tick(b));return d=p/e,r.update(M.tick(b,d)),r.done()||f||s?(r.update(100),j.trigger("done"),setTimeout(function(){return r.finish(),j.running=!1,j.trigger("hide")},Math.max(D.ghostTime,Math.max(D.minTime-(C()-a),0)))):c()})},j.start=function(a){v(D,a),j.running=!0;try{r.render()}catch(b){i=b}return document.querySelector(".pace")?(j.trigger("start"),j.go()):setTimeout(j.start,50)}, true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! pace */ "./WebContent/js/libs/pace-shim.js")], __WEBPACK_AMD_DEFINE_RESULT__ = (function(){return j}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0}).call(this);

/***/ },

/***/ "../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min.js"
/*!***************************************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min.js ***!
  \***************************************************************************************/
() {

/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.3.6
 *
 */
(function(e){e.fn.extend({slimScroll:function(g){var a=e.extend({width:"auto",height:"250px",size:"7px",color:"#000",position:"right",distance:"1px",start:"top",opacity:.4,alwaysVisible:!1,disableFadeOut:!1,railVisible:!1,railColor:"#333",railOpacity:.2,railDraggable:!0,railClass:"slimScrollRail",barClass:"slimScrollBar",wrapperClass:"slimScrollDiv",allowPageScroll:!1,wheelStep:20,touchScrollStep:200,borderRadius:"7px",railBorderRadius:"7px"},g);this.each(function(){function v(d){if(r){d=d||window.event;
    var c=0;d.wheelDelta&&(c=-d.wheelDelta/120);d.detail&&(c=d.detail/3);e(d.target||d.srcTarget||d.srcElement).closest("."+a.wrapperClass).is(b.parent())&&m(c,!0);d.preventDefault&&!k&&d.preventDefault();k||(d.returnValue=!1)}}function m(d,e,g){k=!1;var f=d,h=b.outerHeight()-c.outerHeight();e&&(f=parseInt(c.css("top"))+d*parseInt(a.wheelStep)/100*c.outerHeight(),f=Math.min(Math.max(f,0),h),f=0<d?Math.ceil(f):Math.floor(f),c.css({top:f+"px"}));l=parseInt(c.css("top"))/(b.outerHeight()-c.outerHeight());
    f=l*(b[0].scrollHeight-b.outerHeight());g&&(f=d,d=f/b[0].scrollHeight*b.outerHeight(),d=Math.min(Math.max(d,0),h),c.css({top:d+"px"}));b.scrollTop(f);b.trigger("slimscrolling",~~f);w();p()}function x(){u=Math.max(b.outerHeight()/b[0].scrollHeight*b.outerHeight(),30);c.css({height:u+"px"});var a=u==b.outerHeight()?"none":"block";c.css({display:a})}function w(){x();clearTimeout(B);l==~~l?(k=a.allowPageScroll,C!=l&&b.trigger("slimscroll",0==~~l?"top":"bottom")):k=!1;C=l;u>=b.outerHeight()?k=!0:(c.stop(!0,
    !0).fadeIn("fast"),a.railVisible&&h.stop(!0,!0).fadeIn("fast"))}function p(){a.alwaysVisible||(B=setTimeout(function(){a.disableFadeOut&&r||y||z||(c.fadeOut("slow"),h.fadeOut("slow"))},1E3))}var r,y,z,B,A,u,l,C,k=!1,b=e(this);if(b.parent().hasClass(a.wrapperClass)){var n=b.scrollTop(),c=b.closest("."+a.barClass),h=b.closest("."+a.railClass);x();if(e.isPlainObject(g)){if("height"in g&&"auto"==g.height){b.parent().css("height","auto");b.css("height","auto");var q=b.parent().parent().height();b.parent().css("height",
    q);b.css("height",q)}if("scrollTo"in g)n=parseInt(a.scrollTo);else if("scrollBy"in g)n+=parseInt(a.scrollBy);else if("destroy"in g){c.remove();h.remove();b.unwrap();return}m(n,!1,!0)}}else if(!(e.isPlainObject(g)&&"destroy"in g)){a.height="auto"==a.height?b.parent().height():a.height;n=e("<div></div>").addClass(a.wrapperClass).css({position:"relative",overflow:"hidden",width:a.width,height:a.height});b.css({overflow:"hidden",width:a.width,height:a.height});var h=e("<div></div>").addClass(a.railClass).css({width:a.size,
    height:"100%",position:"absolute",top:0,display:a.alwaysVisible&&a.railVisible?"block":"none","border-radius":a.railBorderRadius,background:a.railColor,opacity:a.railOpacity,zIndex:90}),c=e("<div></div>").addClass(a.barClass).css({background:a.color,width:a.size,position:"absolute",top:0,opacity:a.opacity,display:a.alwaysVisible?"block":"none","border-radius":a.borderRadius,BorderRadius:a.borderRadius,MozBorderRadius:a.borderRadius,WebkitBorderRadius:a.borderRadius,zIndex:99}),q="right"==a.position?
{right:a.distance}:{left:a.distance};h.css(q);c.css(q);b.wrap(n);b.parent().append(c);b.parent().append(h);a.railDraggable&&c.bind("mousedown",function(a){var b=e(document);z=!0;t=parseFloat(c.css("top"));pageY=a.pageY;b.bind("mousemove.slimscroll",function(a){currTop=t+a.pageY-pageY;c.css("top",currTop);m(0,c.position().top,!1)});b.bind("mouseup.slimscroll",function(a){z=!1;p();b.unbind(".slimscroll")});return!1}).bind("selectstart.slimscroll",function(a){a.stopPropagation();a.preventDefault();return!1});
    h.hover(function(){w()},function(){p()});c.hover(function(){y=!0},function(){y=!1});b.hover(function(){r=!0;w();p()},function(){r=!1;p()});b.bind("touchstart",function(a,b){a.originalEvent.touches.length&&(A=a.originalEvent.touches[0].pageY)});b.bind("touchmove",function(b){k||b.originalEvent.preventDefault();b.originalEvent.touches.length&&(m((A-b.originalEvent.touches[0].pageY)/a.touchScrollStep,!0),A=b.originalEvent.touches[0].pageY)});x();"bottom"===a.start?(c.css({top:b.outerHeight()-c.outerHeight()}),
        m(0,!0)):"top"!==a.start&&(m(e(a.start).position().top,null,!0),a.alwaysVisible||c.hide());window.addEventListener?(this.addEventListener("DOMMouseScroll",v,!1),this.addEventListener("mousewheel",v,!1)):document.attachEvent("onmousewheel",v)}});return this}});e.fn.extend({slimscroll:e.fn.slimScroll})})(jQuery);

/***/ },

/***/ "./WebContent/js/app/surveyManagement.js"
/*!***********************************************!*\
  !*** ./WebContent/js/app/surveyManagement.js ***!
  \***********************************************/
(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
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

!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! jquery */ "jquery"),__webpack_require__(/*! localise */ "./WebContent/js/libs/localise-shim.js"), __webpack_require__(/*! common */ "./WebContent/js/libs/common-shim.js"), __webpack_require__(/*! globals */ "./WebContent/js/libs/globals-shim.js"),__webpack_require__(/*! moment */ "moment"), __webpack_require__(/*! datetimepicker */ "./WebContent/js/libs/datetimepicker-shim.js")], __WEBPACK_AMD_DEFINE_RESULT__ = (function($, lang, common, globals, moment) {

        var	gSurveys,		// Only in this java script file
            gControlDelete,
            gControlRestore,
            gShowDeleted = false,
            gShowBlocked = true,
            gSelectedTemplateId,            // survey id of current template
            gSelectedTemplateIdent,         // survey ident of current template
            gSelectedTemplateName,
            gRemote_host,
            gRemote_user,
            gReplace,
            gSurveyGroups,
            gLinkSurvey;

        $(document).ready(function() {

            setTheme();
	        setupUserProfile(true);
            localise.setlang();		// Localise HTML

            /*
             * Add response to custom menus id they are enabled
             */
            $('#customEntries').click(function() {
                checkLoggedIn(function() {
                    var url = "/customApi/bps/usage";
                    url += addCacheBuster(url);
                    window.location.href = url;
                })
            });
            $('#customOffences').click(function() {
                checkLoggedIn(function() {
                    var url = "/customApi/bps/offences/pivot";
                    url += addCacheBuster(url);
                    window.location.href = url;
                })
            });

            /*
             * Add functionality to control buttons
             */
            $('#delete_survey').click(function () {
                if(!$(this).hasClass("disabled")) {
                    surveyDelete();
                }
            });
            $('#erase_survey').click(function () {
                if(!$(this).hasClass("disabled")) {
                    surveyErase();
                }
            });
            $('#un_delete_survey').click(function () {
                if(!$(this).hasClass("disabled")) {
                    surveyUnDelete();
                }
            });
            $('#show_deleted').click(function() {
                gShowDeleted = $('#show_deleted').is(':checked');
                completeSurveyList();
            });
            $('#show_deleted').prop('checked', false);

            $('#show_blocked').click(function() {
                gShowBlocked = $('#show_blocked').is(':checked');
                completeSurveyList();
            });

            // Get the user details
            getLoggedInUser(projectSet, false, true, undefined);
            getPotentialGroupSurveys();

            // Set change function on projects
            $('#project_name').change(function() {
                globals.gCurrentProject = $('#project_name option:selected').val();
                globals.gCurrentSurvey = -1;
                globals.gCurrentTaskGroup = undefined;

                $('#projectId').val(globals.gCurrentProject);		// Set the project value for the hidden field in template upload
                projectSet();

                saveCurrentProject(globals.gCurrentProject,
                    globals.gCurrentSurvey,
                    globals.gCurrentTaskGroup);
            });

            // Open the dialog to select a new survey for upload
            $('#submitFile').click( function(e) {
                gReplace = false;
                $('#uploadAction').val("add");
                $('#uploadForm')[0].reset();
                $('#up_alert, #up_warnings').hide();
                $('.notreplace').show();
                $('#survey_add_title').text(localise.set["tm_c_form"])
                $('#survey_add').modal('show');
            });

            // Upload File
            $('#submitFileGroup').click( function(e) {

                $('#submitFileGroup').prop("disabled", true);  // debounce
                if(!gReplace) {
                    $('#surveyId').val($('#group').val());
                }
                uploadTemplate();
            });


            // Download file
            $('#downloadFile').click(function () {
                var docURL,
                    language,
                    orientation,
                    type,
	                include_references;

                type = $("input[name='download_type']:checked", "#download_template").val();
                language = $('#download_language option:selected').val();
                orientation = $("input[name='orientation']:checked", "#download_template").val();
	            include_references = $("#include_references", "#download_template").prop('checked');

                if(type === "pdf") {
                    docURL = "/surveyKPI/pdf/" + gSelectedTemplateIdent + "?filename=" + gSelectedTemplateName + "&language=" + language;
                    if(orientation === "landscape") {
                        docURL += "&landscape=true";
                    }
                    if(include_references) {
	                    docURL += "&reference_surveys=true";
                    }
                } else if(type === "xls_edited") {
                    docURL = "/surveyKPI/xlsForm/" + gSelectedTemplateId + "?filetype=" + "xlsx";
                } else {
                    docURL = "/surveyKPI/survey/" + gSelectedTemplateId + "/download?type=" + type + "&language=" + language;
                }
                downloadFile(docURL);
            });

            // On change of template name, hide any previous results
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

            // Change function on download file type
            $("input[name='download_type']", "#download_template").change(function() {
                var type = $("input[name='download_type']:checked", "#download_template").val();
                if(type === "pdf" || type == "codebook") {
                    $('#download_language_div').show();
                } else {
                    $('#download_language_div').hide();
                }
                if(type === "pdf") {
                    $('.pdf_elements').show();
                } else {
                    $('.pdf_elements').hide();
                }
            });

            $('#fwd_rem_survey').change(function(){
                remoteSurveyChanged();
            });

            // Validate upload form on submit
            // Check that the survey has a valid name
            $('#uploadForm').on("submit", function(e) {

                var file = $('#templateName').val(),
                    reg_start = /^[a-zA-Z_]+.*/,
                    pId = $('#projectId').val();

                // Check file name
                if(!reg_start.test(file)) {
                    alert(localise.set["msg_val_let"]);
                    return false;
                }

                if(!file || file.trim().length == 0) {
                    alert(localise.set["msg_val_nm"]);
                    return false;
                }

                // Check for valid project id
                if(pId <= 0) {
                    alert(localise.set["msg_val_p"]);
                    return false;
                }

                return true;
            });

            /*
             * Respond to a user clicking getLink
             */
            $('#getLink').click(function () {

                var url = "/surveyKPI/survey/" +
                    gLinkSurvey.id + "/link";

                addHourglass();
                $.ajax({
                    url: url,
                    cache: false,
                    success: function (data) {

                        removeHourglass();
                        gLinkSurvey.publicLink = data;
                        $('#srLink').val(data);
                        setLinkControls();
                        completeSurveyList();
                    },
                    error: function (xhr, textStatus, err) {
                        removeHourglass();
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log("Error: Failed to get sharing link: " + err);
                        }
                    }
                });

            });

            /*
             * Respond to a user clicking deleteLink
             */
            $('#deleteLink').click(function () {
                var idx,
                    idx2,
                    ident,
                    url;

                // Get ident of public user
                idx = gLinkSurvey.publicLink.indexOf("/id/");
                if(idx >= 0) {
                    idx2 = gLinkSurvey.publicLink.indexOf("/", idx + 4);
                    if (idx2 > idx) {
                        ident = gLinkSurvey.publicLink.substring(idx + 4, idx2);

                        var url = "/surveyKPI/survey/" + gLinkSurvey.id + "/deletelink/" + ident;
                    }
                }

                addHourglass();
                $.ajax({
                    type : 'DELETE',
                    url: url,
                    cache: false,
                    success: function (data) {

                        removeHourglass();
                        gLinkSurvey.publicLink = undefined;
                        $('#srLink').val("");
                        completeSurveyList();
                        $('#survey_link').modal('hide');
                    },
                    error: function (xhr, textStatus, err) {
                        removeHourglass();
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log("Error: Failed to get sharing link: " + err);
                        }
                    }
                });

            });

            // Respond to a user clicking copy link
            $('.has_tt').tooltip();
            $('#copyLink').click(function () {
                var copyText = document.getElementById("srLink");
                copyText.select();
                document.execCommand("Copy");

                $('#copyLink').tooltip('dispose').tooltip({title: localise.set["c_c"] + ": " + copyText.value}).tooltip('show');

            });
            $('#copyLink').mouseout(function () {
                $('#copyLink').tooltip({title: localise.set["c_c"]});
            });

            /*
             * Reports
             */
            $('#m_usage_report').click(function(){
                $('#usage_report_popup').modal("show");
            });
            $('#m_attendance_report').click(function(){
                $('#attendance_report_popup').modal("show");
            });
            $('#usage_report_save').click(function(){
                executeUsageReport();
            });
            $('#attendance_report_save').click(function(){
                executeAttendanceReport();
            });
	        $('#m_form_access_report').click(function(){
		        $('#form_access_report_popup').modal("show");
	        });
            $('#m_bundle_access_report').click(function(){
                $('#bundle_access_report_popup').modal("show");
            });
	        $('#form_access_report_save').click(function(){
		        executeFormAccessReport();
	        });
            $('#bundle_access_report_save').click(function(){
                executeBundleAccessReport();
            });
            $('#m_notification_report').click(function(){
                executeNotificationReport();
            });
            $('#m_resource_usage_report').click(function(){
                executeResourceUsageReport();
            });
            $('#m_structure_user_report').click(function(){
                executeStructureUserReport();
            });
            $('#m_structure_report').click(function(){
                executeStructureReport();
            });
            $('#m_survey_report').click(function(){
                executeSurveyReport();
            });

	        /*
             * Add date time picker to usage and attendance date
             */
	        moment.locale();
	        $('#usageDate').datetimepicker({
		        useCurrent: false,
		        format: "MM/YYYY",
		        viewMode: "months",
		        locale: gUserLocale || 'en'
	        }).data("DateTimePicker").date(moment());

            $('#attendanceDate').datetimepicker({
                useCurrent: false,
                format: "MM/YYYY/DD",
                locale: gUserLocale || 'en'
            }).data("DateTimePicker").date(moment());
        });

        /*
         * Convert the error response safely to html
         */
        function msgToHtml(msg) {
            var idx = -1,
                h = [];

            h[++idx] = '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ';
            h[++idx] = '<span class="sr-only"> Error:</span>';
            h[++idx] = ' ';
            if(msg.status === "error") {
                h[++idx] = localise.set["c_error"];
            } else if(msg.status === "warning") {
                h[++idx] = localise.set["c_warning"];
            }
            h[++idx] =  ': ';
            h[++idx] = htmlEncode(msg.message);

            return h.join('');
        }


        function projectSet() {
            globals = window.globals || globals;
            if(!globals.gLoggedInUser) {
                return;
            }
            var groups = globals.gLoggedInUser.groups,
                group,
                redirect = true,
                redirectEnum = false,
                redirectTasks = false,
                redirectManage = false,
                redirectView = false,
                i;

            /*
             * Check if the password has expired
             */
            if(globals.gLoggedInUser.passwordExpired) {
                window.location.href = "/app/changePassword.html?expired=yes";
            }

            /*
             * Check if user permissions require that they be redirected
             */
            for (i = 0; i < groups.length; i++) {
                group = groups[i];
                if(group.name === "admin" || group.name === "analyst") {
                    redirect = false;
                } else if(group.name === "enum") {
                    redirectEnum = true;
                } else if(group.name === "manage tasks") {
                    redirectTasks = true;
                } else if(group.name === "manage") {
                    redirectManage = true;
                } else if(group.name === "view data") {
                    redirectView = true;
                }
            }
            if(redirect) {
                if(redirectEnum) {
                    window.location.href = "/app/myWork/index.html";
                } else if(redirectTasks) {
                    window.location.href = "/app/tasks/taskManagement.html";
                } else if(redirectManage) {
                    window.location.href = "/app/tasks/managed_forms.html";
                } else if(redirectView) {
                    window.location.href = "/app/fieldAnalysis/index.html";
                }
            }

            getSurveys(globals.gCurrentProject);			// Get surveys
        }

        /*
         * Load the surveys from the server and populate the survey table
         */
        function getSurveys(projectId) {

            if(projectId != -1) {
                var url="/surveyKPI/surveys?projectId=" + projectId + "&blocked=true";

                if(globals.gIsAdministrator || globals.gIsAnalyst) {
                    url+="&deleted=true";
                }

                addHourglass();
                $.ajax({
                    url: url,
                    dataType: 'json',
                    cache: false,
                    success: function(data) {
                        removeHourglass();
                        if(handleLogout(data)) {
                            gSurveys = data;
                            //setLocalTime();		// Convert timestamps from UTC to local time
                            completeSurveyList();
                        }
                    },
                    error: function(xhr, textStatus, err) {
                        removeHourglass();
                        if(xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log("Error: Failed to get list of surveys: " + err);
                        }
                    }
                });
            }
        }

        /*
         * Get the surveys that can be used as groups
         */
        function getPotentialGroupSurveys() {

            var url="/surveyKPI/surveys?blocked=true&groups=true";

            addHourglass();
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        var h = [],
                            idx = -1,
                            i;

                        h[++idx] = '<option value="0">';
                        h[++idx] = localise.set["c_none"]
                        h[++idx] = '</option>';
                        for (i = 0; i < data.length; i++) {
                            h[++idx] = '<option value="';
                            h[++idx] = data[i].id;
                            h[++idx] = '">';
                            h[++idx] = htmlEncode(data[i].projectName);
                            h[++idx] = ' : ';
                            h[++idx] = htmlEncode(data[i].displayName);
                            h[++idx] = '</option>';
                        }
                        $('#group').empty().append(h.join(''));
                    }

                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();
                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        console.log("Error: Failed to get list of groups: " + err);
                    }
                }
            });
        }

        /*
         * Fill in the survey list
         */
        function completeSurveyList() {

            gControlDelete = 0;
            gControlRestore = 0;
            $('#tem_controls').find('button').addClass("disabled");

            var $surveys = $('#survey_table'),
                i, survey,
                h = [],
                idx = -1,
                hSel = [],
                selIdx = -1,
                bSel = [],
                bSelIdx = -1,
                gso = {};

            h[++idx] = '<table class="table table-responsive-sm table-striped">';
            h[++idx] = '<thead>';
            h[++idx] = '<tr>';
            h[++idx] = '<th class="col-xs-1 select_all">';
            h[++idx] = '<input type="checkbox" name="controls" value="-1"></td>';    // select all
            h[++idx] = '</th>';
            h[++idx] = '<th class="col-xs-4">' + localise.set["c_name"] + '</th>';
            h[++idx] = '<th class="col-xs-1">' + localise.set["c_version"] + '</th>';
            h[++idx] = '<th class="col-xs-1">' + localise.set["c_type"] + '</th>';
            h[++idx] = '<th class="col-xs-1">' + localise.set["c_block"] + '</th>';
            h[++idx] = '<th class="col-xs-2">' + localise.set["c_bundle"] + '</th>';
            h[++idx] = '<th class="col-xs-1">' + localise.set["c_replace"] + '</th>';
            h[++idx] = '<th class="col-xs-2">' + localise.set["c_action"] + '</th>';
            h[++idx] = '</tr>';
            h[++idx] = '</thead>';
            h[++idx] = '<tbody>';

            for(i = 0; i < gSurveys.length; i++) {
                survey = gSurveys[i];

                if((gShowDeleted || !survey.deleted) && (gShowBlocked || !survey.blocked)) {

                    h[++idx] = '<tr';
                    if(survey.deleted) {
                        h[++idx] = ' class="deleted"';
                    } else if(survey.blocked) {
                        h[++idx] = ' class="blocked"';
                    } else if(survey.readOnlySurvey) {
                        h[++idx] = ' class="readonlysurvey"';
                    } else if(survey.oversightSurvey && !survey.dataSurvey) {
                        h[++idx] = ' class="oversightsurvey"';
                    } else if(survey.hideOnDevice) {
                        h[++idx] = ' class="hideondevice"';
                    }
                    h[++idx] = '>';
                    h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
                    h[++idx] = i;
                    h[++idx] = '"></td>';

                    if(survey.readOnlySurvey) {
                        h[++idx] = '<td>';
                        h[++idx] = '<a class="readonlysurvey" href="';
                    } else if(survey.oversightSurvey && !survey.dataSurvey) {
                        h[++idx] = '<td>';
                        h[++idx] = '<a class="oversightsurvey" href="';
                    } else if(survey.hideOnDevice) {
                        h[++idx] = '<td>';
                        h[++idx] = '<a class="hideondevice" href="';
                    } else {
                        h[++idx] = '<td class="displayName">';
                        h[++idx] = '<a class="displayName" href="';
                    }

                    if(survey.deleted) {
                        h[++idx] = '#"';
                    } else {
                        h[++idx] = '/edit.html?id=';
                        h[++idx] = survey.id;
                        h[++idx] = '&name=';
                        h[++idx] = encodeURI(survey.displayName);
                        h[++idx] = '"';
                    }
                    h[++idx] = '><span style="word-wrap: break-word;">';
                    h[++idx] = htmlEncode(survey.displayName);
                    h[++idx] = '</span></a></td>';


                    h[++idx] = '<td>';  // type
                    h[++idx] = htmlEncode(survey.version);
                    h[++idx] = '</td>';

                    h[++idx] = '<td>';
                    if(survey.readOnlySurvey) {
                        h[++idx] = localise.set["ed_ro"];
                    } else if(survey.oversightSurvey && !survey.dataSurvey) {
                        h[++idx] = localise.set["m_os"];
                    } else if(survey.hideOnDevice) {
                        h[++idx] = localise.set["ed_hod"];
                    } else {
                        h[++idx] = localise.set["ed_ds"];
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="control_block"><input type="checkbox" name="block" value="';
                    h[++idx] = survey.id;
                    h[++idx] = '" ';
                    if(survey.blocked) {
                        h[++idx] = 'checked="checked"';
                    }
                    h[++idx] = '></td>';

                    h[++idx] = '<td class="groupsurvey" data-id="';
                    h[++idx] = survey.groupSurveyId;
                    h[++idx] = '">';
                    if(survey.groupSurveyDetails) {
                        h[++idx] = htmlEncode(survey.groupSurveyDetails);
                    } else {
                        // Allow for the case where the original group survey was deleted
                        if(survey.ident !== survey.groupSurveyIdent) {
                            h[++idx] = htmlEncode(survey.groupSurveyIdent);
                        }
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td>';
                    h[++idx] = '<button class="btn survey_replace" value="';
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = '<i class="fas fa-sync-alt"></i>';
                    h[++idx] = '</button>';
                    h[++idx] = '</td>';

                    h[++idx] = '<td>';

                    h[++idx] = '<a class="btn survey_view" data-sid="';
                    h[++idx] = survey.id;
                    h[++idx] = '" href="/app/myWork/webForm/';                    // Webform
                    h[++idx] = survey.ident;
                    h[++idx] = addCacheBuster("");
                    h[++idx] = '" target="_blank">'

                    h[++idx] = '<i class="fas fa-eye"></i>';
                    h[++idx] = '</a>';

                    if(survey.publicLink && survey.publicLink.trim().length > 0) {              // Link
                        h[++idx] = '<button class="btn btn-primary survey_link" value="';
                    } else {
                        h[++idx] = '<button class="btn btn-info survey_link" value="';
                    }
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = '<i class="fa fa-share-alt"></i>';
                    h[++idx] = '</button>';

                    h[++idx] = '<button class="btn pdf_td" value="';                            // Download
                    h[++idx] = survey.id;
                    h[++idx] = '"><img src="images/downarrow.png" height="16" width="16"></button>';
                    h[++idx] = '</td>';

                    h[++idx] = '</tr>';

                    /*
                     * Create html for survey select controls
                     */
                    hSel[++selIdx] = '<option value="';
	                hSel[++selIdx] = survey.ident;
	                hSel[++selIdx] = '">';
	                hSel[++selIdx] = htmlEncode(survey.displayName);
	                hSel[++selIdx] = '</option>';

                    /*
                     * Create html for bundle select controls
                     */
                    if(survey.groupSurveyDetails && survey.groupSurveyDetails !== '' && !gso[survey.groupSurveyDetails]) {
                        gso[survey.groupSurveyDetails] = true;
                        bSel[++bSelIdx] = '<option value="';
                        bSel[++bSelIdx] = survey.groupSurveyIdent;
                        bSel[++bSelIdx] = '">';
                        bSel[++bSelIdx] = htmlEncode(survey.groupSurveyDetails);
                        bSel[++bSelIdx] = '</option>';
                    }

                }
            }

            h[++idx] = '</tbody>';
            h[++idx] = '</table>';

            $surveys.empty().append(h.join(''));

            // Toggle select all
            $('.select_all').find('input').click(function() {
                var $this = $(this);
                var selected = $this.is(':checked');

                $('.control_td').find('input').each(function(){
                    var $this = $(this);
                    var index = $this.val();
                    var survey =  gSurveys[index];

                    if(gShowDeleted && survey.deleted || !gShowDeleted && !survey.delete) {
                        $this.prop('checked', selected);
                        surveySelected(selected, index)
                    }
                });
            });

            // Toggle single selection
            $('.control_td').find('input').click(function() {
                var $this = $(this);
                surveySelected($this.is(':checked'), $this.val());

            });

            $('.control_block').find('input').click(function() {

                var $template,
                    $this = $(this),
                    id;

                $template = $this.closest('tr');
                id=$this.val();

                if($this.is(':checked')) {
                    $template.addClass('blocked');
                    executeBlock(id, true);
                } else {
                    $template.removeClass('blocked');
                    executeBlock(id, false);
                }

            });

            // On survey view update the current survey as well as showing the webform
            $('.survey_view').click(function(e) {
                saveCurrentProject(globals.gCurrentProject,
                    $(this).data("sid"),
                    globals.gCurrentTaskGroup);
            });

            $('.survey_replace').click(function(e) {
                var survey = gSurveys[$(this).val()];
                gReplace = true;
                $('#surveyId').val(survey.id);
                $('#uploadAction').val("replace");
                $('#up_alert, #up_warnings').hide();
                $('.notreplace').hide();
                $('#survey_add_title').text(localise.set["tm_c_form_rep"] + ": " + survey.displayName);
                $('#survey_add').modal('show');
            });

            $('.survey_link').click(function(e) {

                gLinkSurvey = gSurveys[$(this).val()];
                $('#srLink').val(gLinkSurvey.publicLink);
                setLinkControls();
                $('#survey_link').modal('show');
            });

            $('.pdf_td').click(function(e) {
                var surveyIndex = $(this).closest('tr').find("[name='controls']").val(),
                    surveyVersion = gSurveys[surveyIndex].version,
                    loadedFromXLS = gSurveys[surveyIndex].loadedFromXLS;

                gSelectedTemplateId = $(this).val();
                gSelectedTemplateIdent = gSurveys[surveyIndex].ident;
                populateLanguageSelect(gSelectedTemplateId, $('#download_language'));

                gSelectedTemplateName = $(this).parent().siblings(".displayName").text();
                $('h4', '#download_template').html(localise.set["c_download"] + " " + gSelectedTemplateName);
                $('#dtversion').html(surveyVersion);
                if(loadedFromXLS) {
                    $('#dtorigxls').show();
                } else {
                    $('#dtorigxls').hide();
                }
                $('form', '#download_template')[0].reset();
                $('#download_language_div, .pdf_elements').hide();
                $('#download_template').modal('show');
            });

            /*
             * Populate survey select controls
             */
            $('.survey_select').html(hSel.join(''));
            $('.bundle_select').html(bSel.join(''));

        }

        /*
         * Permanently erase a survey
         */
        function surveyErase() {

            var surveys = [],
                decision = false,
                h = [],
                i = -1,
                index = 0,
                surveyIdx;

            $('.control_td').find('input:checked').each(function() {
                surveyIdx = $(this).val();
                if(gSurveys[surveyIdx].deleted === true) {
                    surveys[index++] = {id: gSurveys[surveyIdx].id, name: gSurveys[surveyIdx].displayName};
                    h[++i] = htmlEncode(gSurveys[surveyIdx].displayName);
                }
            });

            decision = confirm(localise.set["msg_erase"] + "\n" + h.join());

            if (decision == true) {
                checkLoggedIn(function() {
                    for(i = 0; i < surveys.length; i++) {
                        deleteTemplate(surveys[i].id, surveys[i].name, true);
                    }
                });
            }
        }

        /*
         * Restore soft deleted surveys
         */
        function surveyUnDelete() {

            var surveys = [],
                decision = false,
                h = [],
                i = -1,
                index = 0;

            $('.control_td').find('input:checked').each(function() {
                var surveyIdx = $(this).val();
                if(gSurveys[surveyIdx].deleted === true) {
                    surveys[index++] = {id: gSurveys[surveyIdx].id, name: gSurveys[surveyIdx].displayName};
                    h[++i] = htmlEncode(gSurveys[surveyIdx].displayName);
                }
            });

            decision = confirm(localise.set["msg_restore"] + "\n" + h.join());

            if (decision == true) {
                checkLoggedIn(function() {
                    for(i = 0; i < surveys.length; i++) {
                        executeUnDelete(surveys[i].id, surveys[i].name);
                    }
                });
            }
        }

        /*
         * Soft delete surveys
         */
        function surveyDelete() {

            var surveys = [],
                decision = false,
                h = [],
                i = -1,
                index = 0;

            $('.control_td').find(':checked').each(function() {
                var surveyIdx = $(this).val();
                if(gSurveys[surveyIdx].deleted === false) {
                    surveys[index++] = {id: gSurveys[surveyIdx].id, name: gSurveys[surveyIdx].displayName};
                    h[++i] = htmlEncode(gSurveys[surveyIdx].displayName);
                }
            });

            decision = confirm(localise.set["msg_del_s"] + "\n" + h.join());

            if (decision == true) {
                checkLoggedIn(function() {
                    for(i = 0; i < surveys.length; i++) {
                        deleteTemplate(surveys[i].id, surveys[i].name, false);
                    }
                });
            }
        }


        function deleteTemplate(template, name, hard) {

            // Check for results associated with this template
            var resultCountURL = "/surveyKPI/survey/" + template + "/getMeta";

            if(hard) {
                addHourglass();
                $.ajax({
                    type : 'Get',
                    url : resultCountURL,
                    dataType : 'json',
                    cache: false,
                    error : function(data) {
                        removeHourglass();
                        if(handleLogout(data)) {
                            executeDelete(template, true, hard);    // Just delete as this is what the user has requested
                        }

                    },
                    success : function(response) {
                        if(handleLogout(response)) {
                            var totalRows = 0,
                                msg, decision;

                            removeHourglass();

                            $.each(response.forms, function (index, value) {
                                totalRows += value.rows;
                            });

                            if (totalRows == 0) {
                                executeDelete(template, true, hard);	// Delete survey template and data tables
                            } else {
                                msg = localise.set["msg_del_recs"];
                                msg = msg.replace("%s1", totalRows);
                                msg = msg.replace("%s2", name);

                                decision = confirm(msg);
                                if (decision == true) {
                                    executeDelete(template, true, hard);
                                }
                            }
                        }
                    }
                });
            } else {
                // This is just a soft delete, no need to worry the user about data
                executeDelete(template, true, hard);
            }
        }

        /*
         * Delete the template
         */
        function executeDelete(template, delTables, hard) {

            var delURL = "/surveyKPI/survey/" + template;

            if(delTables) {
                delURL += "?tables=yes&delData=true&hard=" + hard;
            } else {
                delURL += "?hard=" + hard;
            }

            addHourglass();
            $.ajax({
                type : 'DELETE',
                url : delURL,
                dataType: 'text',
                cache: false,
                error : function(data) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        alert(localise.set["msg_err_del"]);
                    }
                },
                success : function(data) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        var projectId = $('#project_name option:selected').val();
                        getSurveys(projectId);
                        getPotentialGroupSurveys();
                    }
                }
            });
        }

        /*
         * Un-Delete the template
         * TODO: Using DELETE to un-delete has to violate innumerable laws of REST!!!!
         * TODO: Presumably the use of DELETE to do a soft delete is also problematic
         */
        function executeUnDelete(template) {

            var url = "/surveyKPI/survey/" + template + "?undelete=true";

            addHourglass();
            $.ajax({
                type : 'DELETE',
                url : url,
                cache: false,
                error : function() {
                    removeHourglass();
                    alert(localise.set["msg_err_res"]);
                },
                success : function() {
                    removeHourglass();
                    var projectId = $('#project_name option:selected').val();
                    getSurveys(projectId);
                    getPotentialGroupSurveys();
                }
            });
        }

        //Block or unblock the template
        function executeBlock(template, set) {

            var blockURL = "/surveyKPI/survey/" + template + "/block?set=" + set;

            addHourglass();
            $.ajax({
                type : 'POST',
                url : blockURL,
                cache: false,
                error : function() {
                    removeHourglass();
                    alert(localise.set["msg_err_block"]);
                },
                success : function() {
                    removeHourglass();
                    var projectId = $('#project_name option:selected').val();
                    getSurveys(projectId);
                }
            });
        }

        /*
         * Upload a survey form
         */
        function uploadTemplate() {

            $('#up_alert, #up_warnings').hide();
            var f = document.forms.namedItem("uploadForm");
            var formData = new FormData(f);
            var url;

            let file = $('#templateName').val();
            if(!file || file.trim().length == 0) {
                $('#up_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["msg_val_nm"]);
                $('#submitFileGroup').prop("disabled", false);  // debounce
                return false;
            }

            url = '/surveyKPI/upload/surveytemplate';

            addHourglass();
            $.ajax({
                url: url,
                type: 'POST',
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData:false,
                success: function(data) {
                    removeHourglass();
                    $('#submitFileGroup').prop("disabled", false);  // debounce
                    if(handleLogout(data)) {
                        // Check for errors in the form
                        if (data && data.status === "error") {
                            $('#up_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(msgToHtml(data));

                        } else if (data && data.status === "warning") {
                            document.forms.namedItem("uploadForm").reset();
                            projectSet();
                            getPotentialGroupSurveys();
                            $('#up_alert').show().removeClass('alert-success alert-danger').addClass('alert-warning').html(msgToHtml(data));

                        } else {
                            document.forms.namedItem("uploadForm").reset();
                            projectSet();
                            getPotentialGroupSurveys();
                            $('#up_alert').show().removeClass('alert-danger alert-warning').addClass('alert-success').html(localise.set["t_tl"] + ": " + htmlEncode(data.name));
                        }
                        $('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
                    } else {
                        $('#up_alert').show().removeClass('alert-success alert-warning').addClass('alert-danger').html(localise.set["lo_lo"]);
                    }

                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        $('#submitFileGroup').prop("disabled", false);  // debounce

                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            $('#up_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_u_f"] + ": " + htmlEncode(xhr.responseText));
                            $('#file').val("");     // Work around ERR_UPLOAD_FILE_CHANGED error
                        }
                    }
                }
            });
        }


        /*
         * Respond to a survey being selected or unselected
         */
        function surveySelected(isChecked, index) {
            if(isChecked) {
                if(gSurveys[index].deleted === false) {
                    ++gControlDelete;
                } else {
                    ++gControlRestore;
                }

                if(gControlDelete === 1) {
                    $('#delete_survey').removeClass("disabled");
                }
                if(gControlRestore === 1) {
                    $('#un_delete_survey').removeClass("disabled");
                    $('#erase_survey').removeClass("disabled");
                }
            } else {

                if(gSurveys[index].deleted === false) {
                    --gControlDelete;
                } else {
                    --gControlRestore;
                }
                if(gControlDelete === 0) {
                    $('#delete_survey').addClass("disabled");
                }
                if(gControlRestore === 0) {
                    $('#un_delete_survey').addClass("disabled");
                    $('#erase_survey').addClass("disabled");
                }
            }
        }

        function setLinkControls() {
            if(gLinkSurvey.publicLink && gLinkSurvey.publicLink.length > 0) {
                $('#getLink').prop("disabled", true);
                $('#deleteLink').prop("disabled", false);
            } else {
                $('#getLink').prop("disabled", false);
                $('#deleteLink').prop("disabled", true);
            }
        }

	    function executeFormAccessReport() {
		    let formIdent = $('#survey_access').val();
		    downloadFile("/surveyKPI/adminreport/formaccess/" + formIdent);
	    }

        function executeBundleAccessReport() {
            let formIdent = $('#bundle_access').val();
            downloadFile("/surveyKPI/adminreport/bundleaccess/" + formIdent);
        }

        function executeNotificationReport() {
            downloadFile("/surveyKPI/adminreport/notifications/");
        }

        function executeResourceUsageReport() {
            downloadFile("/surveyKPI/adminreport/resourceusage/");
        }

        function executeStructureReport() {
            downloadFile("/surveyKPI/adminreport/structure");
        }

        function executeStructureUserReport() {
            downloadFile("/surveyKPI/adminreport/userstructure");
        }

    }).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },

/***/ "./WebContent/js/libs/common-shim.js"
/*!*******************************************!*\
  !*** ./WebContent/js/libs/common-shim.js ***!
  \*******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../smapServer/WebContent/js/app/common */ "../smapServer/WebContent/js/app/common.js");
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_0__);




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.$);


/***/ },

/***/ "./WebContent/js/libs/datetimepicker-shim.js"
/*!***************************************************!*\
  !*** ./WebContent/js/libs/datetimepicker-shim.js ***!
  \***************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.$);


/***/ },

/***/ "./WebContent/js/libs/globals-shim.js"
/*!********************************************!*\
  !*** ./WebContent/js/libs/globals-shim.js ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _smapServer_WebContent_js_app_globals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../../smapServer/WebContent/js/app/globals */ "../smapServer/WebContent/js/app/globals.js");




/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.globals);


/***/ },

/***/ "./WebContent/js/libs/localise-shim.js"
/*!*********************************************!*\
  !*** ./WebContent/js/libs/localise-shim.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.localise);


/***/ },

/***/ "./WebContent/js/libs/pace-shim.js"
/*!*****************************************!*\
  !*** ./WebContent/js/libs/pace-shim.js ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.$);


/***/ },

/***/ "jquery"
/*!*************************!*\
  !*** external "jQuery" ***!
  \*************************/
(module) {

"use strict";
module.exports = jQuery;

/***/ },

/***/ "moment"
/*!*************************!*\
  !*** external "moment" ***!
  \*************************/
(module) {

"use strict";
module.exports = moment;

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; (typeof current == 'object' || typeof current == 'function') && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be in strict mode.
(() => {
"use strict";
/*!*******************************************!*\
  !*** ./WebContent/js/surveyManagement.js ***!
  \*******************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _smapServer_WebContent_js_app_localise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/localise */ "../smapServer/WebContent/js/app/localise.js");
/* harmony import */ var _smapServer_WebContent_js_app_globals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/globals */ "../smapServer/WebContent/js/app/globals.js");
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/common */ "../smapServer/WebContent/js/app/common.js");
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll_min__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min */ "../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min.js");
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll_min__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll_min__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_pace_pace_min__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min */ "../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min.js");
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_pace_pace_min__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_wb_plugins_pace_pace_min__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47 */ "../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47.js");
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_5__);
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
 * Purpose: Manage surveys uploaded to the server
 */










const moment = window.moment;
const localise = window.localise;
const globals = window.globals;
const { setupUserProfile } = (_smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_2___default());
window.setupUserProfile = window.setupUserProfile || setupUserProfile;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function () {
	window.moment = window.moment || moment;

	Promise.resolve(/*! import() eager */).then(__webpack_require__.t.bind(__webpack_require__, /*! ./app/surveyManagement */ "./WebContent/js/app/surveyManagement.js", 23)).then(function () {
		setCustomTemplateMgmt();
	});
});

})();

/******/ })()
;