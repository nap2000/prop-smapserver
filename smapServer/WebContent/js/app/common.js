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


/*
 * Convert a choice list name into a valid jquery class name
 */
function jq(choiceList) {

	var c;

	c = choiceList.replace( /(:|\.|\[|\]|,)/g, "\\$1" );
	return c;
}

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
function updateProjectList(addAll, projectId, callback) {

	var $projectSelect = $('.project_list'),
		i,
		h = [],
		idx = -1,
		updateCurrentProject = true;

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
			updateCurrentProject = false;
		}
	}
	$projectSelect.empty().append(h.join(''));

	// If for some reason the user's default project is no longer available then
	//  set the default project to the first project in the list
	//  if the list is empty then set the default project to undefined
	if(updateCurrentProject && globals.gProjectList[0]) {
		globals.gCurrentProject = globals.gProjectList[0].id;		// Update the current project id
		globals.gCurrentSurvey = -1;
		globals.gCurrentTaskGroup = undefined;
	} else if(updateCurrentProject) {
		globals.gCurrentProject = -1;		// Update the current project id
		globals.gCurrentSurvey = -1;
		globals.gCurrentTaskGroup = undefined;
	}

	saveCurrentProject(globals.gCurrentProject,
		globals.gCurrentSurvey,
		globals.gCurrentTaskGroup);

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
			globals.gProjectList = data;
			updateProjectList(getAll, projectId, callback);
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert("Error: Failed to get list of projects: " + err);
			}
		}
	});
}

/*
 * Save the time of the last alert for the user
 */
