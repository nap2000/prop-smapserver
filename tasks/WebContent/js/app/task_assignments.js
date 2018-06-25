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

define(['jquery', 'bootstrap', 'mapbox_app', 'common', 'localise',
        'bootbox',
        'moment',
        'datetimepicker'
    ],
    function ($, bootstrap, mapbox_app, common, lang, bootbox, moment, datetimepicker) {


        // The following globals are only in this java script file
        var gTasks,					// Object containing the task data retrieved from the database
            gTaskGroupIndex = -1,	// Currently selected task group
            gUpdateTaskGroupIndex,  // A task group being edited
            gTaskGroups,            // Current list of task groups
            gTaskParams = [],		// Parameters for a new task
            gFilterqType,			// The type of the filter question select, select1, int, string
            gCurrentTaskFeature,	// Currently edited task feature
            gClickOnMapEnabled = false,		// Listen to clicks on the map
            gCalendarInitialised = false,	// Set true when the calendar pane has been initialised
            gMapInitialised = false,		// Set true when the map pane has been initialised
            gModalMapInitialised = false,	// Set true then the modal map has been initialised
            gIdx = 0,						// Idx set when external task dropped on calendar
            gSelectedCount = 0;
            gUnsentEmailCount = 0;

        $(document).ready(function () {

            var bs = isBusinessServer();

            window.moment = moment;		// Make moment global for use by common.js

            globals.gRegion = {};	// Initialise global values
            globals.gRegions = undefined;

            localise.setlang();		// Localise HTML

            $("#side-menu").metisMenu();

            getLoggedInUser(projectChanged, false, true, undefined);

            // Set change function on projects
            $('#project_name').change(function () {
                projectChanged();
            });

            // Get locations
            getLocations(setLocationList);

            /*
             * Change function on source project when tasks are being copied from an existing survey
             * The source project is the project that data is being copied from,
             *  it can be different from the current project
             */
            //
            $('#project_select,#project_name').change(function () {
                var sourceProject = $('#project_select option:selected').val();
                loadSurveys(sourceProject, "#survey", false, false, surveyChanged);			// Get surveys
            });

            // Add a trigger to respond to the clicking of "filter tasks"
            $('#filter_results').change(function () {
                if($('#filter_results').prop('checked')) {
                    $('#filter_results_advanced').prop('checked', false);
                    $('.simple_filter').show();
                    $('.advanced_filter').hide();
                } else {
                    $('.simple_filter').hide();
                }
            });

            // Add a trigger to respond to the clicking of "advanced filter tasks"
            $('#filter_results_advanced').change(function () {
                if($('#filter_results_advanced').prop('checked')) {
                    $('#filter_results').prop('checked', false);
                    $('.simple_filter').hide();
                    $('.advanced_filter').show();
                } else {
                    $('.advanced_filter').hide();
                }
            });


            // Add a trigger to respond to the clicking of "add_from_survey"
            $('#add_from_survey').prop('checked', false).click(function () {
                $('#add_task_from_existing').toggle();
            });

            // Add response to the filters being changed
            $('.task_filter').change(function () {
                refreshAssignmentData();
            });

            // Add response to a source survey being selected
            $('#survey').change(function () {
                surveyChanged("-1");
            });

            // Add response to a source survey being selected
            $('#filter_language').change(function () {
                languageChanged();
            });

            // Add response to a filter question being selected
            $('#filter_question').change(function () {
                questionChanged();
            });

            // Change Functions
            $('.users_select').change(function () {
                globals.gCurrentUserName = $('option:selected', $(this)).text();
                globals.gCurrentUserId = $('option:selected', $(this)).val();
            });

            /*
             * Menus
             */
            $('#zoomData').button().click(function () {	// Add zoom to data button
                zoomToFeatureLayer('map');
            });
            $('#m_export_pdf').click(function () {	// Export to PDF
                var url = '/surveyKPI/tasks/pdf/' + globals.gCurrentTaskGroup,
                    name = $('#taskgroup option:selected').text();

                if (globals.gCurrentTaskGroup) {
                    downloadFile(url);
                    //downloadFile(url, name + ".pdf", "application/pdf");
                } else {
                    alert(localise.set["msg_tg_ns"]);
                }
            });

            $('#m_export_xls').click(function () {	// Export to XLS
                var tz = Intl.DateTimeFormat().resolvedOptions().timeZone,
                    tzParam = "",
                    url = '/surveyKPI/tasks/xls/' + globals.gCurrentTaskGroup,
                    hasParam = false,
                    statusFilterArray = $('#status_filter').val();

                if (globals.gCurrentTaskGroup) {

                    // Add parameters
                    if (tz) {
                        url += (hasParam ? '&' : '?') + "tz=" + tz;
                        hasParam = true;
                    }
                    if(statusFilterArray) {
                        url += (hasParam ? '&' : '?') + 'inc_status=' + statusFilterArray.join(',');
                    }

                    downloadFile(url);

                } else {
                    alert(localise.set["msg_tg_ns"]);
                }
            });

            $('#m_import_xls').click(function () {	// Import from XLS
                if (globals.gCurrentTaskGroup) {
                    $('#import_taskgroup').modal("show");
                } else {
                    alert(localise.set["msg_tg_ns"]);
                }
            });
            $(('#importTaskGroupGo')).click(function () {
                importTaskGroup();
            });
            $('.file-inputs').bootstrapFileInput();

            $('#users_task_group, #roles_task_group').change(function() {
                if($(this).val() == -2) {
                    $('.assign_data').show();
                } else {
                    $('.assign_data').hide();
                }
            });

            getRoles();
            $('.assign_user').show();
            $('.assign_role, .assign_email, .assign_data').hide();
            $('input[type=radio][name=assign_type]').change(function() {
                if (this.id == 'assign_user_type' || this.id == 'tp_user_type') {
                    $('.assign_user').show();
                    $('.assign_role,.assign_email').hide();
                    if($('#users_task_group').val() == -2) {
                        $('.assign_data').show();
                    } else {
                        $('.assign_data').hide();
                    }
                } else if (this.id == 'assign_role_type' || this.id == 'tp_role_type') {
                    $('.assign_user, .assign_email').hide();
                    $('.assign_role').show();
                    if($('#roles_task_group').val() == -2) {
                        $('.assign_data').show();
                    } else {
                        $('.assign_data').hide();
                    }
                } else {
                    $('.assign_user, .assign_role,.assign_data').hide();
                    $('.assign_email').show();
                    $('.assign_data').show();
                }
            });

            // Add a trigger to open the modal that bulk assigns a user to tasks
            $('#assignUser').click(function () {

                globals.gCurrentUserName = $('#users_select_user option:selected').text();
                globals.gCurrentUserId = $('#users_select_user option:selected').val();

                $('#assign_user').modal("show");
            });

            /*
             * Save the assigned user
             */
            $('#assignUserSave').off().click(function () {

                var bulkAction = {
                        action: "assign",
                        userId: $('#users_select_user').val(),
                        tasks: getSelectedTaskIds()
                    },
                    baString = JSON.stringify(bulkAction),
                    url;

                url = "/surveyKPI/tasks/bulk/";
                url += globals.gCurrentProject + "/" + globals.gCurrentTaskGroup;

                addHourglass();
                $.ajax({
                    type: "POST",
                    dataType: 'text',
                    cache: false,
                    contentType: "application/json",
                    url: url,
                    data: {tasks: baString},
                    success: function (data, status) {
                        removeHourglass();
                        refreshAssignmentData();
                    }, error: function (data, status) {
                        removeHourglass();
                        alert(localise.set["c_error"] +": " + data.responseText);
                    }
                });

            });


            /*
             * Set up flters
             */
            $('#status_filter').multiselect({
                onChange: function(option, checked, select) {
                    refreshTableAssignments();
                }
            });
            $('#status_filter').multiselect('selectAll', false)
                .multiselect('deselect', 'deleted')
                .multiselect('deselect', 'cancelled')
                .multiselect('updateButtonText');


            /*
             * Update the properties of a task
             */
            $('#taskPropertiesSave').off().click(function () {
                var url = "/surveyKPI/tasks/task/",
                    taskFeature = {
                        properties: {}
                    },
                    fromDate,
                    toDate;

                url += globals.gCurrentProject + "/" + globals.gCurrentTaskGroup;

                taskFeature = $.extend(true, {}, gCurrentTaskFeature);
                /*
                 * Set the properties of the taskFeature from the dialog
                 */
                if (!taskFeature.properties.id || taskFeature.properties.id == "") {
                    taskFeature.properties["id"] = 0;
                }
                taskFeature.properties.name = $('#tp_name').val();		// task name
                taskFeature.properties.form_id = $('#tp_form_name').val();	// form id

                taskFeature.properties.assign_type = $("input[name='assign_type']:checked", "#task_properties").attr("id");
                if(taskFeature.properties.assign_type == 'tp_user_type') {
                    taskFeature.properties.assignee = $('#tp_user').val();
                } else if(taskFeature.properties.assign_type == 'tp_email_type') {
                    taskFeature.properties.assignee = 0;
                    taskFeature.properties.emails = $('#tp_assign_emails').val();
                    if(!validateEmails(taskFeature.properties.emails)) {
                        alert(localise.set["msg_inv_email"]);
                        return false;
                    }
                }


                taskFeature.properties.repeat = $('#tp_repeat').prop('checked');

                fromDate = $('#tp_from').data("DateTimePicker").date();
                toDate = $('#tp_to').data("DateTimePicker").date();
                if (fromDate) {
                    taskFeature.properties.from = utcTime(fromDate.format("YYYY-MM-DD HH:mm"));
                }
                if (toDate) {
                    taskFeature.properties.to = utcTime(toDate.format("YYYY-MM-DD HH:mm"));
                }
                taskFeature.properties.location_trigger = $('#nfc_select').val();
                taskFeature.properties.guidance = $('#tp_guidance').val();

                /*
                 * Convert the geoJson geometry into longitude and latitude for update
                 */
                if (gCurrentTaskFeature.geometry) {
                    if (gCurrentTaskFeature.geometry.coordinates && gCurrentTaskFeature.geometry.coordinates.length > 1) {
                        //taskFeature.properties.location = "POINT(" + gCurrentTaskFeature.geometry.coordinates.join(" ") + ")";  // deprecate
                        taskFeature.properties.lon = gCurrentTaskFeature.geometry.coordinates.coordinates[0];
                        taskFeature.properties.lat = gCurrentTaskFeature.geometry.coordinates.coordinates[1];

                    } else {
                        //taskFeature.properties.location = "POINT(0 0)"; // deprecate
                        taskFeature.properties.lon = 0;
                        taskFeature.properties.lat = 0;
                    }
                }

                // TODO task update details (updating existing record)

                // Validations
                /*
                 if(taskFeature.properties["repeat"]) || user.ident.length == 0) {
                 alert("User ident must be specified and either be an email address or " +
                 "only include lowercase characters from a-z and numbers.  No spaces.");
                 $('#user_ident').focus();
                 $('#userDetailsSave').prop("disabled", false);
                 return false;
                 }
                 */

                tfString = JSON.stringify(taskFeature);

                addHourglass();
                $.ajax({
                    type: "POST",
                    dataType: 'text',
                    cache: false,
                    contentType: "application/json",
                    url: url,
                    data: {task: tfString},
                    success: function (data, status) {
                        removeHourglass();
                        $('#task_properties').modal("hide");
                        refreshAssignmentData();
                    },
                    error: function (xhr, textStatus, err) {

                        removeHourglass();
                        alert(localise.set["msg_err_upd"] + xhr.responseText);

                    }
                });
            })

            $('#editTaskGroup').click(function () {
                var s_id = $('#survey').val();

                /*
                 * Make sure we have a current task group to edit
                 * The option should be greyed out if this is the case
                 */
                if (!gTaskGroups || gTaskGroups.length == 0) {
                    alert("No task group to edit");
                    return;
                }

                // Clear form
                $('#assign_survey_form')[0].reset();
                gUpdateTaskGroupIndex = gTaskGroupIndex;

                var tg = gTaskGroups[gTaskGroupIndex];
                var rule = gTaskGroups[gTaskGroupIndex].rule;
                if(typeof rule === "undefined") {
                    alert(localise.set["msg_tg_rd"]);
                    return;
                }
                var tgRule = JSON.parse(rule);

                $('#task_group_name').val(tgRule.task_group_name);

                // If added from a survey
                var filterQuestion = "-1";
                if(tg.source_s_id) {
                    $('#add_from_survey').prop('checked', true);
                    $('#add_task_from_existing').show();

                    $('#survey_to_complete').val(tg.target_s_id);
                    $('#users_task_group').val(tgRule.user_id);
                    $('#roles_task_group').val(tgRule.role_id);
                    $('#assign_data').val(tgRule.assign_data);
                    $('#fixed_role').val(tgRule.fixed_role_id);
                    $('#assign_emails').val(tgRule.emails);
                    $('#survey').val(tg.source_s_id);
                    $('#update_results').prop('checked', tgRule.update_results);
                    $('#add_current').prop('checked', tgRule.add_current);
                    $('#add_future').prop('checked', tgRule.add_future);

                    setupAssignType(tgRule.user_id, tgRule.role_id);    // Set up assign type

                    if(tgRule.user_id == -2 || tgRule.role_id == -2 ||
                            (tgRule.user_id == 0 && tgRule.role_id == 0)) {
                        $('.assign_data').show();
                    } else {
                        $('.assign_data').hide();
                    }
                    // Add Question Filter
                    $('.simple_filter').hide();
                    $('.advanced_filter').hide();
                    if(typeof tgRule.filter !== "undefined") {
                        if (typeof tgRule.filter.qId !== "undefined" && tgRule.filter.qId.length > 0) {

                            $('#filter_language').val(tgRule.lang_val);
                            $('#project_select').val(tgRule.filter.existing_proj);
                            filterQuestion = tgRule.filter.qId;
                            if(tgRule.filter.qType === "string") {
                                $('#filter_text').val(tgRule.filter.qText);
                            } else if(tgRule.filter.qType === "int") {
                                $('#filter_integer').val(tgRule.filter.qInteger);
                            }

                            if(tgRule.filter.qStartDate) {
                                $('#startDate').datetimepicker({
                                    useCurrent: false,
                                    locale: gUserLocale || 'en'
                                }).data("DateTimePicker").date(moment.utc(tgRule.filter.qStartDate));
                            }

                            if(tgRule.filter.qEndDate) {
                                $('#endDate').datetimepicker({
                                    useCurrent: false,
                                    locale: gUserLocale || 'en'
                                }).data("DateTimePicker").date(moment.utc(tgRule.filter.qEndDate));
                            }

                            $('#filter_results').prop('checked', true);
                            $('.simple_filter').show();
                        } else if (typeof tgRule.filter.advanced !== "undefined" && tgRule.filter.advanced.trim().length > 0) {
                            $('#tg_ad_filter').val(tgRule.filter.advanced);

                            $('#filter_results_advanced').prop('checked', true);
                            $('.advanced_filter').show(tgRule.filter.advanced);
                        }
                    }

                    if(tgRule.taskStart) {
                        $('#task_start').val(tgRule.taskStart);		// Get start of task
                        $('#task_after').val(tgRule.taskAfter);
                        $('#task_units').val(tgRule.taskUnits);
                        $('#task_duration').val(tgRule.taskDuration);
                        $('#duration_units').val(tgRule.durationUnits);
                    }
                } else {
                    $('#add_task_from_existing').hide();
                }

                // Set email details
                var emaildetails = tg.emaildetails;
                if(emaildetails) {
                    $('#email_from').val(emaildetails.from);
                    $('#email_subject').val(emaildetails.subject);
                    $('#email_content').val(emaildetails.content);
                }


                surveyChanged(filterQuestion);    // Set survey related parameters

                // open the modal for update
                $('#add_current').prop('disabled', true);
                $('#addTaskLabel').text(localise["t_edit_group"]);


                $('#addTask').modal("show");

            });

            // Add new Task Group
            $('#addTaskGroup').click(function () {
                var s_id = $('#survey').val();

                /*
                 * Make sure we have the survey id
                 */
                if (typeof s_id === "undefined" || s_id === null) {
                    alert(localise.set["msg_err_wait"]);
                    return;
                }

                // Clear form
                $('#assign_survey_form')[0].reset();
                gUpdateTaskGroupIndex = -1;

                $('#assign_user_type').prop('checked', true);
                $('#assign_role_type, #assign_email_type').prop('checked', false);
                $('#assign_user_type').closest('label').addClass('active');
                $('#assign_role_type').closest('label').removeClass('active');
                $('.assign_user').show();
                $('.assign_role').hide();

                surveyChanged("-1");
                $('#add_task_from_existing').hide();
                $('.simple_filter').hide();
                $('.advanced_filter').hide();

                // open the modal
                $('#addTask').find('input,select, #addNewGroupSave').prop('disabled', false);
                $('#addTaskLabel').text(localise["t_add_group"]);
                $('#addTask').modal("show");

            });


            /*
             * Create a new group or save the edited task group,
             *  optionally populated with tasks generated from existing survey results
             *  or from an XLS file
             */
            $('#addNewGroupSave').click(function () {
                var assignObj = {},
                    assignString,
                    url,
                    filterObj = {},
                    source_survey,
                    taskGroup,
                    tgId = -1;

                if(gUpdateTaskGroupIndex > -1) {
                    tgId = gTaskGroups[gTaskGroupIndex].tg_id;
                }

                // validation
                if (!validDates()) {
                    return;
                }

                taskGroup = $('#task_group_name').val();
                if (!taskGroup || taskGroup.trim() === "") {
                    alert(localise.set["msg_val_nm"]);
                    return;
                }


                updateTaskParams();

                assignObj["task_group_name"] = $('#task_group_name').val();	// The Name of the task group
                assignObj["project_name"] = $('#project_select option:selected').text();	// The name of the project that this survey is in

                if ($('#add_from_survey').is(':checked')) {

                    assignObj["survey_name"] = $('#survey_to_complete option:selected').text();	// The display name of the survey to complete
                    assignObj["target_survey_id"] = $('#survey_to_complete option:selected').val(); 		// The form id is the survey id of the survey used to complete the task!

                    var assignType = $("input[name='assign_type']:checked", "#addTask").attr("id");
                    if(assignType == 'assign_user_type') {
                        assignObj["user_id"] = $('#users_task_group option:selected').val(); 		// User assigned to complete the task
                        assignObj["role_id"] = 0;
                        assignObj["fixed_role_id"] = 0;
                    } else if(assignType == 'assign_role_type') {
                        assignObj["user_id"] = 0;
                        assignObj["role_id"] = $('#roles_task_group option:selected').val();
                        assignObj["fixed_role_id"] = $('#fixed_role option:selected').val();

                        // validate - The fixed role id should only be set if the role id is also set
                        if (assignObj["fixed_role_id"] > 0 &&  assignObj["role_id"] == 0) {
                            alert(localise.set["msg_val_ad2"]);
                            return;
                        }
                    } else if(assignType == 'assign_email_type') {
                        assignObj["user_id"] = 0;
                        assignObj["role_id"] = 0;
                        assignObj["fixed_role_id"] = 0;
                        assignObj["emails"] = $('#assign_emails').val();

                        // Text email must be valid email addresses
                        var emails = assignObj["emails"];
                        if(emails && emails.trim().length > 0) {
                            var emailArray = emails.split(",");
                            for (i = 0; i < emailArray.length; i++) {
                                if (!validateEmails(emailArray[i])) {
                                    alert(localise.set["msg_inv_email"]);
                                    break;
                                }
                            }
                        }
                    }
                    if(assignObj["user_id"] == -2 || assignObj["role_id"] == -2 || assignType == 'assign_email_type') {
                        assignObj["assign_data"] = $('#assign_data').val();

                        // validate
                        if (typeof assignObj["assign_data"] === "undefined" && assignObj["assign_data"].trim().length == 0) {
                            alert(localise.set["msg_val_ad"]);
                            return;
                        }
                    }

                    source_survey = $('#survey').val(); 						// The survey that provides the existing results
                    if (!source_survey) {
                        source_survey = -1;
                    }
                    assignObj["source_survey_id"] = source_survey;
                    assignObj["address_columns"] = removeUnselected(gTaskParams);
                    assignObj["source_survey_name"] = $('#survey option:selected').text();		// The display name of the survey that will provide the source locations and initial data
                    assignObj["update_results"] = $('#update_results').is(':checked'); 			// Set to true if the survey is to be updated

                    // Add filter if filter checkbox has been checked
                    if ($('#filter_results').is(':checked')) {

                        filterObj["qType"] = gFilterqType;
                        filterObj["lang_val"] = $('#filter_language option:selected').val();
                        filterObj["existing_proj"] = $('#project_select option:selected').val();
                        filterObj["qId"] = $('#filter_question option:selected').val();
                        filterObj["oValue"] = $('#filter_option option:selected').val();
                        filterObj["qText"] = $('#filter_text').val();
                        filterObj["qStartDate"] = getUtcDate($('#startDate'), true, false);		// Get start of day
                        filterObj["qEndDate"] = getUtcDate($('#endDate'), false, true);			// Get end of day
                        if (gFilterqType === "int") {
                            filterObj["qInteger"] = $('#filter_integer').val();
                        }
                        filterObj["lang"] = $('#filter_language option:selected').val();
                        assignObj["filter"] = filterObj;

                    } else if ($('#filter_results_advanced').is(':checked')) {
                        filterObj["advanced"] = $('#tg_ad_filter').val();
                        assignObj["filter"] = filterObj;
                    }

                    // Set flag to indicate if tasks should be created from data submitted before the task group creation, after or both
                    assignObj["add_current"] = $('#add_current').is(':checked');
                    assignObj["add_future"] = $('#add_future').is(':checked');

                    if (!assignObj["add_current"] && !assignObj["add_future"]) {
                        alert(localise.set["msg_ab_ns"]);
                        return;
                    }

                    // Start and durations
                    assignObj["taskStart"] = $('#task_start').val();		// Get start of task
                    assignObj["taskAfter"] = $('#task_after').val();
                    assignObj["taskUnits"] = $('#task_units').val();
                    assignObj["taskDuration"] = $('#task_duration').val();
                    assignObj["durationUnits"] = $('#duration_units').val();

                }

                // Add email details
                assignObj["emailDetails"] = {
                    from: $('#email_from').val(),
                    subject: $('#email_subject').val(),
                    content: $('#email_content').val()
                }

                assignString = JSON.stringify(assignObj);
                globals.gCurrentUserId = undefined;
                globals.gCurrentUserName = undefined;

                if(gUpdateTaskGroupIndex < 0) {
                    // Add new task group
                    addHourglass();
                    $.ajax({
                        type: "POST",
                        url: "/surveyKPI/assignments/addSurvey/" + globals.gCurrentProject,
                        cache: false,
                        data: {settings: assignString},
                        dataType: 'json',
                        success: function (data, status) {
                            removeHourglass();
                            $('#addTask').modal("hide");
                            globals.gCurrentTaskGroup = data.tg_id;
                            refreshTaskGroupData();
                        }, error: function (data, status) {
                            removeHourglass();
                            if (data.responseText.indexOf("<html>") !== 0) {
                                alert(localise.set["c_error"] + " : " + data.responseText);
                            } else {
                                alert(localise.set["msg_err_upd"]);
                            }

                        }
                    });
                } else {
                    // update task group
                    addHourglass();
                    $.ajax({
                        type: "POST",
                        url: "/surveyKPI/assignments/updatetaskgroup/" + globals.gCurrentProject + "/" + tgId,
                        cache: false,
                        data: {settings: assignString},
                        dataType: 'json',
                        success: function (data, status) {
                            removeHourglass();
                            $('#addTask').modal("hide");
                            globals.gCurrentTaskGroup = data.tg_id;
                            refreshTaskGroupData();
                        }, error: function (data, status) {
                            removeHourglass();
                            if (data.responseText.indexOf("<html>") !== 0) {
                                alert(localise.set["c_error"] + " : " + data.responseText);
                            } else {
                                alert(localise.set["msg_err_upd"]);
                            }

                        }
                    });
                }
            });


            /*
             * Function to delete current task group
             */
            $('#deleteTaskGroup').click(function () {

                var tg_id = globals.gCurrentTaskGroup;

                bootbox.confirm(localise.set["msg_confirm_del"] + ' ' + localise.set["msg_confirm_tasks"] + ' (' + $('#taskgroup option:selected').text() + ')', function (result) {
                    if (result) {
                        addHourglass();
                        $.ajax({
                            type: "DELETE",
                            url: "/surveyKPI/assignments/" + tg_id,
                            success: function (data, status) {
                                removeHourglass();
                                refreshTaskGroupData();
                            }, error: function (data, status) {
                                removeHourglass();
                                alert(localise.set["c_error"] +": " + data.responseText);
                            }
                        });
                    }
                });


            });

            /*
             * New Style add task function
             */
            $('#addSingleTask').click(function () {
                var task = {},
                    taskFeature = {
                        geometry: {
                            coordinates: []
                        },
                        properties: {}
                    };

                editTask(true, task, taskFeature);
            });


            // Delete Tasks button
            $('#deleteTasks').click(function () {

                var bulkAction = {
                    action: "delete",
                    tasks: getSelectedTaskIds()
                };

                bootbox.confirm(localise.set["msg_confirm_del"] + ' ' + bulkAction.tasks.length + ' ' + localise.set["m_assign"] +
                    '?', function (result) {
                    if (result) {
                        var baString = JSON.stringify(bulkAction),
                            url = "/surveyKPI/tasks/bulk/";

                        url += globals.gCurrentProject + "/" + globals.gCurrentTaskGroup;
                        addHourglass();
                        $.ajax({
                            type: "POST",
                            dataType: 'text',
                            cache: false,
                            contentType: "application/json",
                            url: url,
                            data: {tasks: baString},
                            success: function (data, status) {
                                removeHourglass();
                                refreshAssignmentData();
                            }, error: function (data, status) {
                                console.log(data);
                                removeHourglass();
                                alert(localise.set["c_error"] +": " + data.responseText);
                            }
                        });
                    }
                });
            });


            $('#taskParamsSave').click(function () {
                updateTaskParams();
            });

            // Respond to a new NFC being selected
            $('#nfc_select').change(function () {
                var tpname = $('#tp_name').val();
                if(!tpname || tpname.length == 0) {
                    $('#tp_name').val($(this).find(':selected').text());
                }
            });

            enableUserProfileBS();										// Enable user profile button
            $('#m_refresh').click(function (e) {	// Add refresh action
                refreshAssignmentData();
            });

            $('#m_email_unsent').click(function (e) {	// Add email unsent action
                emailUnsent();
            });

            $('#tasks_print').button();									// Add button styling

            // Set up the start and end dates with date picker
            $('#startDate').datetimepicker({					// Selecting start end times for tasks generated from survey
                useCurrent: false,
                locale: gUserLocale || 'en'
            }).data("DateTimePicker").date(moment());

            $('#endDate').datetimepicker({
                useCurrent: false,
                locale: gUserLocale || 'en'
            }).data("DateTimePicker").date(moment());

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

                    gCurrentTaskFeature.properties.from = utcTime(startDateLocal.format("YYYY-MM-DD HH:mm"));

                    if (!endDateLocal) {
                        newEndDate = startDateLocal.add(1, 'hours');
                    } else {
                        if (originalEnd && originalStart) {
                            duration = moment(originalEnd, "YYYY-MM-DD HH:mm").diff(moment(originalStart, "YYYY-MM-DD HH:mm"), 'hours');
                        } else {
                            duration = 1;
                        }
                        newEndDate = startDateLocal.add(duration, 'hours');
                    }
                } else {
                    if (!endDate) {
                        return;
                    } else {
                        // Clear the end date
                    }
                }

                $('#tp_to').data("DateTimePicker").date(newEndDate);

            });

            $('#tp_to').on("dp.change", function () {

                var endDateLocal = $('#tp_to').data("DateTimePicker").date();

                gCurrentTaskFeature.properties.to = utcTime(endDateLocal.format("YYYY-MM-DD HH:mm"));

            });

            /*
             * Set focus to first element on opening modals
             */
            $('.modal').on('shown.bs.modal', function () {
                var $selections = $(this).find('input[type=text],textarea,select').filter(':visible:first');
                $selections.focus();
            });


            /*
             * Take action on tab change to initialise tab contents
             * Refer: http://stackoverflow.com/questions/20705905/bootstrap-3-jquery-event-for-active-tab-change
             */
            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                var target = $(e.target).attr("href") // activated tab
                console.log("panel change: " + target);
                if (target === '#cal-view') {
                    if (!gCalendarInitialised) {
                        gCalendarInitialised = true;
                        setTimeout(function () {
                            initialiseCalendar();
                            $('#calendar').fullCalendar('option', 'locale', gUserLocale);
                        }, 500);
                    } else {
                        $('#calendar').fullCalendar('render');
                    }
                } else if (target === '#map-view') {
                    if (!gMapInitialised) {
                        gMapInitialised = true;
                        initialiseMap('map', 1, true, undefined, refreshMainMap);
                    }
                }
            });
        });

        /*
         * Get an array of taskIds that have been selected
         */
        function getSelectedTaskIds() {

            var tasks = [],
                idx;

            $('input[type=checkbox]:checked', '#task_table').each(function () {
                idx = $(this).val();
                tasks.push({
                    taskId: globals.gTaskList.features[idx].properties.id,
                    assignmentId: globals.gTaskList.features[idx].properties.a_id
                });

            });

            return tasks;
        }

        /*
         * Get an array of taskIds that are displayed and an email has not been sent
         */
        function getUnsentTaskIds() {

            var tasks = [],
                idx;
            for(idx = 0; idx < globals.gTaskList.features.length; idx++) {
                if (globals.gTaskList.features[idx].properties.status === "unsent") {
                    tasks.push({
                        taskId: globals.gTaskList.features[idx].properties.id,
                        assignmentId: globals.gTaskList.features[idx].properties.a_id
                    });
                }
            }

            return tasks;
        }

        /*
         * Refresh the main map
         */
        function refreshMainMap() {
            refreshMapAssignments('map', globals.gTaskList);
        }

        /*
         * Remove unselected address parameters
         */
        function removeUnselected(taskParams) {
            var i,
                minimalParams = [];
            if (taskParams) {
                for (i = taskParams.length - 1; i >= 0; i--) {
                    if (taskParams[i].selected) {
                        minimalParams.push(taskParams[i]);
                    }
                }
            }


            return minimalParams;
        }

        /*
         * Assign the specified user to all the pending assignment changes
         * User is optional
         */
        function updatePendingAssignments(status, user) {

            var userObj = {id: user},
                i;

            for (i = 0; i < globals.gPendingUpdates.length; i++) {
                if (user) {
                    globals.gPendingUpdates[i].user = userObj;
                }

                globals.gPendingUpdates[i].assignment_status = status;
            }
        }

        /*
         * Function called when the current project is changed
         */
        function projectChanged() {

            globals.gCurrentProject = $('#project_name option:selected').val();
            globals.gCurrentSurvey = -1;
            globals.gCurrentTaskGroup = undefined;

            loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged);			// Get surveys
            refreshTaskGroupData();		// Get the task groups from the server

            saveCurrentProject(globals.gCurrentProject,
                globals.gCurrentSurvey,
                globals.gCurrentTaskGroup);

            getUsers(globals.gCurrentProject);										// Get the users that have access to this project
            $('#project_select').val(globals.gCurrentProject);	// Set the source project equal to the current project

        }

        function surveyChanged(filterQuestion) {
            var sId = $('#survey').val();

            if(typeof filterQuestion === "undefined") {
                filterQuestion = "-1";
            }
            $('#filter_option').empty();
            getLanguageList(sId, questionChanged, false, '#filter_language', false, filterQuestion);
            setAddressOptions();
        }

        function languageChanged() {

            var language = $('#filter_language option:selected').val(),
                sId = $('#survey').val(),
                dateqId = $('#task_start').val();
                qList;

            qList = globals.gSelector.getSurveyQuestions(sId, language);

            if (!qList) {
                getQuestionList(sId, language, "-1", "-1", questionChanged, false, undefined, dateqId);
            } else {
                setSurveyViewQuestions(qList, qId, undefined, dateqId);
            }
        }

        function questionChanged() {
            var qId = $('#filter_question option:selected').val(),
                sId = $('#survey').val(),
                language = $('#filter_language option:selected').val(),
                $filter_option = $('#filter_option'),
                $filter_option_only = $('.filter_option_only'),
                $filter_integer_only = $('.filter_integer_only'),
                $filter_text_only = $('.filter_text_only'),
                $filter_date_only = $('.filter_date_only'),
                question = globals.gSelector.getQuestionDetails(sId, qId, language);

            $filter_option.empty();

            if (question) {
                gFilterqType = question.type;
                if (question.type === "select1" || question.type === "select") {
                    $filter_option_only.show();
                    $filter_integer_only.hide();
                    $filter_text_only.hide();
                    $filter_date_only.hide();

                    addHourglass();
                    // Get the meta data for the question
                    $.ajax({
                        url: questionMetaURL(sId, language, qId),
                        cache: false,
                        success: function (data) {
                            var i,
                                option,
                                h = [],
                                idx = -1;

                            removeHourglass();
                            console.log(data);
                            if (data && data.options) {
                                for (i = 0; i < data.options.length; i++) {
                                    option = data.options[i];
                                    h[++idx] = '<option value="';
                                    h[++idx] = option.value;
                                    h[++idx] = '">';
                                    h[++idx] = option.label;
                                    h[++idx] = '</option>';
                                }
                                $filter_option.append(h.join(''));

                                var tgRule = JSON.parse(gTaskGroups[gTaskGroupIndex].rule);
                                if(tgRule && tgRule.filter) {
                                    $filter_option.val(tgRule.filter.oValue);
                                }
                            }
                        },
                        error: function (xhr, textStatus, err) {
                            removeHourglass();
                            if (xhr.readyState == 0 || xhr.status == 0) {
                                return;  // Not an error
                            } else {
                                alert(localise.set["c_error"] +": " + err);
                            }
                        }
                    });
                } else if (question.type === "int") {
                    $filter_option_only.hide();
                    $filter_integer_only.show();
                    $filter_text_only.hide();
                    $filter_date_only.hide();

                } else if (question.type === "date" || question.type == "dateTime") {
                    $filter_option_only.hide();
                    $filter_integer_only.hide();
                    $filter_text_only.hide();
                    $filter_date_only.show();

                } else {	// Default to text (string)
                    $filter_option_only.hide();
                    $filter_integer_only.hide();
                    $filter_date_only.hide();
                    $filter_text_only.show();
                }
            }

        }

        /*
         * Add the columns that the user can select to create address information
         */
        function setAddressOptions() {

            var sId = $('#survey').val(),
                j,
                i;

            if (sId) {
                // Get the survey meta data
                addHourglass();
                $.ajax({
                    url: "/surveyKPI/survey/" + sId + "/getMeta",
                    dataType: 'json',
                    cache: false,
                    success: function (data) {
                        removeHourglass();

                        // Get the data for the top level table
                        addHourglass();
                        $.ajax({
                            url: "/surveyKPI/table/" + data.top_table,
                            dataType: 'json',
                            cache: false,
                            success: function (table) {
                                var colname,
                                    coltype,
                                    sMedia,
                                    h = [],
                                    idx = -1,
                                    i, j;
                                removeHourglass();

                                gTaskParams = [];
                                j = 0;
                                for (i = 0; i < table.columns.length; i++) {
                                    colname = table.columns[i].name;
                                    coltype = table.columns[i].type;

                                    if (colname !== "prikey" && colname !== "parkey" &&
                                        colname !== "the_geom" &&
                                        colname !== "geo_type" &&
                                        colname.indexOf("_") !== 0) {

                                        if (coltype && (coltype === "image" || coltype === "audio" || coltype === "video")) {
                                            isMedia = true;
                                        } else {
                                            isMedia = false;
                                        }
                                        gTaskParams[j++] = {
                                            selected: false,
                                            name: colname,
                                            isBarcode: false,
                                            isMedia: isMedia
                                        };

                                    }
                                }

                                displayTaskParams();

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

                    },
                    error: function (data) {
                        removeHourglass();
                        bootbox.alert("Error failed to get data for survey:" + sId);
                    }
                });
            }


        }

        /*
         * Get the list of users from the server
         */
        function getUsers(projectId) {
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
                            h[++idx] = user.name;
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

        /*
         * Get the list of roles from the server
         */
        function getRoles() {
            var $roles = $('.roles_select'),
                $fixed = $('#fixed_role'),
                i,
                role,
                h = [],
                idx = -1;

            $roles.empty();

            $roles.append('<option value="-1">' + localise.set["t_u"] + '</options>');
            $roles.append('<option value="-2">' + localise.set["t_ad"] + '</options>');
            $fixed.append('<option value="-1">' + localise.set["none"] + '</options>');
            $.ajax({
                url: "/surveyKPI/role/roles/names",
                cache: false,
                success: function (data) {

                    for (i = 0; i < data.length; i++) {
                        role = data[i];

                        h[++idx] = '<option value="';
                        h[++idx] = role.id;
                        h[++idx] = '">';
                        h[++idx] = role.name;
                        h[++idx] = '</option>';

                    }
                    $roles.append(h.join(''));
                    $fixed.append(h.join(''));
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
            for (i = 0; i < user.projects.length; i++) {
                if (user.projects[i].id == projectId) {
                    return true;
                }
            }
            return false;
        }

        /*
         * Get the task groups from the server
         */
        function refreshTaskGroupData() {

            if (typeof globals.gCurrentProject !== "undefined" && globals.gCurrentProject != -1) {
                addHourglass();
                $.ajax({
                    url: "/surveyKPI/tasks/taskgroups/" + globals.gCurrentProject,
                    cache: false,
                    dataType: 'json',
                    success: function (data) {
                        removeHourglass();
                        refreshTaskGroupList(data);
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
            } else {
                $('.for_selected, .for_is_tg').addClass('disabled');		// Disable task buttons
            }
        }

        /*
         * Update the table view of task groups
         */
        function refreshTaskGroupList(taskgroups) {

            var h = [],
                idx = -1,
                i,
                grp,
                firstTg,
                hasCurrentTg = false;

            gTaskGroups = taskgroups;   // Keep the task group list
            gTaskGroupIndex = 0;

            if (!taskgroups || taskgroups.length == 0) {
                $('#tasks_row').hide();
            } else {
                $('#tasks_row').show();
            }

            $('.for_selected, .for_is_tg').addClass('disabled');		// Disable task buttons

            if (typeof taskgroups != "undefined" && taskgroups.length > 0) {

                $('.for_is_tg').removeClass('disabled');				// Enable adding of task to the task group

                for (i = 0; i < taskgroups.length; i++) {
                    grp = taskgroups[i];
                    h[++idx] = '<option value="';
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = grp.name;
                    h[++idx] = '</option>';

                    if (i == 0) {
                        firstTg = grp.tg_id
                    }
                    if (grp.tg_id == globals.gCurrentTaskGroup) {
                        hasCurrentTg = true;
                        gTaskGroupIndex = i;
                    }
                }
            }
            $('#taskgroup').html(h.join(''));

            // Set current value for the task group
            if (!hasCurrentTg) {
                globals.gCurrentTaskGroup = firstTg;
            }
            $('#taskgroup').val(gTaskGroupIndex);


            $('#taskgroup').change(function () {
                gTaskGroupIndex = $(this).val();
                globals.gCurrentTaskGroup = gTaskGroups[gTaskGroupIndex].tg_id;
                saveCurrentProject(undefined, undefined, globals.gCurrentTaskGroup);
                refreshAssignmentData();
            })
            refreshAssignmentData();

        }

        /*
         * Email unsent tasks
         */
        function emailUnsent() {

            var bulkAction = {
                action: "email_unsent",
                tasks: getUnsentTaskIds()
                };
            var baString = JSON.stringify(bulkAction);
            var url = "/surveyKPI/tasks/bulk/" + globals.gCurrentProject
                + "/" + globals.gCurrentTaskGroup;

            $('.for_unsent_email').addClass('disabled');    // Disable send button

            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                cache: false,
                contentType: "application/json",
                url: url,
                data: {tasks: baString},
                success: function (data, status) {
                    removeHourglass();
                    refreshAssignmentData();
                }, error: function (data, status) {
                    removeHourglass();
                    alert(localise.set["c_error"] +": " + data.responseText);
                }
            });

        }

        /*
         * Get the assignments from the server
         */
        function refreshAssignmentData() {

            var user_filter = $('#users_filter').val(),
                completed = $('#filter_completed').is(':checked'),
                period_filter = $('#period').val();

            if (typeof globals.gCurrentTaskGroup !== "undefined" && globals.gCurrentTaskGroup != -1) {
                addHourglass();
                $.ajax({
                    url: "/surveyKPI/tasks/assignments/" +
                        globals.gCurrentTaskGroup +
                        "?user=" + user_filter + "&period=" + period_filter,
                    cache: false,
                    dataType: 'json',
                    success: function (data) {
                        removeHourglass();
                        globals.gTaskList = data;
                        if (gMapInitialised) {
                            refreshMapAssignments('map', globals.gTaskList);
                        }
                        refreshTableAssignments();
                        if (gCalendarInitialised) {
                            updateCalendar();
                        }
                    },
                    error: function (xhr, textStatus, err) {
                        removeHourglass();
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert("Failed to get table data");
                        }
                    }
                });
            }
        }

        /*
         * Update the table view of task data
         */
        function refreshTableAssignments() {

            var tasks = globals.gTaskList.features,
                h = [],
                idx = -1,
                i,
                item;

            gSelectedCount = 0;

            if (typeof tasks != "undefined") {

                $('#task_table_body').empty().html(getTableBody(tasks));

                if(gUnsentEmailCount > 0) {
                    $('.for_unsent_email').removeClass('disabled');
                } else {
                    $('.for_unsent_email').addClass('disabled');
                }


                // Respond to selection of a task
                $('input', '#task_table_body').change(function (event) {
                    var $this = $(this),
                        idx = $this.val(),
                        selected = $this.is(':checked');

                    if (selected) {
                        gSelectedCount++;
                    } else {
                        gSelectedCount--;
                    }

                    if (gSelectedCount > 0) {
                        $('.for_selected').removeClass('disabled');
                    } else {
                        $('.for_selected').addClass('disabled');
                    }

                    globals.gTaskList.features[idx].properties.selected = selected;
                    if (gMapInitialised) {
                        refreshMapAssignments('map', globals.gTaskList);
                    }
                });

                // Respond to clicking on task edit button
                $(".task_edit", '#task_table_body').click(function () {
                    var $this = $(this),
                        idx = $this.val(),
                        taskFeature = globals.gTaskList.features[idx],
                        task = taskFeature.properties;

                    editTask(false, task, taskFeature);
                });

                // Show barcodes
                $(".tasks").find('.barcode').each(function (index) {
                    var $bcElement = $(this);
                    $bcElement.barcode($bcElement.text(), "code11");
                });


            }
        }

        /*
         * Edit an existing task or create a new one
         */
        function editTask(isNew, task, taskFeature) {
            var scheduleDate,
                splitDate = [];

            console.log("open edit task: " + task.from);

            gCurrentTaskFeature = taskFeature;

            $('form[name="taskProperties"]')[0].reset();
            clearDraggableMarker('mapModal');

            if (isNew) {
                $('#taskPropLabel').html(localise.set["t_add_task"]);
            } else {
                $('#taskPropLabel').html(localise.set["t_edit_task"]);
            }

            /*
             * Set up data
             */
            $('#tp_repeat').prop('checked', task.repeat);
            $('#tp_name').val(task.name);		// name
            if(isNew) {
                $('#tp_form_name').val($('#tp_form_name option:first').val());
            } else {
                $('#tp_form_name').val(taskFeature.properties.form_id);	// form id
            }
            setupAssignType(taskFeature.properties.assignee, 0);
            $('#tp_user').val(taskFeature.properties.assignee);	// assignee
            $('#tp_assign_emails').val(taskFeature.properties.emails);
            $('#tp_repeat').prop('checked', taskFeature.properties.repeat);

            // Set end date first as otherwise since it will be null, it will be defaulted when from date set
            if (task.to) {
                $('#tp_to').data("DateTimePicker").date(localTime(task.to));
            }
            if (task.from) {
                $('#tp_from').data("DateTimePicker").date(localTime(task.from));
            }

            $('#nfc_select').val(task.location_trigger);
            if(task.guidance) {
                $('#tp_guidance').val(task.guidance);
            } else {
                $('#tp_guidance').val(task.address);    // Initialise with address data
            }
            if (task.update_id && task.update_id.length > 0) {
                $('#initial_data').html(getInitialDataLink(task.form_id, task.update_id));
            }

            $('#task_properties').modal("show");

            if (!gModalMapInitialised) {
                setTimeout(function () {
                    initialiseMap('mapModal', 14,
                        !gCurrentTaskFeature.geometry.coordinates[0] && !gCurrentTaskFeature.geometry.coordinates[1], 		// Show user location if there is no task location
                        clickOnMap, modalMapReady);
                }, 500);
                gModalMapInitialised = true;
            } else {
                gClickOnMapenabled = false;
                modalMapReady();
            }

        }

        /*
         * Called when the modal map is ready to accept features
         */
        function modalMapReady() {
            if (gCurrentTaskFeature.geometry.coordinates[0] || gCurrentTaskFeature.geometry.coordinates[1]) {
                addDraggableMarker('mapModal',
                    new L.LatLng(gCurrentTaskFeature.geometry.coordinates[1], gCurrentTaskFeature.geometry.coordinates[0]),
                    onDragEnd);
            } else {
                gClickOnMapEnabled = true;
            }
        }

        /*
         * Respond to a click on the modal map
         */
        function clickOnMap(latlng) {
            var x = 1,
                coords = [];

            if (gClickOnMapEnabled) {

                gClickOnMapEnabled = false;

                coords[0] = latlng.lng;
                coords[1] = latlng.lat;

                gCurrentTaskFeature.geometry.coordinates = coords;
                addDraggableMarker('mapModal', latlng, onDragEnd);

            }
        }

        /*
         * Respond to a drag of the task location on the modal map
         */
        function onDragEnd(latlng) {
            var x = 1,
                coords = [];

            coords[0] = latlng.lng;
            coords[1] = latlng.lat;

            gCurrentTaskFeature.geometry.coordinates = coords;
        }

        /*
         * Show the task parameters in the modal
         */
        function displayTaskParams() {

            var h = [],
                idx = -1,
                addressObj = null,
                i;

            h[++idx] = '<table class="table table-striped">';
            h[++idx] = '<thead>';
            h[++idx] = '<tr>';
            h[++idx] = '<th>Selected</th>';
            h[++idx] = '<th>Parameter Name</th>';
            h[++idx] = '<th>Barcode</th>';
            h[++idx] = '</tr>';
            h[++idx] = '</thead>';
            h[++idx] = '<tbody>';


            if (gTaskParams) {
                for (i = 0; i < gTaskParams.length; i++) {
                    h[++idx] = '<tr>';
                    h[++idx] = '<td class="task_selected"><input type="checkbox" name="isSelected" value="';
                    h[++idx] = gTaskParams[i].name;
                    h[++idx] = '" ';
                    if (gTaskParams[i].selected !== false) {
                        h[++idx] = 'checked="checked"';
                    }
                    h[++idx] = '></td>';
                    h[++idx] = '<td class="task_name">' + gTaskParams[i].name + '</td>';
                    h[++idx] = '<td class="task_isBarcode"><input type="checkbox" name="isBarcode" value="';
                    h[++idx] = gTaskParams[i].name;
                    h[++idx] = '" ';
                    if (gTaskParams[i].isBarcode !== false) {
                        h[++idx] = 'checked="checked"';
                    }
                    h[++idx] = '></td>';
                    h[++idx] = '</tr>';
                }

            }

            h[++idx] = '</tbody>';
            h[++idx] = '</table>';

            $('.task_params_table').empty().append(h.join(''));

        }

        /*
         * Get the updated parameters from the modal and save back into the global parameters object
         */
        function updateTaskParams() {

            var name,
                selected,
                isBarcode,
                isMedia,
                updatedTaskParams = [],
                $this;


            $('#task_params_table_main').find('tbody tr').each(function (index) {
                $this = $(this);
                name = $this.find('td.task_name').text();
                selected = $this.find('td.task_selected input').prop('checked');
                isBarcode = $this.find('td.task_isBarcode input').prop('checked');
                isMedia = gTaskParams[index].isMedia;
                updatedTaskParams[index] = {selected: selected, name: name, isBarcode: isBarcode, isMedia: isMedia};
            });
            gTaskParams = updatedTaskParams;

        }

        /*
         * Create HTML for task table
         * New
         */
        function getTableBody(tasks) {
            var surveyName,
                tab = [],
                idx = -1,
                i;

            gUnsentEmailCount = 0;

            // Filter on status
            var statusFilterArray = $('#status_filter').val();
            var statusFilter = statusFilterArray ? statusFilterArray.join('') : "";
            var statusLookup;

            for (i = 0; i < tasks.length; i++) {
                task = tasks[i];

                if(task.properties.status === "unsent") {
                    gUnsentEmailCount++;
                }

                if(statusFilter.indexOf(task.properties.status) >= 0) {
                    tab[++idx] = '<tr>';
                    tab[++idx] = addSelectCheckBox(false, i, false);

                    tab[++idx] = '<td>';
                    tab[++idx] = task.properties.id;
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';
                    tab[++idx] = task.properties.form_name;
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';			// Task name
                    tab[++idx] = task.properties.name;
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td class="' + getStatusClass(task.properties.status) + '">';	// status
                    statusLookup = task.properties.status;
                    if(statusLookup === "error" || statusLookup === "pending" || statusLookup === "blocked") {
                        statusLookup = "c_" + statusLookup;
                    }
                    tab[++idx] = localise.set[statusLookup];
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';		// Assignee
                    tab[++idx] = task.properties.assignee_name;
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';			// NFC
                    if (task.properties.location_trigger && task.properties.location_trigger.length > 0) {
                        if (task.properties.location_trigger.indexOf('{') == 0) {
                            tab[++idx] = '<i class="fa fa-crosshairs"></i>';	// Geo fence
                        } else {
                            tab[++idx] = '<i class="fa fa-wifi"></i>';			// NFC
                        }
                    }
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';			// Existing data
                    if (task.properties.update_id && task.properties.update_id.length > 0) {
                        tab[++idx] = getInitialDataLink(task.properties.form_id, task.properties.update_id);
                    }
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';			// Blocked
                    if (task.properties.blocked) {
                        tab[++idx] = '<i class="fa fa-ban has_tt" title="Survey Blocked"></i>';	// Survey Blocked
                    }
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';			// Repeat Count
                    if (task.properties.repeat) {
                        tab[++idx] = task.properties.repeat_count;
                    }
                    tab[++idx] = '</td>';

                    tab[++idx] = '<td>';		// scheduled
                    tab[++idx] = localTime(task.properties.from);
                    tab[++idx] = '<td>';			// edit
                    tab[++idx] = '<button class="btn btn-default task_edit" value="';
                    tab[++idx] = i;
                    tab[++idx] = '" type="button"><i class="fa fa-edit"></i></button>';
                    tab[++idx] = '</td>';


                    tab[++idx] = '</tr>';
                }
            }
            return tab.join('');

        }

        function getInitialDataLink(form_id, update_id) {
            var tab = [];
            idx = -1;

            tab[++idx] = '<a href="';
            tab[++idx] = getWebFormUrl(task.properties.form_ident, task.properties.update_id);
            tab[++idx] = '" target="_blank">'
            tab[++idx] = '<i class="fa fa-file-text"></i>';	// Edit existing data
            tab[++idx] = '</a>';

            return tab.join('');
        }

        function getWebFormUrl(form_ident, update_id) {
            var url;

            url = "/webForm/" + form_ident;
            if (update_id) {
                url += "?datakey=instanceid&datakeyvalue=" + update_id;
                url += "&viewOnly=true"
            }

            return url;
        }

        function getStatusClass(status) {

            var statusClass = "";

            if (status === "new" || status === "unsent" || status === "unsubscribed" || status === "blocked") {
                statusClass = "bg-danger";
            } else if (status === "submitted") {
                statusClass = "bg-success";
            } else if (status === "accepted") {
                statusClass = "bg-warning";
            } else {
                statusClass = "bg-success";
            }
            return statusClass;
        }

        /*
         * Import a task group from a spreadsheet
         */
        function importTaskGroup() {
            var url = '/surveyKPI/tasks/xls/' + globals.gCurrentProject,
                name = $('#taskgroup option:selected').text();

            $('#tg_to_import').val(globals.gCurrentTaskGroup);
            var f = document.forms.namedItem("loadtasks");
            var formData = new FormData(f);

            $('#load_tasks_alert').hide();

            addHourglass();
            $.ajax({
                type: "POST",
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                url: url,
                success: function (data, status) {
                    removeHourglass();
                    $('#import_taskgroup').modal("hide");
                    $('#load_tasks_alert').show().removeClass('alert-danger').addClass('alert-success').empty("");
                    refreshAssignmentData();
                    getLocations(setLocationList);	// Refresh the location data since new locations may have been loaded
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    var msg = xhr.responseText;
                    $('#load_tasks_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);

                }
            });
        }


        /*
         * Initialise the calendar
         */
        function initialiseCalendar() {
            var date = new Date();
            var d = date.getDate();
            var m = date.getMonth();
            var y = date.getFullYear();

            var events = getEvents();

            $('#calendar').fullCalendar({
                header: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'month,agendaWeek,agendaDay'
                },
                contentHeight: 300,
                aspectRatio: 1.35,
                editable: true,
                droppable: true,
                drop: function () {
                    $(this).remove();
                },
                dayClick: function (date, jsEvent, view) {

                    console.log('Clicked on: ' + date.format());
                    console.log('Coordinates: ' + jsEvent.pageX + ',' + jsEvent.pageY);
                    console.log('Current view: ' + view.name);

                    // change the day's background color
                    //$(this).css('background-color', 'red');
                    $('#calendar').fullCalendar('gotoDate', date);
                    $('#calendar').fullCalendar('changeView', 'agendaDay');

                },
                eventDrop: function (event, delta, revertFunc) {
                    var feature = {
                        properties: {
                            id: globals.gTaskList.features[event.taskIdx].properties.id,
                            from: utcTime(event.start.format("YYYY-MM-DD HH:mm")),
                            to: utcTime(event.end.format("YYYY-MM-DD HH:mm"))
                        }
                    };
                    updateWhen(feature, revertFunc, event.taskIdx);
                },
                eventResize: function (event, delta, revertFunc) {
                    var feature = {
                        properties: {
                            id: globals.gTaskList.features[event.taskIdx].properties.id,
                            from: utcTime(event.start.format("YYYY-MM-DD HH:mm")),
                            to: utcTime(event.end.format("YYYY-MM-DD HH:mm"))
                        }
                    };
                    updateWhen(feature, revertFunc, event.taskIdx);
                },
                eventClick: function (event) {
                    var taskFeature = globals.gTaskList.features[event.taskIdx],
                        task = taskFeature.properties;

                    editTask(false, task, taskFeature);
                },
                eventReceive: function (event) {
                    event.taskIdx = gIdx;
                    var feature = {
                        properties: {
                            id: globals.gTaskList.features[event.taskIdx].properties.id,
                            from: utcTime(event.start.format("YYYY-MM-DD HH:mm")),
                            to: utcTime(event.end.format("YYYY-MM-DD HH:mm"))
                        }
                    };

                    globals.gTaskList.features[event.taskIdx].from = utcTime(event.start.format("YYYY-MM-DD HH:mm"));
                    globals.gTaskList.features[event.taskIdx].to = utcTime(event.end.format("YYYY-MM-DD HH:mm"));
                    updateWhen(feature, undefined, event.taskIdx);
                },
                drop: function () {
                    gIdx = $(this).data("idx");
                    $(this).remove();
                },
                events: events

            });

            $('#external-events div.external-event').each(function () {

                // store data so the calendar knows to render an event upon drop
                $(this).data('event', {
                    title: $.trim($(this).text()), // use the element's text as the event title
                    stick: true // maintain when user navigates (see docs on the renderEvent method)
                });

                // make the event draggable using jQuery UI
                $(this).draggable({
                    zIndex: 1111999,
                    revert: true,      // will cause the event to go back to its
                    revertDuration: 0  //  original position after the drag
                });

            });


        }

        /*
         * Update a single property
         * No need to refresh assignments after the update as the change has already been applied to the local model
         */
        function updateWhen(taskFeature, revertFunc, idx) {

            var url = "/surveyKPI/tasks/when/" + globals.gCurrentProject + "/" + globals.gCurrentTaskGroup,
                tfString = JSON.stringify(taskFeature),
                tasks = globals.gTaskList.features,
                i;

            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                cache: false,
                contentType: "application/json",
                url: url,
                data: {task: tfString},
                success: function (data, status) {
                    removeHourglass();

                    tasks[idx].properties.from = taskFeature.properties.from;
                    tasks[idx].properties.to = taskFeature.properties.to;

                    refreshTableAssignments();
                },
                error: function (xhr, textStatus, err) {

                    removeHourglass();
                    revertFunc();
                    alert(localise.set["msg_err_upd"] + xhr.responseText);

                }
            });
        }

        function updateCalendar() {

            var events = getEvents();

            $('#calendar').fullCalendar('removeEvents');
            $('#calendar').fullCalendar('addEventSource', events)
        }

        /*
         * Convert the current task list into events
         */
        function getEvents() {
            var tasks = tasks = globals.gTaskList.features,
                events = [],
                event = {},
                h = [];
            idx = -1;

            for (i = 0; i < tasks.length; i++) {
                task = tasks[i].properties;
                if (task.from) {
                    event = {
                        title: task.name,
                        start: localTimeAsDate(task.from),
                        allDay: false,
                        taskIdx: i
                    };
                    if (task.to) {
                        event.end = localTimeAsDate(task.to)
                    }
                    events.push(event);
                } else {
                    h[++idx] = '<div class="external-event navy-bg" data-idx="';
                    h[++idx] = i;
                    h[++idx] = '" data-start="09:00" data-duration = "01:00"';
                    h[++idx] = '>';
                    h[++idx] = task.name;
                    h[++idx] = '</div>';
                }
            }

            $('#dragTask').html(h.join(''));

            return events;
        }

        function setupAssignType(user_id, role_id) {
            $('.assign_group').hide();
            $('.assign_checkbox').prop('checked', false);
            $('.assign_checkbox').closest('label').removeClass('active');
            if(user_id != 0) {
                $('.user_type_checkbox').prop('checked', true);
                $('.user_type_checkbox').closest('label').addClass('active');
                $('.assign_user').show();

            } else  if(role_id != 0) {
                $('.role_type_checkbox').prop('checked', true);
                $('.role_type_checkbox').closest('label').addClass('active');
                $('.assign_role').show();
            } else {
                $('.email_type_checkbox').prop('checked', true);
                $('.email_type_checkbox').closest('label').addClass('active');
                $('.assign_email').show();
            }
        }

    });
