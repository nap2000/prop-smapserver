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

/***/ "../smapServer/WebContent/js/libs/bootbox.min.js"
/*!*******************************************************!*\
  !*** ../smapServer/WebContent/js/libs/bootbox.min.js ***!
  \*******************************************************/
(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
 * bootbox.js v4.3.0
 *
 * http://bootboxjs.com/license.txt
 */
!function(a,b){"use strict"; true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! jquery */ "jquery")], __WEBPACK_AMD_DEFINE_FACTORY__ = (b),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0}(this,function a(b,c){"use strict";function d(a){var b=q[o.locale];return b?b[a]:q.en[a]}function e(a,c,d){a.stopPropagation(),a.preventDefault();var e=b.isFunction(d)&&d(a)===!1;e||c.modal("hide")}function f(a){var b,c=0;for(b in a)c++;return c}function g(a,c){var d=0;b.each(a,function(a,b){c(a,b,d++)})}function h(a){var c,d;if("object"!=typeof a)throw new Error("Please supply an object of options");if(!a.message)throw new Error("Please specify a message");return a=b.extend({},o,a),a.buttons||(a.buttons={}),a.backdrop=a.backdrop?"static":!1,c=a.buttons,d=f(c),g(c,function(a,e,f){if(b.isFunction(e)&&(e=c[a]={callback:e}),"object"!==b.type(e))throw new Error("button with key "+a+" must be an object");e.label||(e.label=a),e.className||(e.className=2>=d&&f===d-1?"btn-primary":"btn-default")}),a}function i(a,b){var c=a.length,d={};if(1>c||c>2)throw new Error("Invalid argument length");return 2===c||"string"==typeof a[0]?(d[b[0]]=a[0],d[b[1]]=a[1]):d=a[0],d}function j(a,c,d){return b.extend(!0,{},a,i(c,d))}function k(a,b,c,d){var e={className:"bootbox-"+a,buttons:l.apply(null,b)};return m(j(e,d,c),b)}function l(){for(var a={},b=0,c=arguments.length;c>b;b++){var e=arguments[b],f=e.toLowerCase(),g=e.toUpperCase();a[f]={label:d(g)}}return a}function m(a,b){var d={};return g(b,function(a,b){d[b]=!0}),g(a.buttons,function(a){if(d[a]===c)throw new Error("button key "+a+" is not allowed (options are "+b.join("\n")+")")}),a}var n={dialog:"<div class='bootbox modal' tabindex='-1' role='dialog'><div class='modal-dialog'><div class='modal-content'><div class='modal-body'><div class='bootbox-body'></div></div></div></div></div>",header:"<div class='modal-header'><h4 class='modal-title'></h4></div>",footer:"<div class='modal-footer'></div>",closeButton:"<button type='button' class='bootbox-close-button close' data-dismiss='modal' aria-hidden='true'>&times;</button>",form:"<form class='bootbox-form'></form>",inputs:{text:"<input class='bootbox-input bootbox-input-text form-control' autocomplete=off type=text />",textarea:"<textarea class='bootbox-input bootbox-input-textarea form-control'></textarea>",email:"<input class='bootbox-input bootbox-input-email form-control' autocomplete='off' type='email' />",select:"<select class='bootbox-input bootbox-input-select form-control'></select>",checkbox:"<div class='checkbox'><label><input class='bootbox-input bootbox-input-checkbox' type='checkbox' /></label></div>",date:"<input class='bootbox-input bootbox-input-date form-control' autocomplete=off type='date' />",time:"<input class='bootbox-input bootbox-input-time form-control' autocomplete=off type='time' />",number:"<input class='bootbox-input bootbox-input-number form-control' autocomplete=off type='number' />",password:"<input class='bootbox-input bootbox-input-password form-control' autocomplete='off' type='password' />"}},o={locale:"en",backdrop:!0,animate:!0,className:null,closeButton:!0,show:!0,container:"body"},p={};p.alert=function(){var a;if(a=k("alert",["ok"],["message","callback"],arguments),a.callback&&!b.isFunction(a.callback))throw new Error("alert requires callback property to be a function when provided");return a.buttons.ok.callback=a.onEscape=function(){return b.isFunction(a.callback)?a.callback():!0},p.dialog(a)},p.confirm=function(){var a;if(a=k("confirm",["cancel","confirm"],["message","callback"],arguments),a.buttons.cancel.callback=a.onEscape=function(){return a.callback(!1)},a.buttons.confirm.callback=function(){return a.callback(!0)},!b.isFunction(a.callback))throw new Error("confirm requires a callback");return p.dialog(a)},p.prompt=function(){var a,d,e,f,h,i,k;if(f=b(n.form),d={className:"bootbox-prompt",buttons:l("cancel","confirm"),value:"",inputType:"text"},a=m(j(d,arguments,["title","callback"]),["cancel","confirm"]),i=a.show===c?!0:a.show,a.message=f,a.buttons.cancel.callback=a.onEscape=function(){return a.callback(null)},a.buttons.confirm.callback=function(){var c;switch(a.inputType){case"text":case"textarea":case"email":case"select":case"date":case"time":case"number":case"password":c=h.val();break;case"checkbox":var d=h.find("input:checked");c=[],g(d,function(a,d){c.push(b(d).val())})}return a.callback(c)},a.show=!1,!a.title)throw new Error("prompt requires a title");if(!b.isFunction(a.callback))throw new Error("prompt requires a callback");if(!n.inputs[a.inputType])throw new Error("invalid prompt type");switch(h=b(n.inputs[a.inputType]),a.inputType){case"text":case"textarea":case"email":case"date":case"time":case"number":case"password":h.val(a.value);break;case"select":var o={};if(k=a.inputOptions||[],!k.length)throw new Error("prompt with select requires options");g(k,function(a,d){var e=h;if(d.value===c||d.text===c)throw new Error("given options in wrong format");d.group&&(o[d.group]||(o[d.group]=b("<optgroup/>").attr("label",d.group)),e=o[d.group]),e.append("<option value='"+d.value+"'>"+d.text+"</option>")}),g(o,function(a,b){h.append(b)}),h.val(a.value);break;case"checkbox":var q=b.isArray(a.value)?a.value:[a.value];if(k=a.inputOptions||[],!k.length)throw new Error("prompt with checkbox requires options");if(!k[0].value||!k[0].text)throw new Error("given options in wrong format");h=b("<div/>"),g(k,function(c,d){var e=b(n.inputs[a.inputType]);e.find("input").attr("value",d.value),e.find("label").append(d.text),g(q,function(a,b){b===d.value&&e.find("input").prop("checked",!0)}),h.append(e)})}return a.placeholder&&h.attr("placeholder",a.placeholder),a.pattern&&h.attr("pattern",a.pattern),f.append(h),f.on("submit",function(a){a.preventDefault(),a.stopPropagation(),e.find(".btn-primary").click()}),e=p.dialog(a),e.off("shown.bs.modal"),e.on("shown.bs.modal",function(){h.focus()}),i===!0&&e.modal("show"),e},p.dialog=function(a){a=h(a);var c=b(n.dialog),d=c.find(".modal-dialog"),f=c.find(".modal-body"),i=a.buttons,j="",k={onEscape:a.onEscape};if(g(i,function(a,b){j+="<button data-bb-handler='"+a+"' type='button' class='btn "+b.className+"'>"+b.label+"</button>",k[a]=b.callback}),f.find(".bootbox-body").html(a.message),a.animate===!0&&c.addClass("fade"),a.className&&c.addClass(a.className),"large"===a.size&&d.addClass("modal-lg"),"small"===a.size&&d.addClass("modal-sm"),a.title&&f.before(n.header),a.closeButton){var l=b(n.closeButton);a.title?c.find(".modal-header").prepend(l):l.css("margin-top","-10px").prependTo(f)}return a.title&&c.find(".modal-title").html(a.title),j.length&&(f.after(n.footer),c.find(".modal-footer").html(j)),c.on("hidden.bs.modal",function(a){a.target===this&&c.remove()}),c.on("shown.bs.modal",function(){c.find(".btn-primary:first").focus()}),c.on("escape.close.bb",function(a){k.onEscape&&e(a,c,k.onEscape)}),c.on("click",".modal-footer button",function(a){var d=b(this).data("bb-handler");e(a,c,k[d])}),c.on("click",".bootbox-close-button",function(a){e(a,c,k.onEscape)}),c.on("keyup",function(a){27===a.which&&c.trigger("escape.close.bb")}),b(a.container).append(c),c.modal({backdrop:a.backdrop,keyboard:!1,show:!1}),a.show&&c.modal("show"),c},p.setDefaults=function(){var a={};2===arguments.length?a[arguments[0]]=arguments[1]:a=arguments[0],b.extend(o,a)},p.hideAll=function(){return b(".bootbox").modal("hide"),p};var q={br:{OK:"OK",CANCEL:"Cancelar",CONFIRM:"Sim"},cs:{OK:"OK",CANCEL:"Zrušit",CONFIRM:"Potvrdit"},da:{OK:"OK",CANCEL:"Annuller",CONFIRM:"Accepter"},de:{OK:"OK",CANCEL:"Abbrechen",CONFIRM:"Akzeptieren"},el:{OK:"Εντάξει",CANCEL:"Ακύρωση",CONFIRM:"Επιβεβαίωση"},en:{OK:"OK",CANCEL:"Cancel",CONFIRM:"OK"},es:{OK:"OK",CANCEL:"Cancelar",CONFIRM:"Aceptar"},et:{OK:"OK",CANCEL:"Katkesta",CONFIRM:"OK"},fi:{OK:"OK",CANCEL:"Peruuta",CONFIRM:"OK"},fr:{OK:"OK",CANCEL:"Annuler",CONFIRM:"D'accord"},he:{OK:"אישור",CANCEL:"ביטול",CONFIRM:"אישור"},id:{OK:"OK",CANCEL:"Batal",CONFIRM:"OK"},it:{OK:"OK",CANCEL:"Annulla",CONFIRM:"Conferma"},ja:{OK:"OK",CANCEL:"キャンセル",CONFIRM:"確認"},lt:{OK:"Gerai",CANCEL:"Atšaukti",CONFIRM:"Patvirtinti"},lv:{OK:"Labi",CANCEL:"Atcelt",CONFIRM:"Apstiprināt"},nl:{OK:"OK",CANCEL:"Annuleren",CONFIRM:"Accepteren"},no:{OK:"OK",CANCEL:"Avbryt",CONFIRM:"OK"},pl:{OK:"OK",CANCEL:"Anuluj",CONFIRM:"Potwierdź"},pt:{OK:"OK",CANCEL:"Cancelar",CONFIRM:"Confirmar"},ru:{OK:"OK",CANCEL:"Отмена",CONFIRM:"Применить"},sv:{OK:"OK",CANCEL:"Avbryt",CONFIRM:"OK"},tr:{OK:"Tamam",CANCEL:"İptal",CONFIRM:"Onayla"},zh_CN:{OK:"OK",CANCEL:"取消",CONFIRM:"确认"},zh_TW:{OK:"OK",CANCEL:"取消",CONFIRM:"確認"}};return p.init=function(c){return a(c||b)},p});