function saveLastAlert(lastAlert, seen) {

	var alertStatus = {
		lastalert: lastAlert,
		seen: seen
	}

	$.ajax({
		type: "POST",
		contentType: "application/json",
		url: "/surveyKPI/user/alertstatus",
		cache: false,
		data: {
			alertstatus: JSON.stringify(alertStatus)
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
			contentType: "application/json",
			url: "/surveyKPI/user/currentproject",
			cache: false,
			data: { user: userString },
			success: function(data, status) {
				removeHourglass();
			}, error: function(data, status) {
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

		var groupString = JSON.stringify(groupSurvey);

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/json",
			url: "/surveyKPI/user/groupsurvey",
			cache: false,
			data: {groupSurvey: groupString},
			success: function (data, status) {
				removeHourglass();
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

		$elem.empty();
		$.each(data, function(j, item) {
			$elem.append('<option value="' + item + '">' + htmlEncode(item) + '</option>');
		});
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

		var defaultTemplateId,
			fromSettingsTemplateId;

		$elem.empty();
		$elem.append('<option value="-2">' + localise.set["c_auto"] + '</option>');
		$elem.append('<option value="-1">' + localise.set["c_none"] + '</option>');
		$.each(data, function(j, item) {
			if(item.default_template) {
				defaultTemplateId = item.id;
			} else if(item.fromSettings) {
				fromSettingsTemplateId = item.id;
			}
			$elem.append('<option value="' + item.id + '">' + htmlEncode(item.name) + '</option>');
		});
		if(typeof defaultTemplateId !== "undefined") {
			$elem.val(defaultTemplateId);
		} else if(typeof fromSettingsTemplateId !== "undefined") {
			$elem.val(fromSettingsTemplateId)
		} else {
			$elem.val(-2);		// Set to auto
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

			$('#modify_me_popup').dialog("option", "title", data.name + "@" + data.organisation_name);
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

						var user = globals.gLoggedInUser,
							userList = [],
							error = false,
							userList;

						user.name = $('#me_name').val();
						user.language = $('#me_language').val();
						user.email = $('#me_email').val();
						if($('#me_password').is(':visible')) {
							user.password = $('#me_password').val();
							if($('#me_password_confirm').val() !== user.password) {
								error = true;
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
				}, {
					text: "Logout",
					click: function() {
						logout();
						$(this).dialog("close");
					}

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
 * Logout function
 */
function logout() {

	try {
		localStorage.setItem('navbar_color', undefined);
		localStorage.setItem('navbar_text_color', undefined);
		localStorage.setItem('main_logo', undefined);
	} catch (e) {

	}

	jQuery.ajax({
		type: "GET",
		cache: false,
		url: "/surveyKPI/logout",
		beforeSend: function(xhr){xhr.setRequestHeader("Authorization","Basic YXNkc2E6");},
		username: "shkdhasfkhd",
		password: "sieinkdnfkdf",
		error: function(data, status) {
			window.location.href="/logout.html";
		},
		success: function(data,status) {
			window.location.href="/logout.html";
		}
	});
}

/*
 * Enable the user profile button
 */
function enableUserProfileBS () {


	/*
	 * User logout
	 */
	$('#userProfileLogout').click(function() {
		logout();
	});

	$("#modify_me_popup :input").keydown(function() {
		$("#me_alert").hide();
	});

	/*
	 * Save the user profile
	 */
	$('#userProfileSave').click(function() {
		var user = globals.gLoggedInUser,
			userList = [],
			error = false,
			userList;

		user.name = $('#me_name').val();
		user.language = $('#me_language').val();
		user.email = $('#me_email').val();
		if($('#me_password').is(':visible')) {
			user.password = $('#me_password').val();
			if($('#me_password_confirm').val() !== user.password) {
				error = true;
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
 * Save the currently logged on user's details
 */
function saveCurrentUser(user, $dialog) {

	var userString = JSON.stringify(user);
	addHourglass();
	$.ajax({
		type: "POST",
		cache: false,
		contentType: "application/json",
		dataType: 'json',
		url: "/surveyKPI/user?x=x", // Terminate url with ? so that the service worker will pick it out
		data: { user: userString },
		success: function(data) {
			removeHourglass();
			if(data.error) {
				if($dialog) {
					$('#me_alert').removeClass('alert-success d-none').addClass('alert-danger').text(data.msg).show();
				} else {
					alert(localise.set["c_error"] + " : " + data.msg);  // legacy non bootstrap
				}
			} else if($dialog) {
				$dialog.modal("hide");
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
		contentType: "application/json",
		cache: true,
		success: function(data) {
			removeHourglass();

			if(typeof callback == "function") {
				callback(data);
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
	$('#timezone').html(localise.set["c_tz"] + ": " + globals.gTimezone);   // Show timezone where this is enabled
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
	} else {
		addUserDetailsPopup();	// legacy
	}
	getAvailableTimeZones(showTimeZones);
}

function getLoggedInUser(callback, getAll, getProjects, getOrganisationsFn, hideUserDetails,
                         dontGetCurrentSurvey, getEnterprisesFn, getServerDetailsFn) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/user",
		contentType: "application/json",
		cache: false,
		success: function(data) {
			removeHourglass();

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

			if(data.timezone) {
				globals.gTimezone = data.timezone;
			} else {
				globals.gTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			}
			$('#u_tz').val(globals.gTimezone);

			if(!hideUserDetails) {
				updateUserDetails(data, getOrganisationsFn, getEnterprisesFn, getServerDetailsFn);
			}

			if(!dontGetCurrentSurvey) {	// Hack, on edit screen current survey is set as parameter not from the user's defaults
				globals.gCurrentSurvey = data.current_survey_id;
			}
			globals.gCurrentProject = data.current_project_id;
			globals.gCurrentTaskGroup = data.current_task_group_id;
			$('#projectId').val(globals.gCurrentProject);		// Set the project value for the hidden field in template upload
			if(data.groupSurveys) {
				for(i = 0; i < data.groupSurveys.length; i++) {
					globals.gGroupSurveys[data.groupSurveys[i].sId] = data.groupSurveys[i].groupIdent;
					globals.gSubForms[data.groupSurveys[i].sId] = data.groupSurveys[i].fName;
				}
			}

			setOrganisationTheme();

			if(getProjects) {
				getMyProjects(globals.gCurrentProject, callback, getAll);	// Get projects
			} else {
				if(typeof callback !== "undefined") {
					callback(globals.gCurrentSurvey);				// Call the callback with the correct current project
				}
			}

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0 || xhr.status == 401) {
				return;  // Not an error or an authorisation error which is handled by the service worker
			} else {
				console.log("Error: Failed to get user details: " + err);

				var msg = localise.set["c_error"] + ": ";
				if(err && err.indexOf('Unauthorized') >= 0) {
					msg += localise.set["c_auth"];
				} else {
					msg += err;
				}
				alert(msg);
			}
		}
	});
}

/*
 * Get the users queries
 */
function getQueries(published) {

	var url="/surveyKPI/query" + (published ? "?published=true" : "");

	addHourglass();

	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			var h = [],
				idx = -1,
				i,
				item,
				$elem = $('#export_query');

			removeHourglass();

			if(data && data.length > 0) {
				for(i = 0; i < data.length; i++) {
					item = data[i];
					h[++idx] = '<option value="';
					h[++idx] = item.id;
					h[++idx] = '">';
					h[++idx] = '<td>';
					h[++idx] = htmlEncode(item.name);
					h[++idx] = '</option>';
				}
			}

			$elem.html(h.join(''));

		}, error: function(xhr, textStatus, err) {

			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert("Error: Failed to get list of queriess: " + err);
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
 * Writes status to   .upload_file_msg
 */
function uploadFiles(url, formName, callback1, param, callback2) {

	var f = document.forms.namedItem(formName),
		formData = new FormData(f);

	url = addUrlParam(url, "getlist=true");
	addHourglass();
	$('.submitFiles').addClass('disabled');
	$.ajax({
		url: url,
		type: 'POST',
		xhr: function () {
			var myXhr = $.ajaxSettings.xhr();
			if(myXhr.upload){
				myXhr.upload.addEventListener('progress', progressFn, false);
			}
			return myXhr;
		},
		data: formData,
		cache: false,
		contentType: false,
		processData:false,
		success: function(data) {
			removeHourglass();
			var callbackParam = param,
				cb1 = callback1,
				cb2 = callback2;
			$('.upload_file_msg').removeClass('alert-danger').addClass('alert-success').html(localise.set["c_success"]);
			if(typeof cb1 === "function") {
				cb1(data, callbackParam);
			}
			if(typeof cb2 === "function") {
				cb2(data);
			}
			document.forms.namedItem(formName).reset();

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			document.forms.namedItem(formName).reset();
			$('.submitFiles').removeClass('disabled');
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				var msg = xhr.responseText;
				if(msg && msg.indexOf("no tags") >= 0) {
					msg = localise.set["msg_u_nt"];
				} else {
					msg = localise.set["msg_u_f"] + " : " + msg;
				}
				$('.upload_file_msg').removeClass('alert-success').addClass('alert-danger').html(msg);

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
 * Progress function for the uploading of files
 */
function progressFn(e) {
	if(e.lengthComputable){
		var w = (100.0 * e.loaded) / e.total;
		$('.progress-bar').css('width', w+'%').attr('aria-valuenow', w);
	}
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
 */
function refreshMediaView(data, sId) {

	var i,
		survey = globals.model.survey,
		$element,
		h = [],
		idx = -1,
		files;

	if(survey && sId) {
		// Set the display name
		$('.formName').text(survey.displayName);
		$('#survey_id').val(sId);
		gSId = sId;
	}

	if(data) {
		files = data.files;

		if(sId) {
			$element = $('#filesSurvey');
		} else {
			$element = $('#filesOrg');
		}

		for(i = 0; i < files.length; i++){
			h[++idx] = '<tr class="';
			h[++idx] = files[i].type;
			h[++idx] = '">';
			h[++idx] = '<td class="preview">';
			h[++idx] = '<a target="_blank" href="';
			h[++idx] = files[i].url;
			if(files[i].url.indexOf("?") < 0) {     // Add some random text to prevent caching on identical file names
				h[++idx] = "?";
			} else {
				h[++idx] = "&";
			}
			h[++idx] = "_v" + new Date().getTime().toString();
			h[++idx] = '">';
			if(files[i].type == "audio") {
				h[++idx] = addAudioIcon();
			} else if(files[i].type == "geojson") {
				h[++idx] = addVectorMapIcon();
			} else {
				h[++idx] = '<img width="100" height="100" src="';
				h[++idx] = files[i].thumbnailUrl + addCacheBuster(files[i].thumbnailUrl);
				h[++idx] = '" alt="';
				h[++idx] = htmlEncode(files[i].name);
				h[++idx] = '">';
			}
			h[++idx] = '</a>';
			h[++idx] = '</td>';
			h[++idx] = '<td class="filename">';
			h[++idx] = '<p>';
			h[++idx] = htmlEncode(files[i].name);
			h[++idx] = '</p>';
			h[++idx] = '</td>';
			h[++idx] = '<td class="mediaManage">';
			h[++idx] = localTime(files[i].modified);
			h[++idx] = '</td>';
			h[++idx] = '<td class="mediaManage">';
			h[++idx] = '<p>';
			h[++idx] = files[i].size;
			h[++idx] = '</p>';
			h[++idx] = '</td>';
			h[++idx] = '<td class="mediaManage">';
			h[++idx] = '<button class="media_del btn btn-danger" data-url="';
			h[++idx] = files[i].deleteUrl;
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

		}


		$element.html(h.join(""));

		$('.media_del', $element).click(function () {
			var surveyId = sId,
				url = $(this).data('url'),
				idx = url.lastIndexOf('/'),
				filename = url.substring(idx + 1);

			if(confirm(localise.set["msg_confirm_del"] + filename)) {
				delete_media(url, surveyId);
			}
		});

	}

	// If this is the organisational view we can refresh the list of choices for selecting vector maps
	if(!sId) {
		refreshVectorSelects(data);
	}
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

function getFilesFromServer(url, sId, callback, getall) {

	var hasParams = false;
	if(sId) {
		gSId = sId;
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
			var surveyId = sId;
			callback(data, surveyId);

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				$('.upload_file_msg').removeClass('alert-success').addClass('alert-danger').html("Error: " + err);
			}
		}
	});
}

/*
 * Delete a media file
 */
function delete_media(url, sId) {
	addHourglass();
	$.ajax({
		url: url,
		type: 'DELETE',
		cache: false,
		success: function(data) {
			removeHourglass();
			var surveyId = sId;
			refreshMediaViewManage(data, surveyId);

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				$('.upload_file_msg').removeClass('alert-success').addClass('alert-danger').html("Error: " + err);
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
function loadSurveys(projectId, selector, getDeleted, addAll, callback, useIdx) {

	var url="/surveyKPI/surveys?projectId=" + projectId + "&blocked=true";

	if(selector === undefined) {
		selector = ".survey_select";	// Update the entire class of survey select controls
	}

	if(typeof projectId !== "undefined" && projectId != -1 && projectId != 0) {

		if(getDeleted) {
			url+="&deleted=true";
		}
		addHourglass();

		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				var sel = selector;
				var all = addAll;

				removeHourglass();

				showSurveyList(data, sel + ".data_survey", all, true, false, useIdx);
				showSurveyList(data, sel + ".oversight_survey", all, false, true, useIdx);
				showSurveyList(data, sel + ".data_oversight_survey", all,true, true, useIdx);

				if(typeof callback == "function") {
					callback(data);
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
 * Show the surveys in select boxes
 */
function showSurveyList(data, selector, addAll, dataSurvey, oversightSurvey, useIdx) {

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

	for(i = 0; i < data.length; i++) {
		item = data[i];
		if(item.dataSurvey && dataSurvey || item.oversightSurvey && oversightSurvey) {
			h[++idx] = '<option';
			if (!valueSelected && !item.blocked) {
				valueSelected = true;
				selValue = useIdx ? i : item.id;
			}
			if (item.blocked) {
				h[++idx] = ' class="blocked"';
			}
			h[++idx] = ' value="';
			h[++idx] = useIdx ? i : item.id;
			h[++idx] = '">';
			h[++idx] = htmlEncode(item.displayName);
			if (item.blocked) {
				h[++idx] = ' (' + localise.set["c_blocked"] + ')';
			}
			h[++idx] = '</option>';
		}
		if(globals.gCurrentSurvey > 0 && globals.gCurrentSurvey === item.id) {
			selValue = useIdx ? i : item.id;
		}
	}

	$elem.empty().append(h.join(''));
	$elem.val(selValue);
	$("option.blocked", $elem_disable_blocked).attr("disabled", "disabled");

}

/*
 * Load the surveys from the server
 */
function loadForms(surveyId, selector) {

	var url="/surveyKPI/surveys/forms?surveyId=" + surveyId,
		$elem,
		selector_disable_blocked,
		h = [],
		idx = -1,
		i,
		item;

	if(selector === undefined) {
		selector = ".form_select";	// Update the entire class of form select controls
	}
	$elem = $(selector);


	addHourglass();

	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {

			removeHourglass();
			$elem.empty();

			for(i = 0; i < data.length; i++) {
				item = data[i];
				h[++idx] = '<option';
				h[++idx] = ' value="';
				h[++idx] = item.id;
				h[++idx] = '">';
				h[++idx] = htmlEncode(item.name);
				h[++idx] = '</option>';
			}

			$elem.empty().append(h.join(''));

			if(globals.gCurrentForm > 0) {
				$elem.val(globals.gCurrentForm);
			}


		},
		error: function(xhr, textStatus, err) {

			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				console.log("Error: Failed to get list of forms: " + err);
			}
		}
	});

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
				globals.gSelector.setSurveyLanguages(sId, data);
				retrievedLanguages(sId, selector, data, theCallback, filterQuestion, setGroupList, addNone);
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
		var dateqId = $('#task_start').val();
		getQuestionList(sId, data[0], filterQuestion, "-1", theCallback, setGroupList, undefined, dateqId, undefined, undefined);	// Default language to the first in the list
	} else {
		if(typeof theCallback === "function") {
			theCallback();
		}
	}
}

//Function to get the question list
function getQuestionList(sId, language, qId, groupId, callback, setGroupList, view, dateqId, qName, assignQuestion) {

	function getAsyncQuestionList(sId, language, theCallback, groupId, qId, view, dateqId, qName, assignQuestion) {

		addHourglass();
		$.ajax({
			url: questionListUrl(sId, language, true),
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				globals.gSelector.setSurveyQuestions(sId, language, data);
				setSurveyViewQuestions(data, qId, view, dateqId, qName, assignQuestion);

				if(setGroupList && typeof setSurveyViewQuestionGroups === "function") {
					setSurveyViewQuestionGroups(data, groupId);
				}
				if(typeof theCallback === "function") {
					theCallback();
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get list of questions: " + err);
				}
			}
		});
	}

	getAsyncQuestionList(sId, language, callback, groupId, qId, view, dateqId, qName, assignQuestion);
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
			globals.gSelector.setSurveyMeta(sId, data);
			setSurveyViewMeta(data, metaItem);
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
			globals.gSelector.setSurveyAlerts(sId, data);
			setSurveyAlerts(data, alertId);
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
function setSurveyViewQuestions(list, qId, view, dateqId, qName, assignQuestion) {

	var $questionSelect = $('.selected_question'),
		$dateQuestions = $('.date_questions'),
		$questionNameSelect = $('.selected_name_question'),     // this should replace selected_question
		$assignQuestion = $('#assign_question'),
		label;

	$questionSelect.empty();
	$questionSelect.append('<option value="-1">' + localise.set["c_none"] + '</option>');

	$questionNameSelect.empty();
	$questionNameSelect.append('<option value="-1">' + localise.set["c_none"] + '</option>');

	$dateQuestions.empty();
	$dateQuestions.append('<option value="-1">' + localise.set["ed_i_c"] + '</option>');

	if(list) {
		$.each(list, function(j, item) {
			if(typeof item.q === "undefined") {
				label = "";
			} else {
				label = item.q;
			}
			if(item.is_ssc) {
				$questionSelect.append('<option value="' + item.id + '">ssc : ' + htmlEncode(item.name + " : " + item.fn) + '</option>');
			} else {
				$questionSelect.append('<option value="' + item.id + '">' + htmlEncode(item.name + " : " + label) + '</option>');
				$questionNameSelect.append('<option value="' + item.name + '">' + htmlEncode(item.name) + '</option>');
				if(item.type === 'timestamp' || item.type === 'dateTime' || item.type == 'date') {
					$dateQuestions.append('<option value="' + item.id + '">' + htmlEncode(item.name + " : " + label) + '</option>');
				}
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
				globals.model.setSurveyData(data);
				globals.model.setSettings();
				setLanguages(data.languages, callback);

				if(typeof callback == "function") {
					callback();
				}
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
					alert("Error: Failed to get survey: " + err);
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
		cache: false,
		success: function(data) {
			removeHourglass();

			globals.model.setSurveyData(data);
			globals.model.setSettings();
			globals.gCurrentSurvey = data.id;

			saveCurrentProject(-1, globals.gCurrentSurvey, undefined);	// Save the current survey id

			setLanguages(data.languages, callback);

			if(typeof callback == "function") {
				callback();
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				bootbox.alert(localise.set["c_error"] + xhr.responseText);
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
		$('#ut_alert').show().text("Invalid Start Date");
		setTimeout(function() {
			$('.form-control', '#startDate').focus();
		}, 0);
		return false;
	}

	if(!d2 || !d2.isValid()) {
		$('#ut_alert').show().text("Invalid End Date");
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
			h[++idx] = change.question.name;
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
			h[++idx] = htmlEncode(forms[change.question.formIndex].name);


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
			if(typeof callback === "function") {
				callback(data);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				console.log("Error: Failed to get list of locations: " + err);
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
	if(msg && msg.indexOf("Error:") === 0) {
		alert(msg.substring(7));	// Jump over "Error: "
	} else if(msg && msg.length > 0) {
		alert(msg);
	}
}

/*
 * Post data to be converted into a file
 */
function generateFile(url, filename, format, mime, data, sId, groupSurvey, title, project, charts, chartData, settings, tz, form) {

	var payload = "sId=" + sId;
	payload += "&format=" + format;
	if(groupSurvey) {
		payload += "&groupSurvey=" + groupSurvey;
	}
	if(form) {
		payload += "&form=" + form;
	}
	if(data) {
		payload += "&data=" + encodeURIComponent(JSON.stringify(data));
	}
	if(title) {
		payload += "&title=" + title;
	}
	if(project) {
		payload += "&project=" + project;
	}
	if(charts) {
		payload += "&charts=" + encodeURIComponent(JSON.stringify(charts));
	}
	if(chartData) {
		payload += "&chartdata=" + encodeURIComponent(JSON.stringify(chartData));
	}
	if(settings) {
		payload += "&settings=" + encodeURIComponent(JSON.stringify(settings));
	}
	if(tz) {
		payload += "&tz=" + encodeURIComponent(JSON.stringify(tz));
	}
	payload = payload.replace(/%20/g, '+');

	var xhr = new XMLHttpRequest();
	xhr.open('POST', url, true);
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.responseType = 'blob';

	xhr.onload = function(e) {
		if (this.status == 200) {
			// get binary data as a response
			var blob = new Blob([this.response], { type: mime });
			var downloadUrl = URL.createObjectURL(blob);
			var a = document.createElement("a");
			a.href = downloadUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			setTimeout(function(){
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);
			}, 100);
		} else {
			alert(localise.set["c_error"] + ": " + this.statusText);
		}
	};

	xhr.onerror = function(e) {
		alert("Error: Upload Failed");
	}
	xhr.send(payload);

}

/*
 * Post data to be converted into a file
 * This version creates a temporary file on the server
 */
function sendReports(url, filename, format, mime, data, sId, managedId, title, project, charts) {

	var update = {
		sId: sId,
		format: format,
		managedId: managedId,
		data: data,
		title: title,
		project: project,
		charts: charts
	}
	var saveString = JSON.stringify(update);

	addHourglass();
	$.ajax({
		type: "POST",
		dataType: 'text',
		cache: false,
		contentType: "application/json",
		url: url,
		data: { report: saveString },
		success: function(data, status) {
			removeHourglass();

		}, error: function(data, status) {
			removeHourglass();
			alert(data.responseText);
		}
	});

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
				globals.gMapboxDefault = data;
				if(typeof callback === "function") {
					callback(param);
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["error"] + ": " + err);
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
 * Get google map api
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
				console.log("Retrieved map keys from server");

				var gElement = document.createElement('script');
				var key = "";
				if(data) {
					key = "?key=" + data;
				}
				//gElement.src = "//maps.google.com/maps/api/js?v=3.6&amp";
				gElement.src = "https://maps.googleapis.com/maps/api/js" + key;
				if(typeof callback === "function") {
					gElement.onload = onLoad;
				}
				document.getElementsByTagName('head')[0].appendChild(gElement);

				function onLoad() {

					var i;

					window.smapGMapsLoading = false;
					window.smapLoadedGMaps = true;

					console.log("Google map loaded");

					for(i = 0; i < window.smapGMapsToLoad.length; i++) {
						console.log("map callback");
						window.smapGMapsToLoad[i].fn(window.smapGMapsToLoad[i].locn);
					}
					delete window.smapGMapsToLoad;
				}

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["error"] + " " + err);

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

function remoteSurveyChanged() {
	$('#fwd_rem_survey_id').val($('#fwd_rem_survey :selected').val());
	$('#fwd_rem_survey_nm').val($('#fwd_rem_survey :selected').text());
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
			var cb1 = callback1,
				cb2 = callback2,
				t = type;
			globals.gReports = data;
			if(typeof cb1 === "function") {
				cb1(data, cb1, cb2, t);
			}
			if(typeof cb2 === "function") {
				cb2(data, cb1, cb2, t);
			}

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				console.log("Error: Failed to get list of reports: " + err);
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
		if(confirm(localise.set["msg_confirm_del"] + " " + globals.gReports[idx].name)) {
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
			var t = type;
			console.log("delete: " + t + " : " + type);
			getReports(refreshCustomReportView, showReportList, t);
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["msg_err_del"] + xhr.responseText);
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
			globals.gRoleList = data;
			if(typeof callback === "function") {
				callback();
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["msg_err_get_r"] + " " + err);
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
			globals.gCmSettings = data;
			if(typeof callback === "function") {
				callback();
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["msg_err_get_r"] + " " + err);
			}
		}
	});
}

function getInterval(seconds) {
	if(seconds < 2) {
		return seconds + ' ' + localise.set["i_sec"];
	} else if(seconds < 60) {
		return seconds + ' ' + localise.set["i_secs"];
	} else if(seconds < 120) {
		return Math.floor(seconds/ 60) + ' ' + localise.set["i_min"];
	} else if(seconds < 3600) {
		return Math.floor(seconds/ 60) + ' ' + localise.set["i_mins"];
	} else if(seconds < (3600 * 2)) {
		return Math.floor(seconds/ (60 * 60)) + ' ' + localise.set["i_hour"];
	} else if(seconds < (3600 * 24)) {
		return Math.floor(seconds/ (60 * 60)) + ' ' + localise.set["i_hours"];
	} else if(seconds < (3600 * 24 * 2)) {
		return Math.floor(seconds/ (60 * 60 * 24)) + ' ' + localise.set["i_day"];
	} else if(seconds < (3600 * 24)) {
		return Math.floor(seconds/ (60 * 60 * 24)) + ' ' + localise.set["i_days"];
	}
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
 * Convert a :: separated string containing link information into target survey id and question id
 */
function getLinkedTarget(input) {
	var lt,
		values = [];

	if(input) {

		lt = {
			sId: 0,
			qId: 0
		}

		values = input.split("::");
		if(values.length > 0) {
			lt.sId = +values[0].trim();
		}
		if(values.length > 1) {
			lt.qId = +values[1].trim();
		}
	}

	return lt;
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
	h[++idx] = form.form;
	if(bs4) {
		h[++idx] = '</span>';
	}
	h[++idx] = '</label>';
	if(form.p_id != 0 && !osm) {
		h[++idx] = ' <button class="exportpivot">Pivot</button>';
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
function getSurveyRoles(sId, selectedRoles, setall) {

	if (!gTasks.cache.surveyRoles[sId]) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/role/survey/" + sId + "?enabled=true",
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				gTasks.cache.surveyRoles[sId] = data;
				showRoles(gTasks.cache.surveyRoles[sId], selectedRoles);
			},
			error: function (xhr, textStatus, err) {

				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					console.log("Error: Failed to get roles for a survey: " + err);
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
		i;

	$('.role_select_roles').empty();
	if (data.length > 0) {
		for (i = 0; i < data.length; i++) {
			h[++idx] = '<div class="col-sm-10 custom-control custom-checkbox ml-2 mb-1">'
			h[++idx] = '<input type="checkbox"';
			h[++idx] = ' id="rolesel_' + i + '"';
			if(setall || roleSelected(data[i].id, selectedRoles)) {
				h[++idx] = ' checked="checked"';
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
			var h = [],
				idx = -1,
				i;

			if(includeNone) {
				h[++idx] = '<option value="">';
				h[++idx] = localise.set["c_none"]
				h[++idx] = '</option>';
			}

			if(includeSelf) {
				h[++idx] = '<option value="self">';
				h[++idx] = localise.set["c_self"]
				h[++idx] = '</option>';
			}
			for(i = 0; i < data.length; i++) {
				h[++idx] = '<option value="';
				h[++idx] = htmlEncode(data[i].ident);
				h[++idx] = '">';
				h[++idx] = htmlEncode(data[i].projectName);
				h[++idx] = ' : ';
				h[++idx] = htmlEncode(data[i].displayName);
				h[++idx] = '</option>';
			}
			$elem.empty().append(h.join(''));

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

/*
 * Get all the csv files that a user can access
 */
function getAccessibleCsvFiles($elem, includeNone) {

	var url="/surveyKPI/csv/files";

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			globals.gCsvFiles = data;
			var h = [],
				idx = -1,
				i;

			if(includeNone) {
				h[++idx] = '<option value="">';
				h[++idx] = localise.set["c_none"]
				h[++idx] = '</option>';
			}
			for(i = 0; i < data.length; i++) {
				h[++idx] = '<option value="';
				h[++idx] = i;
				h[++idx] = '">';
				h[++idx] = htmlEncode(data[i].filename);
				h[++idx] = '</option>';
			}
			$elem.empty().append(h.join(''));

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				console.log("Error: Failed to get list of csv files: " + err);
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
			h[++idx] = '<option value="">';
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
		if (sIdent && sIdent !== "0" && sIdent !== '') {
			addHourglass();
			$.ajax({
				url: "/surveyKPI/questionListIdent/" + sIdent + "/none?exc_ssc=true&inc_meta=true",
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();
					var theIdent = sIdent;
					var $theElem = $elem;
					var $theElemMultiple = $elem_multiple;

					gCache[theIdent] = data;
					populateElement($theElem, $theElemMultiple, data);
				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_get_q"] + ": " + err);
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
					var theIdent = sIdent;
					var $theElem = $elem;

					gCacheGroup[theIdent] = data;
					populateElement($theElem, data);

				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["msg_err_get_q"] + ": " + err);
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
				var theId = sId;
				var $theElem = $elem;

				gCacheStatusQuestions[theId] = data;
				populateElement($theElem, data);

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_q"] + ": " + err);
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
				var theId = sId;

				gCacheStatusQuestions[theId] = data;
				$key.val(gCacheStatusQuestions[sId].key);
				$key_policy.val(gCacheStatusQuestions[sId].key_policy)

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
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
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Failed to get task group data");
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
	var url = "/api/v1/tasks?preserveInitialData=true",
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
	taskFeature.properties.pid = globals.gCurrentProject;
	taskFeature.properties.tg_id = tg_id;

	if (!taskFeature.properties.id || taskFeature.properties.id == "") {
		taskFeature.properties["id"] = 0;
	}
	taskFeature.properties.name = $('#tp_name').val();		// task name
	if(isConsole) {
		taskFeature.properties.survey_ident = $('#tp_form_name').val();	// form id
		taskFeature.properties.form_id = undefined;
	} else {
		// old fashioned
		taskFeature.properties.form_id = $('#tp_form_name').val();	// form id
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
		taskFeature.properties.location_name = gTags[locationIdx].name;
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
		contentType: "application/json",
		url: url,
		data: {task: tpString},
		success: function (data, status) {
			removeHourglass();
			$('#task_properties').modal("hide");
			callback();
		},
		error: function (xhr, textStatus, err) {

			removeHourglass();
			alert(localise.set["msg_err_upd"] + xhr.responseText);

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
	//$('#users_filter').append('<option value="-1">' + localise.set["t_u"] + '</options>');

	$('#users_select_new_task, #users_task_group, #users_select_user, #tp_user')
		.append('<option value="-1">' + localise.set["t_u"] + '</options>');

	$('#users_task_group').append('<option value="-2">' + localise.set["t_ad"] + '</options>');
	$.ajax({
		url: "/surveyKPI/userList",
		cache: false,
		success: function (data) {

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
		},
		error: function (xhr, textStatus, err) {
			if (xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["c_error"] + err);
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
function edit_notification(edit, idx, console) {

	var notification;

	document.getElementById("notification_edit_form").reset();
	setTargetDependencies("email");
	setTriggerDependencies("submission");
	setAttachDependencies("none");

	if(edit) {
		notification = window.gNotifications[idx];

		title = localise.set["msg_edit_notification"];
		$('#trigger').val(notification.trigger);
		$('#target').val(notification.target);
		$('#name').val(notification.name);
		setTargetDependencies(notification.target);

		gSelectedOversightQuestion = notification.updateQuestion;
		gSelectedOversightSurvey = notification.updateSurvey;
		setTriggerDependencies(notification.trigger);
		if(notification.trigger === "console_update") {
			getGroupSurveys(notification.s_id, showOversightSurveys);
		}

		setAttachDependencies(notification.notifyDetails.attach);

		if (notification.trigger !== "task_reminder") {
			$('#survey').val(notification.s_id).change();
		}
		$('#not_filter').val(notification.filter);
		$('#update_value').val(notification.updateValue);
		$('#alerts').val(notification.alert_id);

		// reminder settings
		if (!console) {
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

		if(notification.trigger !== "task_reminder" && (typeof notification.alert_id !== 'undefined'
			|| (notification.notify_details && (notification.notifyDetails.emailQuestionName || notification.notifyDetails.emailMeta)))) {

				surveyChangedNotification(notification.notifyDetails.emailQuestionName,
					notification.notifyDetails.assign_question,
					notification.notifyDetails.emailMeta,
					notification.alert_id);
		}

		if (notification.notifyDetails) {

			if (notification.target == "email") {
				if (notification.notifyDetails.emails) {
					$('#notify_emails').val(notification.notifyDetails.emails.join(","));
				}
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
			} else if (notification.target == "webhook") {
				$('#callback_url').val(notification.notifyDetails.callback_url);
			}
		}
		if (!console) {
			$('#fwd_rem_survey_id').val(notification.remote_s_ident);
			$('#fwd_rem_survey_nm').val(notification.remote_s_name);
			$('#fwd_user,#user_to_assign').val(notification.remote_user);
			$('#assign_question').val(notification.notifyDetails.assign_question);
			$('#user_to_assign').trigger('change');
			$('#survey_case').val(notification.notifyDetails.survey_case);
			gEligibleUser = notification.remote_user;
			// Password not returned from server - leave blank

			$('#fwd_host').val(notification.remote_host);

			// assign user from data
			if($('#user_to_assign').val() === '_data') {
				$('.assign_question').removeClass('d-none').show();
			}
		}

		if (!console) {
			if (notification.enabled) {
				$('#nt_enabled').prop('checked', true);
			} else {
				$('#nt_enabled').prop('checked', false);
			}
		}

		window.gUpdateFwdPassword = false;
		window.gSelectedNotification = notification.id;
	} else {

		$('#fwd_host').val(window.gRemote_host);	// Set the values to the ones last used
		$('#fwd_user').val(window.gRemote_user);

		$('#survey').change();

		// Reminders
		$('#r_period').val(1);
		$('#period_list_sel').val('days');
		$('#nt_enabled').prop('checked',true);
		window.gUpdateFwdPassword = true;
		window.gSelectedNotification = -1;
	}

}

function setTargetDependencies(target) {
	$('.forward_options, .sms_options, .webhook_options, .email_options, .escalate_options').hide();
	if(target === "email") {
		$('.email_options').show();
	} else if(target === "forward") {
		$('.forward_options').show();
	} else if(target === "sms") {
		$('.sms_options').show();
	} else if(target  === "webhook") {
		$('.webhook_options').show();
	} else if(target  === "escalate") {
		$('.escalate_options').show();
	}
}

function setTriggerDependencies(trigger) {
	$('.task_reminder_options,.update_options, .submission_options, .cm_alert_options').hide();
	if(trigger === "submission") {
		$('.submission_options').show();
	} else if(trigger === "task_reminder") {
		$('.task_reminder_options').show();
		$('#target').val('email');
		setTargetDependencies('email');
	} else if(trigger === "console_update") {
		$('.update_options, .submission_options').show();
	} else if(trigger === "cm_alert") {
		$('.cm_alert_options').show();
	}
}

function setAttachDependencies(attach) {
	if(attach === "pdf" || attach === "pdf_landscape") {
		$('.pdf_options').show();
	} else  {
		$('.pdf_options').hide();
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

}

/*
 * Load the existing notifications from the server
 */
function getNotificationTypes() {

	addHourglass();
	$.ajax({
		url: '/surveyKPI/notifications/types',
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			window.gNotificationTypes = data;
			if(data) {
				updateNotificationTypes(data);
			}
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				console.log("Error: Failed to get list of notification types: " + err);
			}
		}
	});
}

function setupNotificationDialog() {

	// Set change function trigger
	$('#trigger').change(function() {
		var trigger = $(this).val();
		setTriggerDependencies(trigger);
		if(trigger === "task_reminder") {
			taskGroupChanged($('#task_group').val());
		}
	});
	setTriggerDependencies("submission");

	// Set change function target
	$('#target').change(function() {
		setTargetDependencies($(this).val());
	});
	setTargetDependencies("email");

	// Set change function attach
	$('#email_attach').change(function() {
		setAttachDependencies($(this).val());
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

	$('#fwd_upd_rem_survey').click(function(){
		getRemoteSurveys();
	});

	$('#fwd_rem_survey').change(function(){
		remoteSurveyChanged();
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

	if(tg.source_s_id) {
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
		setSurveyViewQuestions(qList, undefined, undefined, undefined, emailQuestionName, undefined);
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
	var emailArray;
	var i;

	// validate
	// Must specifify an email
	notification.error = false;
	if((!emails || emails.trim().length == 0) && (!emailQuestionName || emailQuestionName == "-1")
		&& (!emailMetaItem || emailMetaItem == "-1")) {
		notification.error = true;
		notification.errorMsg = localise.set["msg_inv_email"];
	}

	// Text email must be valid email addresses
	if(emails && emails.trim().length > 0) {
		emailArray = emails.split(",");
		for (i = 0; i < emailArray.length; i++) {
			if (!validateEmails(emailArray[i])) {
				notification.error = true;
				notification.errorMsg = localise.set["msg_inv_email"];
				break;
			}
		}
	}

	if(!notification.error) {
		notification.target = "email";
		notification.notifyDetails = {};
		notification.notifyDetails.emails = emailArray;
		notification.notifyDetails.emailQuestionName = emailQuestionName;
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

function surveyChangedNotification(qName, assignQuestion, metaItem, alertId) {

	var language = "none",
		sId = $('#survey').val() || 0,
		qList,
		metaList,
		alertList;

	if(sId) {
		if(!qName) {
			qName = "-1";
		}

		getEligibleUsers(sId, true);
		getGroupSurveys(sId, setGroupSelector);

		qList = globals.gSelector.getSurveyQuestions(sId, language);
		metaList = globals.gSelector.getSurveyMeta(sId);
		alertList = globals.gSelector.getSurveyAlerts(sId);

		if(!qList) {
			getQuestionList(sId, language, 0, "-1", undefined, false,
				undefined, undefined, qName, assignQuestion);
		} else {
			setSurveyViewQuestions(qList, undefined, undefined, undefined, qName, assignQuestion);
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
 * Return true if this qustion stores its data in a text type column
 */
function isTextStorageType(type) {
	return type === "string" || type === "select1" || type === "barcode" || type === "calculate"
		|| type === "child_form" || type === "parent_form";
}

/*
 * Get oversight surveys
 */
function getGroupSurveys(surveyId, callback) {

	var url = "/surveyKPI/surveyResults/" + surveyId + "/groups",
		survey = surveyId;

	if(surveyId > 0) {

		if(gTasks.cache.groupSurveys[surveyId]) {
			if(typeof callback === 'function') {
				callback(gTasks.cache.groupSurveys[surveyId]);
			}
		} else {
			addHourglass();
			$.ajax({
				url: url,
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();
					gTasks.cache.groupSurveys[surveyId] = data;
					if(typeof callback === 'function') {
						callback(data);
					}
				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						console.log(localise.set["c_error"] + ": " + err);
					}
				}
			});
		}
	}
}

/*
 * Update a selector that is used for any data survey in a group that is not an oversight form
 */
function setGroupSelector(data) {
	var $elemGroups = $('#survey_case');

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
		}
	}

	$elemGroups.empty().html(h.join(''));

}

function showOversightSurveys(data) {
	var i,
		item,
		h = [],
		idx = -1,
		surveyId = $('#survey').val(),
		count = 0;

	$('#group_survey_questions').empty();

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
					getOversightQuestionList(gSelectedOversightSurvey);
				} else {
					getOversightQuestionList(item.surveyIdent);
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
function getOversightQuestionList(sIdent) {

	var url = "/surveyKPI/questionListIdent/" + sIdent + "/none?exc_read_only=false&inc_meta=false";

	if(window.oversightQuestions[sIdent]) {
		showOversightQuestions(window.oversightQuestions[sIdent]);
	} else {
		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				window.oversightQuestions[sIdent] = data;
				showOversightQuestions(data);

			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert("Error: Failed to get list of questions: " + err);
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
		'&mps=' + mps +
		(tz ? "&tz=" + tz : "");

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			callback(data);

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert("Error: Failed to get user trail: " + err);
			}
		}
	});
}

/*
 * Get available surveys from a remote host
 */
function getRemoteSurveys() {

	var host,
		user,
		password,
		remote = {},
		remoteString;

	remote.address = $('#fwd_host').val();
	remote.user = $('#fwd_user').val();
	remote.password = $('#fwd_password').val();


	if(!remote.address || remote.address.length == 0) {
		alert(localise.set["msg_val_rh"]);
		$('#fwd_host').focus();
		return;
	} else if(!remote.user || remote.user.length == 0) {
		alert(localise.set["msg_val_u_id"]);
		$('#fwd_user').focus();
		return;
	} else if(!remote.password || remote.user.password == 0) {
		alert(localise.set["msg_val_pass"]);
		$('#fwd_password').focus();
		return;
	}

	remoteString = JSON.stringify(remote);
	addHourglass();
	$.ajax({
		type: "POST",
		async: true,
		cache: false,
		dataType: "json",
		url: "/surveyKPI/notifications/getRemoteSurveys",
		data: { remote: remoteString },
		success: function(data, status) {
			removeHourglass();
			updateRemoteSurveys(data);
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			$('#fwd_rem_survey').empty();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				var msg;
				if(xhr.responseText.indexOf("RSA premaster") >= 0) {
					msg = localise.set["msg_err_cert"];
				} else {
					msg = xhr.responseText;
				}
				alert(localise.set["msg_err_get_f"] + msg);
			}
		}
	});
}

/*
 * Update the list of remote survey
 */
function updateRemoteSurveys(surveyList) {

	console.log("updateRemoteSurvey");

	var $rs = $('#fwd_rem_survey'),
		i, survey,
		h = [],
		idx = -1;

	for(i = 0; i < surveyList.length; i++) {
		survey = surveyList[i];
		h[++idx] = '<option value="';
		h[++idx] = survey.formID;
		h[++idx] = '">';
		h[++idx] = htmlEncode(survey.name);
		h[++idx] = '</option>';
	}

	$rs.empty().append(h.join(''));
	remoteSurveyChanged();

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
			incTemp: incTemp
		}
	}

	var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";

	addHourglass();
	$.ajax({
		type: "POST",
		cache: false,
		dataType: 'text',
		contentType: "application/json",
		url: "/surveyKPI/background_report" + tzString,
		data: { report: JSON.stringify(reportObj) },
		success: function(data, status) {
			removeHourglass();
			alert(localise.set["msg_ds_s_r"]);
		}, error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["msg_err_save"] + xhr.responseText);
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
		contentType: "application/json",
		url: "/surveyKPI/background_report" + tzString,
		data: { report: JSON.stringify(reportObj) },
		success: function(data, status) {
			removeHourglass();
			alert(localise.set["msg_ds_s_r"]);
		}, error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["msg_err_save"] + xhr.responseText);
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
	} else {
		return;
	}
}

/*
 * Get the list of users from the server
 */
function getEligibleUsers(sId, isNotification) {

	if(sId > 0) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/userList/survey/" + sId,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();

				var h = [],
					idx = -1,
					$elem = $('#user_to_assign');

				$elem.empty();

				h[++idx] = '<option value="_none">';
				h[++idx] = localise.set["c_none"];
				h[++idx] = '</option>';

				if(isNotification) {
					h[++idx] = '<option value="_submitter">';
					h[++idx] = localise.set["c_submitter"];
					h[++idx] = '</option>';

					h[++idx] = '<option value="_data">';
					h[++idx] = localise.set["t_ad"];
					h[++idx] = '</option>';
				}

				if(data && data.length > 0) {
					for(i = 0; i < data.length; i++) {
						h[++idx] = '<option value="';
						h[++idx] = data[i].ident;
						h[++idx] = '">';
						h[++idx] = htmlEncode(data[i].name);
						h[++idx] = '</option>';
					}
				}
				$elem.html(h.join(''));

				if(typeof gEligibleUser !== 'undefined') {
					$elem.val(gEligibleUser);
				}

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else if(err == 403) {
					return;  // Ignore errors where the survey cannot be found. The survey requested may be the global default current survey which may be out of date
				}
				else {
					alert(localise.set["error"] + ": " + err);
				}
			}
		});
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
