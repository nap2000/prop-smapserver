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

define(['jquery','localise', 'common', 'globals','moment', 'datetimepicker'],
    function($, lang, common, globals, moment) {

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
	        $('#form_access_report_save').click(function(){
		        executeFormAccessReport();
	        });
            $('#m_notification_report').click(function(){
                executeNotificationReport();
            });
            $('#m_resource_usage_report').click(function(){
                executeResourceUsageReport();
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
                        gSurveys = data;
                        //setLocalTime();		// Convert timestamps from UTC to local time
                        completeSurveyList();
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
                    var h = [],
                        idx = -1,
                        i;

                    h[++idx] = '<option value="0">';
                    h[++idx] = localise.set["c_none"]
                    h[++idx] = '</option>';
                    for(i = 0; i < data.length; i++) {
                        h[++idx] = '<option value="';
                        h[++idx] = data[i].id;
                        h[++idx] = '">';
                        h[++idx] = htmlEncode(data[i].projectName);
                        h[++idx] = ' : ';
                        h[++idx] = htmlEncode(data[i].displayName);
                        h[++idx] = '</option>';
                    }
                    $('#group').empty().append(h.join(''));

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
                selIdx = -1;

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
                    } if(survey.oversightSurvey && !survey.dataSurvey) {
                        h[++idx] = localise.set["m_os"];
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
                    h[++idx] = htmlEncode(survey.groupSurveyDetails);
                    h[++idx] = '</td>';

                    h[++idx] = '<td>';
                    h[++idx] = '<button class="btn survey_replace" value="';
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = '<i class="fas fa-sync-alt"></i>';
                    h[++idx] = '</button>';
                    h[++idx] = '</td>';

                    h[++idx] = '<td>';

                    h[++idx] = '<a class="btn btn-primary mr-2 survey_view" data-sid="';
                    h[++idx] = survey.id;
                    h[++idx] = '" href="/app/myWork/webForm/';                    // Webform
                    h[++idx] = survey.ident;
                    h[++idx] = addCacheBuster("");
                    h[++idx] = '" target="_blank">'
                    h[++idx] = '<i class="fa fa-eye"></i>';
                    h[++idx] = '</a>';

                    if(survey.publicLink && survey.publicLink.trim().length > 0) {              // Link
                        h[++idx] = '<button class="btn btn-success mr-2 survey_link" value="';
                    } else {
                        h[++idx] = '<button class="btn btn-info mr-2 survey_link" value="';
                    }
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = '<i class="fa fa-share-alt"></i>';
                    h[++idx] = '</button>';

                    h[++idx] = '<button class="btn btn-secondary pdf_td" value="';                            // Download
                    h[++idx] = survey.id;
                    h[++idx] = '"><i class="fa fa-download"></i>';
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
                for(i = 0; i < surveys.length; i++) {
                    deleteTemplate(surveys[i].id, surveys[i].name, true);
                }
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
                for(i = 0; i < surveys.length; i++) {
                    executeUnDelete(surveys[i].id, surveys[i].name);
                }
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
                for(i = 0; i < surveys.length; i++) {
                    deleteTemplate(surveys[i].id, surveys[i].name, false);
                }
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
                    var projectId = $('#project_name option:selected').val();
                    getSurveys(projectId);
                    getPotentialGroupSurveys();
                    removeHourglass();
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

		    var formIdent = $('#survey_access').val();

		    downloadFile("/surveyKPI/adminreport/formaccess/" + formIdent);
	    }

        function executeNotificationReport() {

            downloadFile("/surveyKPI/adminreport/notifications/");
        }

        function executeResourceUsageReport() {

            downloadFile("/surveyKPI/adminreport/resourceusage/");
        }

    });