/***/ },

/***/ "../smapServer/WebContent/js/libs/bootstrap-colorpicker.min.js"
/*!*********************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/bootstrap-colorpicker.min.js ***!
  \*********************************************************************/
(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * Bootstrap Colorpicker v2.5.2
 * https://itsjavi.com/bootstrap-colorpicker/
 */
!function(a,b){ true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(/*! jquery */ "jquery")], __WEBPACK_AMD_DEFINE_RESULT__ = (function(a){return b(a)}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0}(this,function(a){"use strict";var b=function(c,d,e,f,g){this.fallbackValue=e?"string"==typeof e?this.parse(e):e:null,this.fallbackFormat=f?f:"rgba",this.hexNumberSignPrefix=g===!0,this.value=this.fallbackValue,this.origFormat=null,this.predefinedColors=d?d:{},this.colors=a.extend({},b.webColors,this.predefinedColors),c&&("undefined"!=typeof c.h?this.value=c:this.setColor(String(c))),this.value||(this.value={h:0,s:0,b:0,a:1})};b.webColors={aliceblue:"f0f8ff",antiquewhite:"faebd7",aqua:"00ffff",aquamarine:"7fffd4",azure:"f0ffff",beige:"f5f5dc",bisque:"ffe4c4",black:"000000",blanchedalmond:"ffebcd",blue:"0000ff",blueviolet:"8a2be2",brown:"a52a2a",burlywood:"deb887",cadetblue:"5f9ea0",chartreuse:"7fff00",chocolate:"d2691e",coral:"ff7f50",cornflowerblue:"6495ed",cornsilk:"fff8dc",crimson:"dc143c",cyan:"00ffff",darkblue:"00008b",darkcyan:"008b8b",darkgoldenrod:"b8860b",darkgray:"a9a9a9",darkgreen:"006400",darkkhaki:"bdb76b",darkmagenta:"8b008b",darkolivegreen:"556b2f",darkorange:"ff8c00",darkorchid:"9932cc",darkred:"8b0000",darksalmon:"e9967a",darkseagreen:"8fbc8f",darkslateblue:"483d8b",darkslategray:"2f4f4f",darkturquoise:"00ced1",darkviolet:"9400d3",deeppink:"ff1493",deepskyblue:"00bfff",dimgray:"696969",dodgerblue:"1e90ff",firebrick:"b22222",floralwhite:"fffaf0",forestgreen:"228b22",fuchsia:"ff00ff",gainsboro:"dcdcdc",ghostwhite:"f8f8ff",gold:"ffd700",goldenrod:"daa520",gray:"808080",green:"008000",greenyellow:"adff2f",honeydew:"f0fff0",hotpink:"ff69b4",indianred:"cd5c5c",indigo:"4b0082",ivory:"fffff0",khaki:"f0e68c",lavender:"e6e6fa",lavenderblush:"fff0f5",lawngreen:"7cfc00",lemonchiffon:"fffacd",lightblue:"add8e6",lightcoral:"f08080",lightcyan:"e0ffff",lightgoldenrodyellow:"fafad2",lightgrey:"d3d3d3",lightgreen:"90ee90",lightpink:"ffb6c1",lightsalmon:"ffa07a",lightseagreen:"20b2aa",lightskyblue:"87cefa",lightslategray:"778899",lightsteelblue:"b0c4de",lightyellow:"ffffe0",lime:"00ff00",limegreen:"32cd32",linen:"faf0e6",magenta:"ff00ff",maroon:"800000",mediumaquamarine:"66cdaa",mediumblue:"0000cd",mediumorchid:"ba55d3",mediumpurple:"9370d8",mediumseagreen:"3cb371",mediumslateblue:"7b68ee",mediumspringgreen:"00fa9a",mediumturquoise:"48d1cc",mediumvioletred:"c71585",midnightblue:"191970",mintcream:"f5fffa",mistyrose:"ffe4e1",moccasin:"ffe4b5",navajowhite:"ffdead",navy:"000080",oldlace:"fdf5e6",olive:"808000",olivedrab:"6b8e23",orange:"ffa500",orangered:"ff4500",orchid:"da70d6",palegoldenrod:"eee8aa",palegreen:"98fb98",paleturquoise:"afeeee",palevioletred:"d87093",papayawhip:"ffefd5",peachpuff:"ffdab9",peru:"cd853f",pink:"ffc0cb",plum:"dda0dd",powderblue:"b0e0e6",purple:"800080",red:"ff0000",rosybrown:"bc8f8f",royalblue:"4169e1",saddlebrown:"8b4513",salmon:"fa8072",sandybrown:"f4a460",seagreen:"2e8b57",seashell:"fff5ee",sienna:"a0522d",silver:"c0c0c0",skyblue:"87ceeb",slateblue:"6a5acd",slategray:"708090",snow:"fffafa",springgreen:"00ff7f",steelblue:"4682b4",tan:"d2b48c",teal:"008080",thistle:"d8bfd8",tomato:"ff6347",turquoise:"40e0d0",violet:"ee82ee",wheat:"f5deb3",white:"ffffff",whitesmoke:"f5f5f5",yellow:"ffff00",yellowgreen:"9acd32",transparent:"transparent"},b.prototype={constructor:b,colors:{},predefinedColors:{},getValue:function(){return this.value},setValue:function(a){this.value=a},_sanitizeNumber:function(a){return"number"==typeof a?a:isNaN(a)||null===a||""===a||void 0===a?1:""===a?0:"undefined"!=typeof a.toLowerCase?(a.match(/^\./)&&(a="0"+a),Math.ceil(100*parseFloat(a))/100):1},isTransparent:function(a){return!(!a||!("string"==typeof a||a instanceof String))&&(a=a.toLowerCase().trim(),"transparent"===a||a.match(/#?00000000/)||a.match(/(rgba|hsla)\(0,0,0,0?\.?0\)/))},rgbaIsTransparent:function(a){return 0===a.r&&0===a.g&&0===a.b&&0===a.a},setColor:function(a){if(a=a.toLowerCase().trim()){if(this.isTransparent(a))return this.value={h:0,s:0,b:0,a:0},!0;var b=this.parse(a);b?(this.value=this.value={h:b.h,s:b.s,b:b.b,a:b.a},this.origFormat||(this.origFormat=b.format)):this.fallbackValue&&(this.value=this.fallbackValue)}return!1},setHue:function(a){this.value.h=1-a},setSaturation:function(a){this.value.s=a},setBrightness:function(a){this.value.b=1-a},setAlpha:function(a){this.value.a=Math.round(parseInt(100*(1-a),10)/100*100)/100},toRGB:function(a,b,c,d){0===arguments.length&&(a=this.value.h,b=this.value.s,c=this.value.b,d=this.value.a),a*=360;var e,f,g,h,i;return a=a%360/60,i=c*b,h=i*(1-Math.abs(a%2-1)),e=f=g=c-i,a=~~a,e+=[i,h,0,0,h,i][a],f+=[h,i,i,h,0,0][a],g+=[0,0,h,i,i,h][a],{r:Math.round(255*e),g:Math.round(255*f),b:Math.round(255*g),a:d}},toHex:function(a,b,c,d,e){arguments.length<=1&&(b=this.value.h,c=this.value.s,d=this.value.b,e=this.value.a);var f="#",g=this.toRGB(b,c,d,e);if(this.rgbaIsTransparent(g))return"transparent";a||(f=this.hexNumberSignPrefix?"#":"");var h=f+((1<<24)+(parseInt(g.r)<<16)+(parseInt(g.g)<<8)+parseInt(g.b)).toString(16).slice(1);return h},toHSL:function(a,b,c,d){0===arguments.length&&(a=this.value.h,b=this.value.s,c=this.value.b,d=this.value.a);var e=a,f=(2-b)*c,g=b*c;return g/=f>0&&f<=1?f:2-f,f/=2,g>1&&(g=1),{h:isNaN(e)?0:e,s:isNaN(g)?0:g,l:isNaN(f)?0:f,a:isNaN(d)?0:d}},toAlias:function(a,b,c,d){var e,f=0===arguments.length?this.toHex(!0):this.toHex(!0,a,b,c,d),g="alias"===this.origFormat?f:this.toString(!1,this.origFormat);for(var h in this.colors)if(e=this.colors[h].toLowerCase().trim(),e===f||e===g)return h;return!1},RGBtoHSB:function(a,b,c,d){a/=255,b/=255,c/=255;var e,f,g,h;return g=Math.max(a,b,c),h=g-Math.min(a,b,c),e=0===h?null:g===a?(b-c)/h:g===b?(c-a)/h+2:(a-b)/h+4,e=(e+360)%6*60/360,f=0===h?0:h/g,{h:this._sanitizeNumber(e),s:f,b:g,a:this._sanitizeNumber(d)}},HueToRGB:function(a,b,c){return c<0?c+=1:c>1&&(c-=1),6*c<1?a+(b-a)*c*6:2*c<1?b:3*c<2?a+(b-a)*(2/3-c)*6:a},HSLtoRGB:function(a,b,c,d){b<0&&(b=0);var e;e=c<=.5?c*(1+b):c+b-c*b;var f=2*c-e,g=a+1/3,h=a,i=a-1/3,j=Math.round(255*this.HueToRGB(f,e,g)),k=Math.round(255*this.HueToRGB(f,e,h)),l=Math.round(255*this.HueToRGB(f,e,i));return[j,k,l,this._sanitizeNumber(d)]},parse:function(b){if("string"!=typeof b)return this.fallbackValue;if(0===arguments.length)return!1;var c,d,e=this,f=!1,g="undefined"!=typeof this.colors[b];return g&&(b=this.colors[b].toLowerCase().trim()),a.each(this.stringParsers,function(a,h){var i=h.re.exec(b);return c=i&&h.parse.apply(e,[i]),!c||(f={},d=g?"alias":h.format?h.format:e.getValidFallbackFormat(),f=d.match(/hsla?/)?e.RGBtoHSB.apply(e,e.HSLtoRGB.apply(e,c)):e.RGBtoHSB.apply(e,c),f instanceof Object&&(f.format=d),!1)}),f},getValidFallbackFormat:function(){var a=["rgba","rgb","hex","hsla","hsl"];return this.origFormat&&a.indexOf(this.origFormat)!==-1?this.origFormat:this.fallbackFormat&&a.indexOf(this.fallbackFormat)!==-1?this.fallbackFormat:"rgba"},toString:function(a,c,d){c=c||this.origFormat||this.fallbackFormat,d=d||!1;var e=!1;switch(c){case"rgb":return e=this.toRGB(),this.rgbaIsTransparent(e)?"transparent":"rgb("+e.r+","+e.g+","+e.b+")";case"rgba":return e=this.toRGB(),"rgba("+e.r+","+e.g+","+e.b+","+e.a+")";case"hsl":return e=this.toHSL(),"hsl("+Math.round(360*e.h)+","+Math.round(100*e.s)+"%,"+Math.round(100*e.l)+"%)";case"hsla":return e=this.toHSL(),"hsla("+Math.round(360*e.h)+","+Math.round(100*e.s)+"%,"+Math.round(100*e.l)+"%,"+e.a+")";case"hex":return this.toHex(a);case"alias":return e=this.toAlias(),e===!1?this.toString(a,this.getValidFallbackFormat()):d&&!(e in b.webColors)&&e in this.predefinedColors?this.predefinedColors[e]:e;default:return e}},stringParsers:[{re:/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*?\)/,format:"rgb",parse:function(a){return[a[1],a[2],a[3],1]}},{re:/rgb\(\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*?\)/,format:"rgb",parse:function(a){return[2.55*a[1],2.55*a[2],2.55*a[3],1]}},{re:/rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)/,format:"rgba",parse:function(a){return[a[1],a[2],a[3],a[4]]}},{re:/rgba\(\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)/,format:"rgba",parse:function(a){return[2.55*a[1],2.55*a[2],2.55*a[3],a[4]]}},{re:/hsl\(\s*(\d*(?:\.\d+)?)\s*,\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*?\)/,format:"hsl",parse:function(a){return[a[1]/360,a[2]/100,a[3]/100,a[4]]}},{re:/hsla\(\s*(\d*(?:\.\d+)?)\s*,\s*(\d*(?:\.\d+)?)\%\s*,\s*(\d*(?:\.\d+)?)\%\s*(?:,\s*(\d*(?:\.\d+)?)\s*)?\)/,format:"hsla",parse:function(a){return[a[1]/360,a[2]/100,a[3]/100,a[4]]}},{re:/#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})/,format:"hex",parse:function(a){return[parseInt(a[1],16),parseInt(a[2],16),parseInt(a[3],16),1]}},{re:/#?([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])/,format:"hex",parse:function(a){return[parseInt(a[1]+a[1],16),parseInt(a[2]+a[2],16),parseInt(a[3]+a[3],16),1]}}],colorNameToHex:function(a){return"undefined"!=typeof this.colors[a.toLowerCase()]&&this.colors[a.toLowerCase()]}};var c={horizontal:!1,inline:!1,color:!1,format:!1,input:"input",container:!1,component:".add-on, .input-group-addon",fallbackColor:!1,fallbackFormat:"hex",hexNumberSignPrefix:!0,sliders:{saturation:{maxLeft:100,maxTop:100,callLeft:"setSaturation",callTop:"setBrightness"},hue:{maxLeft:0,maxTop:100,callLeft:!1,callTop:"setHue"},alpha:{maxLeft:0,maxTop:100,callLeft:!1,callTop:"setAlpha"}},slidersHorz:{saturation:{maxLeft:100,maxTop:100,callLeft:"setSaturation",callTop:"setBrightness"},hue:{maxLeft:100,maxTop:0,callLeft:"setHue",callTop:!1},alpha:{maxLeft:100,maxTop:0,callLeft:"setAlpha",callTop:!1}},template:'<div class="colorpicker dropdown-menu"><div class="colorpicker-saturation"><i><b></b></i></div><div class="colorpicker-hue"><i></i></div><div class="colorpicker-alpha"><i></i></div><div class="colorpicker-color"><div /></div><div class="colorpicker-selectors"></div></div>',align:"right",customClass:null,colorSelectors:null},d=function(b,d){this.element=a(b).addClass("colorpicker-element"),this.options=a.extend(!0,{},c,this.element.data(),d),this.component=this.options.component,this.component=this.component!==!1&&this.element.find(this.component),this.component&&0===this.component.length&&(this.component=!1),this.container=this.options.container===!0?this.element:this.options.container,this.container=this.container!==!1&&a(this.container),this.input=this.element.is("input")?this.element:!!this.options.input&&this.element.find(this.options.input),this.input&&0===this.input.length&&(this.input=!1),this.color=this.createColor(this.options.color!==!1?this.options.color:this.getValue()),this.format=this.options.format!==!1?this.options.format:this.color.origFormat,this.options.color!==!1&&(this.updateInput(this.color),this.updateData(this.color)),this.disabled=!1;var e=this.picker=a(this.options.template);if(this.options.customClass&&e.addClass(this.options.customClass),this.options.inline?e.addClass("colorpicker-inline colorpicker-visible"):e.addClass("colorpicker-hidden"),this.options.horizontal&&e.addClass("colorpicker-horizontal"),["rgba","hsla","alias"].indexOf(this.format)===-1&&this.options.format!==!1&&"transparent"!==this.getValue()||e.addClass("colorpicker-with-alpha"),"right"===this.options.align&&e.addClass("colorpicker-right"),this.options.inline===!0&&e.addClass("colorpicker-no-arrow"),this.options.colorSelectors){var f=this,g=f.picker.find(".colorpicker-selectors");g.length>0&&(a.each(this.options.colorSelectors,function(b,c){var d=a("<i />").addClass("colorpicker-selectors-color").css("background-color",c).data("class",b).data("alias",b);d.on("mousedown.colorpicker touchstart.colorpicker",function(b){b.preventDefault(),f.setValue("alias"===f.format?a(this).data("alias"):a(this).css("background-color"))}),g.append(d)}),g.show().addClass("colorpicker-visible"))}e.on("mousedown.colorpicker touchstart.colorpicker",a.proxy(function(a){a.target===a.currentTarget&&a.preventDefault()},this)),e.find(".colorpicker-saturation, .colorpicker-hue, .colorpicker-alpha").on("mousedown.colorpicker touchstart.colorpicker",a.proxy(this.mousedown,this)),e.appendTo(this.container?this.container:a("body")),this.input!==!1&&(this.input.on({"keyup.colorpicker":a.proxy(this.keyup,this)}),this.input.on({"change.colorpicker":a.proxy(this.change,this)}),this.component===!1&&this.element.on({"focus.colorpicker":a.proxy(this.show,this)}),this.options.inline===!1&&this.element.on({"focusout.colorpicker":a.proxy(this.hide,this)})),this.component!==!1&&this.component.on({"click.colorpicker":a.proxy(this.show,this)}),this.input===!1&&this.component===!1&&this.element.on({"click.colorpicker":a.proxy(this.show,this)}),this.input!==!1&&this.component!==!1&&"color"===this.input.attr("type")&&this.input.on({"click.colorpicker":a.proxy(this.show,this),"focus.colorpicker":a.proxy(this.show,this)}),this.update(),a(a.proxy(function(){this.element.trigger("create")},this))};d.Color=b,d.prototype={constructor:d,destroy:function(){this.picker.remove(),this.element.removeData("colorpicker","color").off(".colorpicker"),this.input!==!1&&this.input.off(".colorpicker"),this.component!==!1&&this.component.off(".colorpicker"),this.element.removeClass("colorpicker-element"),this.element.trigger({type:"destroy"})},reposition:function(){if(this.options.inline!==!1||this.options.container)return!1;var a=this.container&&this.container[0]!==window.document.body?"position":"offset",b=this.component||this.element,c=b[a]();"right"===this.options.align&&(c.left-=this.picker.outerWidth()-b.outerWidth()),this.picker.css({top:c.top+b.outerHeight(),left:c.left})},show:function(b){this.isDisabled()||(this.picker.addClass("colorpicker-visible").removeClass("colorpicker-hidden"),this.reposition(),a(window).on("resize.colorpicker",a.proxy(this.reposition,this)),!b||this.hasInput()&&"color"!==this.input.attr("type")||b.stopPropagation&&b.preventDefault&&(b.stopPropagation(),b.preventDefault()),!this.component&&this.input||this.options.inline!==!1||a(window.document).on({"mousedown.colorpicker":a.proxy(this.hide,this)}),this.element.trigger({type:"showPicker",color:this.color}))},hide:function(b){return("undefined"==typeof b||!b.target||!(a(b.currentTarget).parents(".colorpicker").length>0||a(b.target).parents(".colorpicker").length>0))&&(this.picker.addClass("colorpicker-hidden").removeClass("colorpicker-visible"),a(window).off("resize.colorpicker",this.reposition),a(window.document).off({"mousedown.colorpicker":this.hide}),this.update(),void this.element.trigger({type:"hidePicker",color:this.color}))},updateData:function(a){return a=a||this.color.toString(!1,this.format),this.element.data("color",a),a},updateInput:function(a){return a=a||this.color.toString(!1,this.format),this.input!==!1&&(this.input.prop("value",a),this.input.trigger("change")),a},updatePicker:function(a){"undefined"!=typeof a&&(this.color=this.createColor(a));var b=this.options.horizontal===!1?this.options.sliders:this.options.slidersHorz,c=this.picker.find("i");if(0!==c.length)return this.options.horizontal===!1?(b=this.options.sliders,c.eq(1).css("top",b.hue.maxTop*(1-this.color.value.h)).end().eq(2).css("top",b.alpha.maxTop*(1-this.color.value.a))):(b=this.options.slidersHorz,c.eq(1).css("left",b.hue.maxLeft*(1-this.color.value.h)).end().eq(2).css("left",b.alpha.maxLeft*(1-this.color.value.a))),c.eq(0).css({top:b.saturation.maxTop-this.color.value.b*b.saturation.maxTop,left:this.color.value.s*b.saturation.maxLeft}),this.picker.find(".colorpicker-saturation").css("backgroundColor",this.color.toHex(!0,this.color.value.h,1,1,1)),this.picker.find(".colorpicker-alpha").css("backgroundColor",this.color.toHex(!0)),this.picker.find(".colorpicker-color, .colorpicker-color div").css("backgroundColor",this.color.toString(!0,this.format)),a},updateComponent:function(a){var b;if(b="undefined"!=typeof a?this.createColor(a):this.color,this.component!==!1){var c=this.component.find("i").eq(0);c.length>0?c.css({backgroundColor:b.toString(!0,this.format)}):this.component.css({backgroundColor:b.toString(!0,this.format)})}return b.toString(!1,this.format)},update:function(a){var b;return this.getValue(!1)===!1&&a!==!0||(b=this.updateComponent(),this.updateInput(b),this.updateData(b),this.updatePicker()),b},setValue:function(a){this.color=this.createColor(a),this.update(!0),this.element.trigger({type:"changeColor",color:this.color,value:a})},createColor:function(a){return new b(a?a:null,this.options.colorSelectors,this.options.fallbackColor?this.options.fallbackColor:this.color,this.options.fallbackFormat,this.options.hexNumberSignPrefix)},getValue:function(a){a="undefined"==typeof a?this.options.fallbackColor:a;var b;return b=this.hasInput()?this.input.val():this.element.data("color"),void 0!==b&&""!==b&&null!==b||(b=a),b},hasInput:function(){return this.input!==!1},isDisabled:function(){return this.disabled},disable:function(){return this.hasInput()&&this.input.prop("disabled",!0),this.disabled=!0,this.element.trigger({type:"disable",color:this.color,value:this.getValue()}),!0},enable:function(){return this.hasInput()&&this.input.prop("disabled",!1),this.disabled=!1,this.element.trigger({type:"enable",color:this.color,value:this.getValue()}),!0},currentSlider:null,mousePointer:{left:0,top:0},mousedown:function(b){!b.pageX&&!b.pageY&&b.originalEvent&&b.originalEvent.touches&&(b.pageX=b.originalEvent.touches[0].pageX,b.pageY=b.originalEvent.touches[0].pageY),b.stopPropagation(),b.preventDefault();var c=a(b.target),d=c.closest("div"),e=this.options.horizontal?this.options.slidersHorz:this.options.sliders;if(!d.is(".colorpicker")){if(d.is(".colorpicker-saturation"))this.currentSlider=a.extend({},e.saturation);else if(d.is(".colorpicker-hue"))this.currentSlider=a.extend({},e.hue);else{if(!d.is(".colorpicker-alpha"))return!1;this.currentSlider=a.extend({},e.alpha)}var f=d.offset();this.currentSlider.guide=d.find("i")[0].style,this.currentSlider.left=b.pageX-f.left,this.currentSlider.top=b.pageY-f.top,this.mousePointer={left:b.pageX,top:b.pageY},a(window.document).on({"mousemove.colorpicker":a.proxy(this.mousemove,this),"touchmove.colorpicker":a.proxy(this.mousemove,this),"mouseup.colorpicker":a.proxy(this.mouseup,this),"touchend.colorpicker":a.proxy(this.mouseup,this)}).trigger("mousemove")}return!1},mousemove:function(a){!a.pageX&&!a.pageY&&a.originalEvent&&a.originalEvent.touches&&(a.pageX=a.originalEvent.touches[0].pageX,a.pageY=a.originalEvent.touches[0].pageY),a.stopPropagation(),a.preventDefault();var b=Math.max(0,Math.min(this.currentSlider.maxLeft,this.currentSlider.left+((a.pageX||this.mousePointer.left)-this.mousePointer.left))),c=Math.max(0,Math.min(this.currentSlider.maxTop,this.currentSlider.top+((a.pageY||this.mousePointer.top)-this.mousePointer.top)));return this.currentSlider.guide.left=b+"px",this.currentSlider.guide.top=c+"px",this.currentSlider.callLeft&&this.color[this.currentSlider.callLeft].call(this.color,b/this.currentSlider.maxLeft),this.currentSlider.callTop&&this.color[this.currentSlider.callTop].call(this.color,c/this.currentSlider.maxTop),this.options.format!==!1||"setAlpha"!==this.currentSlider.callTop&&"setAlpha"!==this.currentSlider.callLeft||(1!==this.color.value.a?(this.format="rgba",this.color.origFormat="rgba"):(this.format="hex",this.color.origFormat="hex")),this.update(!0),this.element.trigger({type:"changeColor",color:this.color}),!1},mouseup:function(b){return b.stopPropagation(),b.preventDefault(),a(window.document).off({"mousemove.colorpicker":this.mousemove,"touchmove.colorpicker":this.mousemove,"mouseup.colorpicker":this.mouseup,"touchend.colorpicker":this.mouseup}),!1},change:function(a){this.keyup(a)},keyup:function(a){38===a.keyCode?(this.color.value.a<1&&(this.color.value.a=Math.round(100*(this.color.value.a+.01))/100),this.update(!0)):40===a.keyCode?(this.color.value.a>0&&(this.color.value.a=Math.round(100*(this.color.value.a-.01))/100),this.update(!0)):(this.color=this.createColor(this.input.val()),this.color.origFormat&&this.options.format===!1&&(this.format=this.color.origFormat),this.getValue(!1)!==!1&&(this.updateData(),this.updateComponent(),this.updatePicker())),this.element.trigger({type:"changeColor",color:this.color,value:this.input.val()})}},a.colorpicker=d,a.fn.colorpicker=function(b){var c=Array.prototype.slice.call(arguments,1),e=1===this.length,f=null,g=this.each(function(){var e=a(this),g=e.data("colorpicker"),h="object"==typeof b?b:{};g||(g=new d(this,h),e.data("colorpicker",g)),"string"==typeof b?a.isFunction(g[b])?f=g[b].apply(g,c):(c.length&&(g[b]=c[0]),f=g[b]):f=e});return e?f:g},a.fn.colorpicker.constructor=d});

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

/***/ "../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min.js"
/*!********************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min.js ***!
  \********************************************************************/
(module, exports) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*! jquery-qrcode v0.14.0 - https://larsjung.de/jquery-qrcode/ */
!function(r){"use strict";function t(t,e,n,o){function a(r,t){return r-=o,t-=o,0>r||r>=c||0>t||t>=c?!1:f.isDark(r,t)}function i(r,t,e,n){var o=u.isDark,a=1/l;u.isDark=function(i,u){var f=u*a,c=i*a,l=f+a,g=c+a;return o(i,u)&&(r>l||f>e||t>g||c>n)}}var u={},f=r(n,e);f.addData(t),f.make(),o=o||0;var c=f.getModuleCount(),l=f.getModuleCount()+2*o;return u.text=t,u.level=e,u.version=n,u.moduleCount=l,u.isDark=a,u.addBlank=i,u}function e(r,e,n,o,a){n=Math.max(1,n||1),o=Math.min(40,o||40);for(var i=n;o>=i;i+=1)try{return t(r,e,i,a)}catch(u){}}function n(r,t,e){var n=e.size,o="bold "+e.mSize*n+"px "+e.fontname,a=w("<canvas/>")[0].getContext("2d");a.font=o;var i=a.measureText(e.label).width,u=e.mSize,f=i/n,c=(1-f)*e.mPosX,l=(1-u)*e.mPosY,g=c+f,s=l+u,v=.01;1===e.mode?r.addBlank(0,l-v,n,s+v):r.addBlank(c-v,l-v,g+v,s+v),t.fillStyle=e.fontcolor,t.font=o,t.fillText(e.label,c*n,l*n+.75*e.mSize*n)}function o(r,t,e){var n=e.size,o=e.image.naturalWidth||1,a=e.image.naturalHeight||1,i=e.mSize,u=i*o/a,f=(1-u)*e.mPosX,c=(1-i)*e.mPosY,l=f+u,g=c+i,s=.01;3===e.mode?r.addBlank(0,c-s,n,g+s):r.addBlank(f-s,c-s,l+s,g+s),t.drawImage(e.image,f*n,c*n,u*n,i*n)}function a(r,t,e){w(e.background).is("img")?t.drawImage(e.background,0,0,e.size,e.size):e.background&&(t.fillStyle=e.background,t.fillRect(e.left,e.top,e.size,e.size));var a=e.mode;1===a||2===a?n(r,t,e):(3===a||4===a)&&o(r,t,e)}function i(r,t,e,n,o,a,i,u){r.isDark(i,u)&&t.rect(n,o,a,a)}function u(r,t,e,n,o,a,i,u,f,c){i?r.moveTo(t+a,e):r.moveTo(t,e),u?(r.lineTo(n-a,e),r.arcTo(n,e,n,o,a)):r.lineTo(n,e),f?(r.lineTo(n,o-a),r.arcTo(n,o,t,o,a)):r.lineTo(n,o),c?(r.lineTo(t+a,o),r.arcTo(t,o,t,e,a)):r.lineTo(t,o),i?(r.lineTo(t,e+a),r.arcTo(t,e,n,e,a)):r.lineTo(t,e)}function f(r,t,e,n,o,a,i,u,f,c){i&&(r.moveTo(t+a,e),r.lineTo(t,e),r.lineTo(t,e+a),r.arcTo(t,e,t+a,e,a)),u&&(r.moveTo(n-a,e),r.lineTo(n,e),r.lineTo(n,e+a),r.arcTo(n,e,n-a,e,a)),f&&(r.moveTo(n-a,o),r.lineTo(n,o),r.lineTo(n,o-a),r.arcTo(n,o,n-a,o,a)),c&&(r.moveTo(t+a,o),r.lineTo(t,o),r.lineTo(t,o-a),r.arcTo(t,o,t+a,o,a))}function c(r,t,e,n,o,a,i,c){var l=r.isDark,g=n+a,s=o+a,v=e.radius*a,h=i-1,d=i+1,w=c-1,m=c+1,y=l(i,c),T=l(h,w),p=l(h,c),B=l(h,m),A=l(i,m),E=l(d,m),k=l(d,c),M=l(d,w),C=l(i,w);y?u(t,n,o,g,s,v,!p&&!C,!p&&!A,!k&&!A,!k&&!C):f(t,n,o,g,s,v,p&&C&&T,p&&A&&B,k&&A&&E,k&&C&&M)}function l(r,t,e){var n,o,a=r.moduleCount,u=e.size/a,f=i;for(e.radius>0&&e.radius<=.5&&(f=c),t.beginPath(),n=0;a>n;n+=1)for(o=0;a>o;o+=1){var l=e.left+o*u,g=e.top+n*u,s=u;f(r,t,e,l,g,s,n,o)}if(w(e.fill).is("img")){t.strokeStyle="rgba(0,0,0,0.5)",t.lineWidth=2,t.stroke();var v=t.globalCompositeOperation;t.globalCompositeOperation="destination-out",t.fill(),t.globalCompositeOperation=v,t.clip(),t.drawImage(e.fill,0,0,e.size,e.size),t.restore()}else t.fillStyle=e.fill,t.fill()}function g(r,t){var n=e(t.text,t.ecLevel,t.minVersion,t.maxVersion,t.quiet);if(!n)return null;var o=w(r).data("qrcode",n),i=o[0].getContext("2d");return a(n,i,t),l(n,i,t),o}function s(r){var t=w("<canvas/>").attr("width",r.size).attr("height",r.size);return g(t,r)}function v(r){return w("<img/>").attr("src",s(r)[0].toDataURL("image/png"))}function h(r){var t=e(r.text,r.ecLevel,r.minVersion,r.maxVersion,r.quiet);if(!t)return null;var n,o,a=r.size,i=r.background,u=Math.floor,f=t.moduleCount,c=u(a/f),l=u(.5*(a-c*f)),g={position:"relative",left:0,top:0,padding:0,margin:0,width:a,height:a},s={position:"absolute",padding:0,margin:0,width:c,height:c,"background-color":r.fill},v=w("<div/>").data("qrcode",t).css(g);for(i&&v.css("background-color",i),n=0;f>n;n+=1)for(o=0;f>o;o+=1)t.isDark(n,o)&&w("<div/>").css(s).css({left:l+o*c,top:l+n*c}).appendTo(v);return v}function d(r){return m&&"canvas"===r.render?s(r):m&&"image"===r.render?v(r):h(r)}var w=window.jQuery,m=function(){var r=document.createElement("canvas");return!(!r.getContext||!r.getContext("2d"))}(),y={render:"canvas",minVersion:1,maxVersion:40,ecLevel:"L",left:0,top:0,size:200,fill:"#000",background:null,text:"no text",radius:0,quiet:0,mode:0,mSize:.1,mPosX:.5,mPosY:.5,label:"no label",fontname:"sans",fontcolor:"#000",image:null};w.fn.qrcode=function(r){var t=w.extend({},y,r);return this.each(function(r,e){"canvas"===e.nodeName.toLowerCase()?g(e,t):w(e).append(d(t))})}}(function(){var r=function(){function r(t,e){if("undefined"==typeof t.length)throw new Error(t.length+"/"+e);var n=function(){for(var r=0;r<t.length&&0==t[r];)r+=1;for(var n=new Array(t.length-r+e),o=0;o<t.length-r;o+=1)n[o]=t[o+r];return n}(),o={};return o.getAt=function(r){return n[r]},o.getLength=function(){return n.length},o.multiply=function(t){for(var e=new Array(o.getLength()+t.getLength()-1),n=0;n<o.getLength();n+=1)for(var a=0;a<t.getLength();a+=1)e[n+a]^=i.gexp(i.glog(o.getAt(n))+i.glog(t.getAt(a)));return r(e,0)},o.mod=function(t){if(o.getLength()-t.getLength()<0)return o;for(var e=i.glog(o.getAt(0))-i.glog(t.getAt(0)),n=new Array(o.getLength()),a=0;a<o.getLength();a+=1)n[a]=o.getAt(a);for(var a=0;a<t.getLength();a+=1)n[a]^=i.gexp(i.glog(t.getAt(a))+e);return r(n,0).mod(t)},o}var t=function(t,e){var o=236,i=17,l=t,g=n[e],s=null,v=0,d=null,w=new Array,m={},y=function(r,t){v=4*l+17,s=function(r){for(var t=new Array(r),e=0;r>e;e+=1){t[e]=new Array(r);for(var n=0;r>n;n+=1)t[e][n]=null}return t}(v),T(0,0),T(v-7,0),T(0,v-7),A(),B(),k(r,t),l>=7&&E(r),null==d&&(d=D(l,g,w)),M(d,t)},T=function(r,t){for(var e=-1;7>=e;e+=1)if(!(-1>=r+e||r+e>=v))for(var n=-1;7>=n;n+=1)-1>=t+n||t+n>=v||(e>=0&&6>=e&&(0==n||6==n)||n>=0&&6>=n&&(0==e||6==e)||e>=2&&4>=e&&n>=2&&4>=n?s[r+e][t+n]=!0:s[r+e][t+n]=!1)},p=function(){for(var r=0,t=0,e=0;8>e;e+=1){y(!0,e);var n=a.getLostPoint(m);(0==e||r>n)&&(r=n,t=e)}return t},B=function(){for(var r=8;v-8>r;r+=1)null==s[r][6]&&(s[r][6]=r%2==0);for(var t=8;v-8>t;t+=1)null==s[6][t]&&(s[6][t]=t%2==0)},A=function(){for(var r=a.getPatternPosition(l),t=0;t<r.length;t+=1)for(var e=0;e<r.length;e+=1){var n=r[t],o=r[e];if(null==s[n][o])for(var i=-2;2>=i;i+=1)for(var u=-2;2>=u;u+=1)-2==i||2==i||-2==u||2==u||0==i&&0==u?s[n+i][o+u]=!0:s[n+i][o+u]=!1}},E=function(r){for(var t=a.getBCHTypeNumber(l),e=0;18>e;e+=1){var n=!r&&1==(t>>e&1);s[Math.floor(e/3)][e%3+v-8-3]=n}for(var e=0;18>e;e+=1){var n=!r&&1==(t>>e&1);s[e%3+v-8-3][Math.floor(e/3)]=n}},k=function(r,t){for(var e=g<<3|t,n=a.getBCHTypeInfo(e),o=0;15>o;o+=1){var i=!r&&1==(n>>o&1);6>o?s[o][8]=i:8>o?s[o+1][8]=i:s[v-15+o][8]=i}for(var o=0;15>o;o+=1){var i=!r&&1==(n>>o&1);8>o?s[8][v-o-1]=i:9>o?s[8][15-o-1+1]=i:s[8][15-o-1]=i}s[v-8][8]=!r},M=function(r,t){for(var e=-1,n=v-1,o=7,i=0,u=a.getMaskFunction(t),f=v-1;f>0;f-=2)for(6==f&&(f-=1);;){for(var c=0;2>c;c+=1)if(null==s[n][f-c]){var l=!1;i<r.length&&(l=1==(r[i]>>>o&1));var g=u(n,f-c);g&&(l=!l),s[n][f-c]=l,o-=1,-1==o&&(i+=1,o=7)}if(n+=e,0>n||n>=v){n-=e,e=-e;break}}},C=function(t,e){for(var n=0,o=0,i=0,u=new Array(e.length),f=new Array(e.length),c=0;c<e.length;c+=1){var l=e[c].dataCount,g=e[c].totalCount-l;o=Math.max(o,l),i=Math.max(i,g),u[c]=new Array(l);for(var s=0;s<u[c].length;s+=1)u[c][s]=255&t.getBuffer()[s+n];n+=l;var v=a.getErrorCorrectPolynomial(g),h=r(u[c],v.getLength()-1),d=h.mod(v);f[c]=new Array(v.getLength()-1);for(var s=0;s<f[c].length;s+=1){var w=s+d.getLength()-f[c].length;f[c][s]=w>=0?d.getAt(w):0}}for(var m=0,s=0;s<e.length;s+=1)m+=e[s].totalCount;for(var y=new Array(m),T=0,s=0;o>s;s+=1)for(var c=0;c<e.length;c+=1)s<u[c].length&&(y[T]=u[c][s],T+=1);for(var s=0;i>s;s+=1)for(var c=0;c<e.length;c+=1)s<f[c].length&&(y[T]=f[c][s],T+=1);return y},D=function(r,t,e){for(var n=u.getRSBlocks(r,t),c=f(),l=0;l<e.length;l+=1){var g=e[l];c.put(g.getMode(),4),c.put(g.getLength(),a.getLengthInBits(g.getMode(),r)),g.write(c)}for(var s=0,l=0;l<n.length;l+=1)s+=n[l].dataCount;if(c.getLengthInBits()>8*s)throw new Error("code length overflow. ("+c.getLengthInBits()+">"+8*s+")");for(c.getLengthInBits()+4<=8*s&&c.put(0,4);c.getLengthInBits()%8!=0;)c.putBit(!1);for(;;){if(c.getLengthInBits()>=8*s)break;if(c.put(o,8),c.getLengthInBits()>=8*s)break;c.put(i,8)}return C(c,n)};return m.addData=function(r){var t=c(r);w.push(t),d=null},m.isDark=function(r,t){if(0>r||r>=v||0>t||t>=v)throw new Error(r+","+t);return s[r][t]},m.getModuleCount=function(){return v},m.make=function(){y(!1,p())},m.createTableTag=function(r,t){r=r||2,t="undefined"==typeof t?4*r:t;var e="";e+='<table style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: "+t+"px;",e+='">',e+="<tbody>";for(var n=0;n<m.getModuleCount();n+=1){e+="<tr>";for(var o=0;o<m.getModuleCount();o+=1)e+='<td style="',e+=" border-width: 0px; border-style: none;",e+=" border-collapse: collapse;",e+=" padding: 0px; margin: 0px;",e+=" width: "+r+"px;",e+=" height: "+r+"px;",e+=" background-color: ",e+=m.isDark(n,o)?"#000000":"#ffffff",e+=";",e+='"/>';e+="</tr>"}return e+="</tbody>",e+="</table>"},m.createImgTag=function(r,t){r=r||2,t="undefined"==typeof t?4*r:t;var e=m.getModuleCount()*r+2*t,n=t,o=e-t;return h(e,e,function(t,e){if(t>=n&&o>t&&e>=n&&o>e){var a=Math.floor((t-n)/r),i=Math.floor((e-n)/r);return m.isDark(i,a)?0:1}return 1})},m};t.stringToBytes=function(r){for(var t=new Array,e=0;e<r.length;e+=1){var n=r.charCodeAt(e);t.push(255&n)}return t},t.createStringToBytes=function(r,t){var e=function(){for(var e=s(r),n=function(){var r=e.read();if(-1==r)throw new Error;return r},o=0,a={};;){var i=e.read();if(-1==i)break;var u=n(),f=n(),c=n(),l=String.fromCharCode(i<<8|u),g=f<<8|c;a[l]=g,o+=1}if(o!=t)throw new Error(o+" != "+t);return a}(),n="?".charCodeAt(0);return function(r){for(var t=new Array,o=0;o<r.length;o+=1){var a=r.charCodeAt(o);if(128>a)t.push(a);else{var i=e[r.charAt(o)];"number"==typeof i?(255&i)==i?t.push(i):(t.push(i>>>8),t.push(255&i)):t.push(n)}}return t}};var e={MODE_NUMBER:1,MODE_ALPHA_NUM:2,MODE_8BIT_BYTE:4,MODE_KANJI:8},n={L:1,M:0,Q:3,H:2},o={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7},a=function(){var t=[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],n=1335,a=7973,u=21522,f={},c=function(r){for(var t=0;0!=r;)t+=1,r>>>=1;return t};return f.getBCHTypeInfo=function(r){for(var t=r<<10;c(t)-c(n)>=0;)t^=n<<c(t)-c(n);return(r<<10|t)^u},f.getBCHTypeNumber=function(r){for(var t=r<<12;c(t)-c(a)>=0;)t^=a<<c(t)-c(a);return r<<12|t},f.getPatternPosition=function(r){return t[r-1]},f.getMaskFunction=function(r){switch(r){case o.PATTERN000:return function(r,t){return(r+t)%2==0};case o.PATTERN001:return function(r,t){return r%2==0};case o.PATTERN010:return function(r,t){return t%3==0};case o.PATTERN011:return function(r,t){return(r+t)%3==0};case o.PATTERN100:return function(r,t){return(Math.floor(r/2)+Math.floor(t/3))%2==0};case o.PATTERN101:return function(r,t){return r*t%2+r*t%3==0};case o.PATTERN110:return function(r,t){return(r*t%2+r*t%3)%2==0};case o.PATTERN111:return function(r,t){return(r*t%3+(r+t)%2)%2==0};default:throw new Error("bad maskPattern:"+r)}},f.getErrorCorrectPolynomial=function(t){for(var e=r([1],0),n=0;t>n;n+=1)e=e.multiply(r([1,i.gexp(n)],0));return e},f.getLengthInBits=function(r,t){if(t>=1&&10>t)switch(r){case e.MODE_NUMBER:return 10;case e.MODE_ALPHA_NUM:return 9;case e.MODE_8BIT_BYTE:return 8;case e.MODE_KANJI:return 8;default:throw new Error("mode:"+r)}else if(27>t)switch(r){case e.MODE_NUMBER:return 12;case e.MODE_ALPHA_NUM:return 11;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 10;default:throw new Error("mode:"+r)}else{if(!(41>t))throw new Error("type:"+t);switch(r){case e.MODE_NUMBER:return 14;case e.MODE_ALPHA_NUM:return 13;case e.MODE_8BIT_BYTE:return 16;case e.MODE_KANJI:return 12;default:throw new Error("mode:"+r)}}},f.getLostPoint=function(r){for(var t=r.getModuleCount(),e=0,n=0;t>n;n+=1)for(var o=0;t>o;o+=1){for(var a=0,i=r.isDark(n,o),u=-1;1>=u;u+=1)if(!(0>n+u||n+u>=t))for(var f=-1;1>=f;f+=1)0>o+f||o+f>=t||(0!=u||0!=f)&&i==r.isDark(n+u,o+f)&&(a+=1);a>5&&(e+=3+a-5)}for(var n=0;t-1>n;n+=1)for(var o=0;t-1>o;o+=1){var c=0;r.isDark(n,o)&&(c+=1),r.isDark(n+1,o)&&(c+=1),r.isDark(n,o+1)&&(c+=1),r.isDark(n+1,o+1)&&(c+=1),(0==c||4==c)&&(e+=3)}for(var n=0;t>n;n+=1)for(var o=0;t-6>o;o+=1)r.isDark(n,o)&&!r.isDark(n,o+1)&&r.isDark(n,o+2)&&r.isDark(n,o+3)&&r.isDark(n,o+4)&&!r.isDark(n,o+5)&&r.isDark(n,o+6)&&(e+=40);for(var o=0;t>o;o+=1)for(var n=0;t-6>n;n+=1)r.isDark(n,o)&&!r.isDark(n+1,o)&&r.isDark(n+2,o)&&r.isDark(n+3,o)&&r.isDark(n+4,o)&&!r.isDark(n+5,o)&&r.isDark(n+6,o)&&(e+=40);for(var l=0,o=0;t>o;o+=1)for(var n=0;t>n;n+=1)r.isDark(n,o)&&(l+=1);var g=Math.abs(100*l/t/t-50)/5;return e+=10*g},f}(),i=function(){for(var r=new Array(256),t=new Array(256),e=0;8>e;e+=1)r[e]=1<<e;for(var e=8;256>e;e+=1)r[e]=r[e-4]^r[e-5]^r[e-6]^r[e-8];for(var e=0;255>e;e+=1)t[r[e]]=e;var n={};return n.glog=function(r){if(1>r)throw new Error("glog("+r+")");return t[r]},n.gexp=function(t){for(;0>t;)t+=255;for(;t>=256;)t-=255;return r[t]},n}(),u=function(){var r=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]],t=function(r,t){var e={};return e.totalCount=r,e.dataCount=t,e},e={},o=function(t,e){switch(e){case n.L:return r[4*(t-1)+0];case n.M:return r[4*(t-1)+1];case n.Q:return r[4*(t-1)+2];case n.H:return r[4*(t-1)+3];default:return}};return e.getRSBlocks=function(r,e){var n=o(r,e);if("undefined"==typeof n)throw new Error("bad rs block @ typeNumber:"+r+"/errorCorrectLevel:"+e);for(var a=n.length/3,i=new Array,u=0;a>u;u+=1)for(var f=n[3*u+0],c=n[3*u+1],l=n[3*u+2],g=0;f>g;g+=1)i.push(t(c,l));return i},e}(),f=function(){var r=new Array,t=0,e={};return e.getBuffer=function(){return r},e.getAt=function(t){var e=Math.floor(t/8);return 1==(r[e]>>>7-t%8&1)},e.put=function(r,t){for(var n=0;t>n;n+=1)e.putBit(1==(r>>>t-n-1&1))},e.getLengthInBits=function(){return t},e.putBit=function(e){var n=Math.floor(t/8);r.length<=n&&r.push(0),e&&(r[n]|=128>>>t%8),t+=1},e},c=function(r){var n=e.MODE_8BIT_BYTE,o=t.stringToBytes(r),a={};return a.getMode=function(){return n},a.getLength=function(r){return o.length},a.write=function(r){for(var t=0;t<o.length;t+=1)r.put(o[t],8)},a},l=function(){var r=new Array,t={};return t.writeByte=function(t){r.push(255&t)},t.writeShort=function(r){t.writeByte(r),t.writeByte(r>>>8)},t.writeBytes=function(r,e,n){e=e||0,n=n||r.length;for(var o=0;n>o;o+=1)t.writeByte(r[o+e])},t.writeString=function(r){for(var e=0;e<r.length;e+=1)t.writeByte(r.charCodeAt(e))},t.toByteArray=function(){return r},t.toString=function(){var t="";t+="[";for(var e=0;e<r.length;e+=1)e>0&&(t+=","),t+=r[e];return t+="]"},t},g=function(){var r=0,t=0,e=0,n="",o={},a=function(r){n+=String.fromCharCode(i(63&r))},i=function(r){if(0>r);else{if(26>r)return 65+r;if(52>r)return 97+(r-26);if(62>r)return 48+(r-52);if(62==r)return 43;if(63==r)return 47}throw new Error("n:"+r)};return o.writeByte=function(n){for(r=r<<8|255&n,t+=8,e+=1;t>=6;)a(r>>>t-6),t-=6},o.flush=function(){if(t>0&&(a(r<<6-t),r=0,t=0),e%3!=0)for(var o=3-e%3,i=0;o>i;i+=1)n+="="},o.toString=function(){return n},o},s=function(r){var t=r,e=0,n=0,o=0,a={};a.read=function(){for(;8>o;){if(e>=t.length){if(0==o)return-1;throw new Error("unexpected end of file./"+o)}var r=t.charAt(e);if(e+=1,"="==r)return o=0,-1;r.match(/^\s$/)||(n=n<<6|i(r.charCodeAt(0)),o+=6)}var a=n>>>o-8&255;return o-=8,a};var i=function(r){if(r>=65&&90>=r)return r-65;if(r>=97&&122>=r)return r-97+26;if(r>=48&&57>=r)return r-48+52;if(43==r)return 62;if(47==r)return 63;throw new Error("c:"+r)};return a},v=function(r,t){var e=r,n=t,o=new Array(r*t),a={};a.setPixel=function(r,t,n){o[t*e+r]=n},a.write=function(r){r.writeString("GIF87a"),r.writeShort(e),r.writeShort(n),r.writeByte(128),r.writeByte(0),r.writeByte(0),r.writeByte(0),r.writeByte(0),r.writeByte(0),r.writeByte(255),r.writeByte(255),r.writeByte(255),r.writeString(","),r.writeShort(0),r.writeShort(0),r.writeShort(e),r.writeShort(n),r.writeByte(0);var t=2,o=u(t);r.writeByte(t);for(var a=0;o.length-a>255;)r.writeByte(255),r.writeBytes(o,a,255),a+=255;r.writeByte(o.length-a),r.writeBytes(o,a,o.length-a),r.writeByte(0),r.writeString(";")};var i=function(r){var t=r,e=0,n=0,o={};return o.write=function(r,o){if(r>>>o!=0)throw new Error("length over");for(;e+o>=8;)t.writeByte(255&(r<<e|n)),o-=8-e,r>>>=8-e,n=0,e=0;n=r<<e|n,e+=o},o.flush=function(){e>0&&t.writeByte(n)},o},u=function(r){for(var t=1<<r,e=(1<<r)+1,n=r+1,a=f(),u=0;t>u;u+=1)a.add(String.fromCharCode(u));a.add(String.fromCharCode(t)),a.add(String.fromCharCode(e));var c=l(),g=i(c);g.write(t,n);var s=0,v=String.fromCharCode(o[s]);for(s+=1;s<o.length;){var h=String.fromCharCode(o[s]);s+=1,a.contains(v+h)?v+=h:(g.write(a.indexOf(v),n),a.size()<4095&&(a.size()==1<<n&&(n+=1),a.add(v+h)),v=h)}return g.write(a.indexOf(v),n),g.write(e,n),g.flush(),c.toByteArray()},f=function(){var r={},t=0,e={};return e.add=function(n){if(e.contains(n))throw new Error("dup key:"+n);r[n]=t,t+=1},e.size=function(){return t},e.indexOf=function(t){return r[t]},e.contains=function(t){return"undefined"!=typeof r[t]},e};return a},h=function(r,t,e,n){for(var o=v(r,t),a=0;t>a;a+=1)for(var i=0;r>i;i+=1)o.setPixel(i,a,e(i,a));var u=l();o.write(u);for(var f=g(),c=u.toByteArray(),s=0;s<c.length;s+=1)f.writeByte(c[s]);f.flush();var h="";return h+="<img",h+=' src="',h+="data:image/gif;base64,",h+=f,h+='"',h+=' width="',h+=r,h+='"',h+=' height="',h+=t,h+='"',n&&(h+=' alt="',h+=n,h+='"'),h+="/>"};return t}();return function(r){ true?!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (r),
		__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
		(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)):0}(function(){return r}),!function(r){r.stringToBytes=function(r){function t(r){for(var t=[],e=0;e<r.length;e++){var n=r.charCodeAt(e);128>n?t.push(n):2048>n?t.push(192|n>>6,128|63&n):55296>n||n>=57344?t.push(224|n>>12,128|n>>6&63,128|63&n):(e++,n=65536+((1023&n)<<10|1023&r.charCodeAt(e)),t.push(240|n>>18,128|n>>12&63,128|n>>6&63,128|63&n))}return t}return t(r)}}(r),r}());

/***/ },

/***/ "../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.js"
/*!***********************************************************************************!*\
  !*** ../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.js ***!
  \***********************************************************************************/
() {

/*! Copyright (c) 2011 Piotr Rochala (http://rocha.la)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 1.3.6
 *
 */
(function($) {

  $.fn.extend({
    slimScroll: function(options) {

      var defaults = {

        // width in pixels of the visible scroll area
        width : 'auto',

        // height in pixels of the visible scroll area
        height : '250px',

        // width in pixels of the scrollbar and rail
        size : '7px',

        // scrollbar color, accepts any hex/color value
        color: '#000',

        // scrollbar position - left/right
        position : 'right',

        // distance in pixels between the side edge and the scrollbar
        distance : '1px',

        // default scroll position on load - top / bottom / $('selector')
        start : 'top',

        // sets scrollbar opacity
        opacity : .4,

        // enables always-on mode for the scrollbar
        alwaysVisible : false,

        // check if we should hide the scrollbar when user is hovering over
        disableFadeOut : false,

        // sets visibility of the rail
        railVisible : false,

        // sets rail color
        railColor : '#333',

        // sets rail opacity
        railOpacity : .2,

        // whether  we should use jQuery UI Draggable to enable bar dragging
        railDraggable : true,

        // defautlt CSS class of the slimscroll rail
        railClass : 'slimScrollRail',

        // defautlt CSS class of the slimscroll bar
        barClass : 'slimScrollBar',

        // defautlt CSS class of the slimscroll wrapper
        wrapperClass : 'slimScrollDiv',

        // check if mousewheel should scroll the window if we reach top/bottom
        allowPageScroll : false,

        // scroll amount applied to each mouse wheel step
        wheelStep : 20,

        // scroll amount applied when user is using gestures
        touchScrollStep : 200,

        // sets border radius
        borderRadius: '7px',

        // sets border radius of the rail
        railBorderRadius : '7px'
      };

      var o = $.extend(defaults, options);

      // do it for every element that matches selector
      this.each(function(){

        var isOverPanel, isOverBar, isDragg, queueHide, touchDif,
            barHeight, percentScroll, lastScroll,
            divS = '<div></div>',
            minBarHeight = 30,
            releaseScroll = false;

        // used in event handlers and for better minification
        var me = $(this);

        // ensure we are not binding it again
        if (me.parent().hasClass(o.wrapperClass))
        {
          // start from last bar position
          var offset = me.scrollTop();

          // find bar and rail
          bar = me.closest('.' + o.barClass);
          rail = me.closest('.' + o.railClass);

          getBarHeight();

          // check if we should scroll existing instance
          if ($.isPlainObject(options))
          {
            // Pass height: auto to an existing slimscroll object to force a resize after contents have changed
            if ( 'height' in options && options.height == 'auto' ) {
              me.parent().css('height', 'auto');
              me.css('height', 'auto');
              var height = me.parent().parent().height();
              me.parent().css('height', height);
              me.css('height', height);
            }

            if ('scrollTo' in options)
            {
              // jump to a static point
              offset = parseInt(o.scrollTo);
            }
            else if ('scrollBy' in options)
            {
              // jump by value pixels
              offset += parseInt(o.scrollBy);
            }
            else if ('destroy' in options)
            {
              // remove slimscroll elements
              bar.remove();
              rail.remove();
              me.unwrap();
              return;
            }

            // scroll content by the given offset
            scrollContent(offset, false, true);
          }

          return;
        }
        else if ($.isPlainObject(options))
        {
          if ('destroy' in options)
          {
            return;
          }
        }

        // optionally set height to the parent's height
        o.height = (o.height == 'auto') ? me.parent().height() : o.height;

        // wrap content
        var wrapper = $(divS)
            .addClass(o.wrapperClass)
            .css({
              position: 'relative',
              overflow: 'hidden',
              width: o.width,
              height: o.height
            });

        // update style for the div
        me.css({
          overflow: 'hidden',
          width: o.width,
          height: o.height
        });

        // create scrollbar rail
        var rail = $(divS)
            .addClass(o.railClass)
            .css({
              width: o.size,
              height: '100%',
              position: 'absolute',
              top: 0,
              display: (o.alwaysVisible && o.railVisible) ? 'block' : 'none',
              'border-radius': o.railBorderRadius,
              background: o.railColor,
              opacity: o.railOpacity,
              zIndex: 90
            });

        // create scrollbar
        var bar = $(divS)
            .addClass(o.barClass)
            .css({
              background: o.color,
              width: o.size,
              position: 'absolute',
              top: 0,
              opacity: o.opacity,
              display: o.alwaysVisible ? 'block' : 'none',
              'border-radius' : o.borderRadius,
              BorderRadius: o.borderRadius,
              MozBorderRadius: o.borderRadius,
              WebkitBorderRadius: o.borderRadius,
              zIndex: 99
            });

        // set position
        var posCss = (o.position == 'right') ? { right: o.distance } : { left: o.distance };
        rail.css(posCss);
        bar.css(posCss);

        // wrap it
        me.wrap(wrapper);

        // append to parent div
        me.parent().append(bar);
        me.parent().append(rail);

        // make it draggable and no longer dependent on the jqueryUI
        if (o.railDraggable){
          bar.bind("mousedown", function(e) {
            var $doc = $(document);
            isDragg = true;
            t = parseFloat(bar.css('top'));
            pageY = e.pageY;

            $doc.bind("mousemove.slimscroll", function(e){
              currTop = t + e.pageY - pageY;
              bar.css('top', currTop);
              scrollContent(0, bar.position().top, false);// scroll content
            });

            $doc.bind("mouseup.slimscroll", function(e) {
              isDragg = false;hideBar();
              $doc.unbind('.slimscroll');
            });
            return false;
          }).bind("selectstart.slimscroll", function(e){
            e.stopPropagation();
            e.preventDefault();
            return false;
          });
        }

        // on rail over
        rail.hover(function(){
          showBar();
        }, function(){
          hideBar();
        });

        // on bar over
        bar.hover(function(){
          isOverBar = true;
        }, function(){
          isOverBar = false;
        });

        // show on parent mouseover
        me.hover(function(){
          isOverPanel = true;
          showBar();
          hideBar();
        }, function(){
          isOverPanel = false;
          hideBar();
        });

        // support for mobile
        me.bind('touchstart', function(e,b){
          if (e.originalEvent.touches.length)
          {
            // record where touch started
            touchDif = e.originalEvent.touches[0].pageY;
          }
        });

        me.bind('touchmove', function(e){
          // prevent scrolling the page if necessary
          if(!releaseScroll)
          {
            e.originalEvent.preventDefault();
          }
          if (e.originalEvent.touches.length)
          {
            // see how far user swiped
            var diff = (touchDif - e.originalEvent.touches[0].pageY) / o.touchScrollStep;
            // scroll content
            scrollContent(diff, true);
            touchDif = e.originalEvent.touches[0].pageY;
          }
        });

        // set up initial height
        getBarHeight();

        // check start position
        if (o.start === 'bottom')
        {
          // scroll content to bottom
          bar.css({ top: me.outerHeight() - bar.outerHeight() });
          scrollContent(0, true);
        }
        else if (o.start !== 'top')
        {
          // assume jQuery selector
          scrollContent($(o.start).position().top, null, true);

          // make sure bar stays hidden
          if (!o.alwaysVisible) { bar.hide(); }
        }

        // attach scroll events
        attachWheel(this);

        function _onWheel(e)
        {
          // use mouse wheel only when mouse is over
          if (!isOverPanel) { return; }

          var e = e || window.event;

          var delta = 0;
          if (e.wheelDelta) { delta = -e.wheelDelta/120; }
          if (e.detail) { delta = e.detail / 3; }

          var target = e.target || e.srcTarget || e.srcElement;
          if ($(target).closest('.' + o.wrapperClass).is(me.parent())) {
            // scroll content
            scrollContent(delta, true);
          }

          // stop window scroll
          if (e.preventDefault && !releaseScroll) { e.preventDefault(); }
          if (!releaseScroll) { e.returnValue = false; }
        }

        function scrollContent(y, isWheel, isJump)
        {
          releaseScroll = false;
          var delta = y;
          var maxTop = me.outerHeight() - bar.outerHeight();

          if (isWheel)
          {
            // move bar with mouse wheel
            delta = parseInt(bar.css('top')) + y * parseInt(o.wheelStep) / 100 * bar.outerHeight();

            // move bar, make sure it doesn't go out
            delta = Math.min(Math.max(delta, 0), maxTop);

            // if scrolling down, make sure a fractional change to the
            // scroll position isn't rounded away when the scrollbar's CSS is set
            // this flooring of delta would happened automatically when
            // bar.css is set below, but we floor here for clarity
            delta = (y > 0) ? Math.ceil(delta) : Math.floor(delta);

            // scroll the scrollbar
            bar.css({ top: delta + 'px' });
          }

          // calculate actual scroll amount
          percentScroll = parseInt(bar.css('top')) / (me.outerHeight() - bar.outerHeight());
          delta = percentScroll * (me[0].scrollHeight - me.outerHeight());

          if (isJump)
          {
            delta = y;
            var offsetTop = delta / me[0].scrollHeight * me.outerHeight();
            offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
            bar.css({ top: offsetTop + 'px' });
          }

          // scroll content
          me.scrollTop(delta);

          // fire scrolling event
          me.trigger('slimscrolling', ~~delta);

          // ensure bar is visible
          showBar();

          // trigger hide when scroll is stopped
          hideBar();
        }

        function attachWheel(target)
        {
          if (window.addEventListener)
          {
            target.addEventListener('DOMMouseScroll', _onWheel, false );
            target.addEventListener('mousewheel', _onWheel, false );
          }
          else
          {
            document.attachEvent("onmousewheel", _onWheel)
          }
        }

        function getBarHeight()
        {
          // calculate scrollbar height and make sure it is not too small
          barHeight = Math.max((me.outerHeight() / me[0].scrollHeight) * me.outerHeight(), minBarHeight);
          bar.css({ height: barHeight + 'px' });

          // hide scrollbar if content is not long enough
          var display = barHeight == me.outerHeight() ? 'none' : 'block';
          bar.css({ display: display });
        }

        function showBar()
        {
          // recalculate bar height
          getBarHeight();
          clearTimeout(queueHide);

          // when bar reached top or bottom
          if (percentScroll == ~~percentScroll)
          {
            //release wheel
            releaseScroll = o.allowPageScroll;

            // publish approporiate event
            if (lastScroll != percentScroll)
            {
              var msg = (~~percentScroll == 0) ? 'top' : 'bottom';
              me.trigger('slimscroll', msg);
            }
          }
          else
          {
            releaseScroll = false;
          }
          lastScroll = percentScroll;

          // show only when required
          if(barHeight >= me.outerHeight()) {
            //allow window scroll
            releaseScroll = true;
            return;
          }
          bar.stop(true,true).fadeIn('fast');
          if (o.railVisible) { rail.stop(true,true).fadeIn('fast'); }
        }

        function hideBar()
        {
          // only hide when options allow it
          if (!o.alwaysVisible)
          {
            queueHide = setTimeout(function(){
              if (!(o.disableFadeOut && isOverPanel) && !isOverBar && !isDragg)
              {
                bar.fadeOut('slow');
                rail.fadeOut('slow');
              }
            }, 1000);
          }
        }

      });

      // maintain chainability
      return this;
    }
  });

  $.fn.extend({
    slimscroll: $.fn.slimScroll
  });

})(jQuery);

/***/ },

/***/ "./WebContent/js/usermanagement_main.js"
/*!**********************************************!*\
  !*** ./WebContent/js/usermanagement_main.js ***!
  \**********************************************/
() {

"use strict";
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



const $ = window.$;
const localise = window.localise;
const globals = window.globals;
const moment = window.moment;


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
		gPanel,
		gNumbers = [];

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
			// Set the user name to the same value as ident if it has not been specified
			if(!user.name || user.name.trim().length === 0) {
				user.name = user.ident;
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
					if(handleLogout(data)) {
						getLoggedInUser(userKnown, false, false, getOrganisations, false,
							false, getEnterprises, undefined);
						$('#create_organisation_popup').modal("hide");
					}
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
				success: function(data) {
					removeHourglass();
					if(handleLogout(data)) {
						$('#create_enterprise_popup').modal("hide");
						getEnterprises();
					}
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
				updateProjectList(true, globals.gCurrentProject, undefined, $('.project_list'));
				updateProjectList(false, globals.gCurrentProject, undefined, $('.project_list_min'));
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
			h[++idx] = '" class="btn btn-default btn-sm project_edit btn-info">';
			h[++idx] = '<i class="far fa-edit"></i></button>';
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
/*!*****************************************!*\
  !*** ./WebContent/js/userManagement.js ***!
  \*****************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _smapServer_WebContent_js_libs_bootbox_min__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/bootbox.min */ "../smapServer/WebContent/js/libs/bootbox.min.js");
/* harmony import */ var _smapServer_WebContent_js_libs_bootbox_min__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_bootbox_min__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _smapServer_WebContent_js_app_localise__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/localise */ "../smapServer/WebContent/js/app/localise.js");
/* harmony import */ var _smapServer_WebContent_js_app_globals__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/globals */ "../smapServer/WebContent/js/app/globals.js");
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/app/common */ "../smapServer/WebContent/js/app/common.js");
/* harmony import */ var _smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_app_common__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll */ "../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.js");
/* harmony import */ var _smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_wb_plugins_slimscroll_jquery_slimscroll__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_colorpicker_min__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/bootstrap-colorpicker.min */ "../smapServer/WebContent/js/libs/bootstrap-colorpicker.min.js");
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_colorpicker_min__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_bootstrap_colorpicker_min__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47 */ "../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47.js");
/* harmony import */ var _smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_bootstrap_datetimepicker_4_17_47__WEBPACK_IMPORTED_MODULE_6__);
/* harmony import */ var _smapServer_WebContent_js_libs_jquery_qrcode_0_14_0_min__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../../../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min */ "../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min.js");
/* harmony import */ var _smapServer_WebContent_js_libs_jquery_qrcode_0_14_0_min__WEBPACK_IMPORTED_MODULE_7___default = /*#__PURE__*/__webpack_require__.n(_smapServer_WebContent_js_libs_jquery_qrcode_0_14_0_min__WEBPACK_IMPORTED_MODULE_7__);
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












const moment = window.moment;
const localise = window.localise;
const globals = window.globals;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;
window.bootbox = (_smapServer_WebContent_js_libs_bootbox_min__WEBPACK_IMPORTED_MODULE_0___default());

localise.initLocale(gUserLocale).then(function () {
	window.moment = window.moment || moment;

	Promise.resolve(/*! import() eager */).then(__webpack_require__.t.bind(__webpack_require__, /*! ./usermanagement_main */ "./WebContent/js/usermanagement_main.js", 23));
});

})();

/******/ })()
;