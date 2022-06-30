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

define(['jquery', 'app/map-ol-mgmt', 'localise', 'common', 'globals', 'moment', 'app/monitorChart'],
    function($, ol_mgmt, lang, common, globals, moment, chart) {

        var gStartEvents = [],		// Only in this java script file
            gPageCount = 1,			// Only in this java script file
            gCaseProgress;

        let SUBMIT_PANEL = "submit";
        let FORMS_PANEL = "forms";
        let NOTIFICATIONS_PANEL = "notify";
        let OPTIN_MSG_PANEL = "optin";
        let CASE_PANEL = "case";

        window.gMonitor = {
            caseProgress: undefined,
            cache: {
                caseProgress: {}
            }
        };

        $(document).ready(function() {

            setTheme();
	        setupUserProfile(true);
            window.moment = moment;

            localise.setlang();		// Localise HTML

            getLoggedInUser(projectChanged, false, true, undefined);

            gPanel = 'submit';

            /*
             * Handle tabs
             */
            $('#submitTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), SUBMIT_PANEL);
            });

            $('#notifyTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), NOTIFICATIONS_PANEL);
            });

            $('#optinTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), OPTIN_MSG_PANEL);
            });
            $('#caseTab a').click(function (e) {
                e.preventDefault();
                panelChange($(this), CASE_PANEL);
            });

            // Initialise the map and then hide it
            $('#uploaded_map').removeClass('d-none').show();
            initializeMap();
            $('#uploaded_map, #layers').hide();


            // change functions
            // Display Type
            $('#showType').change(function () {
                setcontrols();
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            $('#showInterval').change(function () {
                refreshCases();
            });

            $('#showAs').change(function () {
                setcontrols();
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            $('input[name=groupsurvey]').change(function () {
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            // Set change function on projects
            $('#project_name').change(function() {
                projectChanged();
                setcontrols();
            });

            // Survey Change
            $('#survey').change(function () {
                setcontrols();
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
                refreshCases();
            });

            // Status values change
            $('#showstatus :checkbox:checked').change(function () {
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            // Status values change
            $('#ignoreOldIssues').change(function () {
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            // Add zoom to data button
            $('#zoomData').button().click(function () {
                zoomTo("events");
            });


            $('#m_refresh').click(function() {
                gMonitor.cache = {};
                refreshCases();
                refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            });

            // retry submissions
            $('#submission_retry').click(function() {
               let survey = $('#survey').val();

                addHourglass();
                $.ajax({
                    url: "/surveyKPI/eventList/submission_retry/" + survey,
                    dataType: 'text',
                    cache: false,
                    success: function() {
                        removeHourglass();
                        refreshData(globals.gCurrentProject, $('#survey option:selected').val());
                    },
                    error: function(xhr, textStatus, err) {
                        removeHourglass();
                        if(xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert("Failed retry survey");
                        }
                    }
                });
            });

            setcontrols();

            $('#tableradio').prop('checked',true);

            // Handle more / less buttons
            $('.get_less').click(function() {
                var currentStart = gStartEvents.pop();
                var newStart = gStartEvents.pop();
                gPageCount--;
                refreshData(globals.gCurrentProject, $('#survey option:selected').val(), newStart);
            });
            $('.get_more').click(function() {
                gPageCount++;
                refreshData(globals.gCurrentProject, $('#survey option:selected').val(), parseInt($(this).val()));
            });

            /*
             * Get the data
             */
            refreshData(globals.gCurrentProject, $('#survey option:selected').val());
            refreshCases();

            // Set page defaults
            var currentTab = getFromLocalStorage("currentTab" + $('body').data('page'));
            if(currentTab) {
                $(currentTab).trigger('click');
            } else {
                $('#submitTab a').trigger('click');
            }

        });

        function setcontrols() {

            var survey = $('#survey option:selected').val(),
                showType = $('#showType').val(),
                showAs = $('#showAs').val();

            $('.conditional').hide();

            if(gPanel === SUBMIT_PANEL || gPanel === NOTIFICATIONS_PANEL || gPanel === OPTIN_MSG_PANEL) {
                $('.showtype, #showstatus').removeClass('d-none').show();

                if(typeof survey !== "undefined" && survey !== "_all" && showType !== "instances") {
                    $('#groupsurvey').removeClass('d-none').show();
                }
            }

            if(gPanel === SUBMIT_PANEL || gPanel === NOTIFICATIONS_PANEL) {
                $('.showold').removeClass('d-none').show();
            }

            if(gPanel !== OPTIN_MSG_PANEL) {
                $('.showproject').removeClass('d-none').show();
            }

            if(gPanel === CASE_PANEL) {
                $('.showinterval').removeClass('d-none').show();
            }

            if(typeof survey !== "undefined" && survey !== "_all" && gPanel === SUBMIT_PANEL) {
                $('.retry').removeClass('d-none').show();
            }

            if(gPanel === SUBMIT_PANEL) {
                if (showType === "instances") {
                    $(".showmap,.get_less_more, .showtarget").show();
                    if(showAs === "table") {
                        $('.uploaded').removeClass('d-none').show();
                    } else {
                        $('.uploaded_map').removeClass('d-none').show();
                    }
                } else {
                    $('.uploaded').removeClass('d-none').show();
                }

            }
        }

        function projectChanged() {
            globals.gCurrentProject = $('#project_name option:selected').val();
            globals.gCurrentSurvey = -1;
            globals.gCurrentTaskGroup = undefined;
            $('#survey').val("_all");

            loadSurveys(globals.gCurrentProject, undefined, false, true, undefined, false);			// Get surveys

            saveCurrentProject(globals.gCurrentProject,
                globals.gCurrentSurvey,
                globals.gCurrentTaskGroup);

            refreshData(globals.gCurrentProject, "_all");
        }

        function refreshData(projectId, surveyId, start_rec) {

            var hide_success=true,
                hide_errors=true,
                hide_duplicates=true,
                hide_merged=true,
                hide_upload_errors=true,
                hide_not_loaded=true;

            $('#showstatus :checkbox:checked').each(function() {
                var $this = $(this).val();
                if($this === "success") {
                    hide_success=false;
                }
                if($this === "errors") {
                    hide_errors=false;
                }
                if($this === "not_loaded") {
                    hide_not_loaded=false;
                }
                if($this === "duplicates") {
                    hide_duplicates=false;
                }
                if($this === "merged") {
                    hide_merged=false;
                }
                if($this === "upload_errors") {
                    hide_upload_errors=false;
                }
            });

            var groupby =  $("input[name=groupsurvey]:checked").val();
            var showType = $("#showType").val();
            var isForward = false;
            var ignoreOldIssue = $(ignoreOldIssues).is(':checked');

            function refreshDataExec(showTypeE, showSourceE) {

                if(typeof start_rec === "undefined") {
                    start_rec = 0;
                    gPageCount = 1;
                }

                var url;
                if(showSourceE === NOTIFICATIONS_PANEL) {
                    url = "/surveyKPI/eventList/notifications/" + projectId + "/" + surveyId;
                } else  if(showSourceE === OPTIN_MSG_PANEL) {
                    url = "/surveyKPI/eventList/optin";
                } else {
                    url = "/surveyKPI/eventList/" + projectId + "/" + surveyId;
                }


                if(showSourceE === FORMS_PANEL) {
                    url += "/forms";
                } else {
                    if(showTypeE === "totals" ) {
                        url += "/totals";
                    }
                    url +=
                        "?hide_success=" + hide_success +
                        "&hide_errors=" + hide_errors +
                        "&hide_not_loaded=" + hide_not_loaded +
                        "&hide_duplicates=" + hide_duplicates +
                        "&hide_merged=" + hide_merged +
                        "&hide_upload_errors=" + hide_upload_errors +
                        "&is_forward=" + isForward;


                    if(showTypeE === "totals" && surveyId !== "_all") {
                        url += "&groupby=" + groupby;
                    }
                    if(ignoreOldIssue) {
                        url += "&ignore_old_issues=true";
                    }

                    url += "&start_key=" + start_rec;
                    url += "&rec_limit=200";
                }

                addHourglass();
                $.ajax({
                    url: url,
                    cache: false,
                    dataType: 'json',
                    success: function(data) {
                        removeHourglass();

                        console.log("+++++++++++ received data: " + showSourceE + " : " + showTypeE);

                        // Save start and end records for less & more buttons
                        if(typeof data.totals !== "undefined") {
                            gStartEvents.push(start_rec);
                            $('.get_more').val(data.totals.max_rec);
                            if(start_rec === 0) {
                                $('.get_less').prop("disabled", true);
                            } else {
                                $('.get_less').prop("disabled", false);
                            }
                            if(data.totals.more_recs === 0) {
                                $('.get_more').prop("disabled", true);
                            } else {
                                $('.get_more').prop("disabled", false);
                            }
                            var totals_msg = localise.set["mon_page"];
                            totals_msg = totals_msg.replace("%s1", gPageCount );
                            totals_msg = totals_msg.replace("%s2", data.totals.from_date );
                            totals_msg = totals_msg.replace("%s3", data.totals.to_date );
                            $('.get_less_more_text').html(totals_msg);
                        }
                        if(showSourceE === FORMS_PANEL) {
                            refreshFormsTable(data);
                        } else if(showSourceE === NOTIFICATIONS_PANEL || showSourceE === OPTIN_MSG_PANEL) {
                            refreshNotificationsTable(data, showType, showSourceE);
                        } else if(showSourceE === SUBMIT_PANEL) {
                            refreshUploadedTable(data, showType);
                            if(showTypeE !== "totals") {
                                refreshMap(data);
                            }
                        }
                    },
                    error: function(xhr, textStatus, err) {
                        removeHourglass();
                        if(xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert("Failed to get data on submission of results");
                        }
                    }
                });
            }

            if(typeof projectId !== "undefined" && projectId != -1 && typeof surveyId != "undefined") {
                refreshDataExec(showType, gPanel);
            }
        }

        function refreshUploadedTable(data) {

            var features = data.features,
                $elem = $('#submit_events'),
                $msg = $('#submit_msg'),
                h = [],
                i = -1,
                j,
                locn,
                status,
                reason,
                sId = $('#survey option:selected').val(),
                groupby =  $("input[name=groupsurvey]:checked").val(),
                showType = $("#showType").val();


            $msg.empty();

            if(typeof features === "undefined" || features.length === 0) {
                var msg;
                if(gPanel === "forms" && sId == "_all") {
                    msg = "<h5>" + localise.set["msg_saf"] + "</h5>";
                } else if(gPanel === "forms" ) {
                    msg = "<h5>" + localise.set["msg_nf"] + "</h5>";
                } else if(gPanel === "uploaded") {
                    msg = "<h5>" + localise.set["msg_ns"] + "</h5>";
                } else {
                    msg = "<h5>" + localise.set["msg_us"] + "</h5>";
                }
                $elem.empty();
                $msg.html(msg);
                return;
            }
            // Add the head
            h[++i] = '<thead class="thead-dark">';
            h[++i] = '<tr>';
            if(showType === "totals") {
                if(sId === "_all") {
                    h[++i] = '<th>' + localise.set["c_survey"] + '</th>';
                } else {
                    h[++i] = '<th>' + groupby + '</th>';
                }
                if(typeof features[0].properties.success !== "undefined") {
                    h[++i] = '<th>' + localise.set["c_success"] + '</th>';
                }
                if(typeof features[0].properties.errors !== "undefined") {
                    h[++i] = '<th>' + localise.set["c_errors"] + '</th>';
                }
                if(typeof features[0].properties.duplicates  !== "undefined") {
                    h[++i] = '<th>' + localise.set["mon_dup"] + '</th>';
                }
                if(typeof features[0].properties.merged  !== "undefined") {
                    h[++i] = '<th>' + localise.set["mon_att"] + '</th>';
                }
                if(typeof features[0].properties.not_loaded  !== "undefined") {
                    h[++i] = '<th>' + localise.set["mon_nl"] + '</th>';
                }
                if(typeof features[0].properties.upload_errors  !== "undefined") {
                    h[++i] = '<th>' + localise.set["mon_ue"] + '</th>';
                }

            } else {
                h[++i] = '<th>' + localise.set["c_id"] +'</th>';
                h[++i] = '<th>' + localise.set["mon_uid"] + '</th>';
                h[++i] = '<th>' + localise.set["mon_ud"] + ' ' + localise.set["c_lt"] + '</th>';
                h[++i] = '<th>' + localise.set["c_user"] + ' ' + localise.set["c_ident"] + '</th>';
                h[++i] = '<th>' + localise.set["mon_pi"] + '</th>';
                h[++i] = '<th>' + localise.set["mon_file"] + '</th>';
                h[++i] = '<th>' + localise.set["c_survey"] + '</th>';
                h[++i] = '<th>' + localise.set["c_ident"] + '</th>';
                h[++i] = '<th>' + localise.set["c_location"] + '</th>';
                h[++i] = '<th>' + localise.set["c_complete"] + '</th>';
                h[++i] = '<th>' + localise.set["c_status"] + '</th>';
                h[++i] = '<th>' + localise.set["mon_fr"] + '</th>';
            }
            h[++i] = '</tr>';
            h[++i] = '</thead>';

            // Add the body
            h[++i] = '<tbody>';
            for(j = 0; j < features.length; j++) {
                h[++i] = '<tr>';
                if(showType === "totals") {
                    h[++i] = '<td>' + htmlEncode(features[j].properties.key) + '</td>';
                    if(typeof features[j].properties.success !== "undefined") {
                        h[++i] = '<td>' + features[j].properties.success + '</td>';
                    }
                    if(typeof features[j].properties.errors !== "undefined") {
                        h[++i] = '<td' + (features[j].properties.errors > 0 ? ' class="text-danger"' : '') + '>' + features[j].properties.errors + '</td>';
                    }
                    if(typeof features[j].properties.duplicates !== "undefined") {
                        h[++i] = '<td>' + features[j].properties.duplicates + '</td>';
                    }
                    if(typeof features[j].properties.merged !== "undefined") {
                        h[++i] = '<td>' + features[j].properties.merged + '</td>';
                    }
                    if(typeof features[j].properties.not_loaded !== "undefined") {
                        h[++i] = '<td>' + features[j].properties.not_loaded + '</td>';
                    }
                    if(typeof features[j].properties.upload_errors !== "undefined") {
                        h[++i] = '<td>' + features[j].properties.upload_errors + '</td>';
                    }
                } else {
                    h[++i] = '<td>' + ((typeof features[j].properties.se_id === "undefined") ? "" : features[j].properties.se_id) + '</td>';
                    h[++i] = '<td>' + features[j].properties.ue_id + '</td>';
                    h[++i] = '<td>' + localTime(features[j].properties.upload_time) + '</td>';
                    h[++i] = '<td>' + htmlEncode(features[j].properties.user_name) + '</td>';
                    h[++i] = '<td style="word-wrap: break-word;">' + features[j].properties.imei + '</td>';
                    h[++i] = '<td>' + htmlEncode(features[j].properties.file_name) + '</td>';
                    h[++i] = '<td>' + htmlEncode(features[j].properties.survey_name) + '</td>';
                    h[++i] = '<td>' + htmlEncode(features[j].properties.ident) + '</td>'

                    if(features[j].geometry) {
                        locn = 'lon:' + features[j].geometry.coordinates[0] + ' lat:' + features[j].geometry.coordinates[1];
                    } else {
                        locn = "none";
                    }
                    h[++i] = '<td>' + locn + '</td>';
                    h[++i] = '<td>' + localise.set[features[j].properties.complete] + '</td>';
                    status = features[j].properties.status;
                    h[++i] = '<td class="' + status + '">' + status + '</td>';
                    reason = features[j].properties.reason;
                    if(typeof reason === "undefined") {
                        reason = "";
                    }
                    h[++i] = '<td style="word-break: break-all;">' + htmlEncode(reason) + '</td>';
                }
                h[++i] = '</tr>';

            }
            h[++i] = '</tbody>';

            $elem.html(h.join(''));


        }

        function refreshNotificationsTable(data, showType, source) {

            var features = data.features,
                $elem,
                $msg,
                h = [],
                i = -1,
                j,
                locn,
                status,
                reason,
                showType = $("#showType").val();

            $elem = gPanel === NOTIFICATIONS_PANEL ? $("#notify_events") : $("#optin_events");
            $msg = gPanel === OPTIN_MSG_PANEL ? $("#notify_msg") : $("#optin_msg");

            $elem.empty();
            $msg.empty();

            if(typeof features === "undefined" || features.length === 0) {
                var msg = "<h5>" + (gPanel === NOTIFICATIONS_PANEL ? localise.set["msg_nn"] : localise.set["msg_noi"]) + "</h5>";
                $msg.html(msg);
                return;
            }

            // Add the head
            h[++i] = '<thead class="thead-dark">';
            h[++i] = '<tr>';
            if(showType === "totals") {
                h[++i] = '<th>' + localise.set["c_success"] + '</th>';
                h[++i] = '<th>' + localise.set["c_errors"] + '</th>';

            } else {
                h[++i] = '<th>' + localise.set["c_id"] + '</th>';
                if(source === "optin_msg") {
                    h[++i] = '<th>' + localise.set["mon_send_count"] + '</th>';
                    h[++i] = '<th>' + localise.set["mon_pending_count"] + '</th>';
                } else {
                    h[++i] = '<th>' + localise.set["c_type"] + '</th>';
                }
                if(source === "optin_msg") {
                    h[++i] = '<th>' + localise.set["c_email"] + '</th>';
                } else {
                    h[++i] = '<th>' + localise.set["c_details"] + '</th>';
                }
                h[++i] = '<th>' + localise.set["c_status"] + '</th>';
                h[++i] = '<th>' + localise.set["mon_fr"] + '</th>';
                h[++i] = '<th>' + localise.set["c_lt"] + '</th>';
                h[++i] = '<th>' + localise.set["c_retry"] + '</th>';
            }
            h[++i] = '</tr>';
            h[++i] = '</thead>';

            // Add the body
            h[++i] = '<tbody>';
            for(j = 0; j < features.length; j++) {
                h[++i] = '<tr>';
                if(showType === "totals") {
                    h[++i] = '<td>' + (features[j].properties.success ? features[j].properties.success : 0) + '</td>';
                    h[++i] = '<td>' + (features[j].properties.errors ? features[j].properties.errors : 0) + '</td>';
                } else {

                    h[++i] = '<td>' + features[j].properties.id + '</td>';
                    if(source === "optin_msg") {
                        h[++i] = '<td>' + features[j].properties.opted_in_count + '</td>';
                        h[++i] = '<td>' + features[j].properties.pending_count + '</td>';
                    } else {
                        h[++i] = '<td>' + (features[j].properties.type ? features[j].properties.type : '') + '</td>';
                    }
                    if(source === "optin_msg") {
                        h[++i] = '<td>' + htmlEncode(features[j].properties.email) + '</td>';
                    } else {
                        h[++i] = '<td style="word-break: break-all;">' + htmlEncode(features[j].properties.notify_details) + '</td>';
                    }
                    status = features[j].properties.status;
                    h[++i] = '<td class="' + status + '">' + localise.set[features[j].properties.status] + '</td>';
                    if(features[j].properties.status_details) {
                        h[++i] = '<td>' + htmlEncode(features[j].properties.status_details) + '</td>';
                    } else {
                        h[++i] = '<td></td>';
                    }
                    h[++i] = '<td>' + localTime(features[j].properties.event_time) + '</td>';
                    if(source === "optin_msg") {
                        h[++i] = '<td><button type="button" class="btn btn-info optin_retry_button" value="';
                        h[++i] = features[j].properties.id;
                        h[++i] = '">';
                        h[++i] = localise.set["c_retry"];
                        h[++i] = '</button></td>';
                    } else {
                        if (status === "error" && features[j].properties.message_id) {
                            h[++i] = '<td><button type="button" class="btn btn-info retry_button" value="';
                            h[++i] = features[j].properties.message_id;
                            h[++i] = '">';
                            h[++i] = localise.set["c_retry"];
                            h[++i] = '</button></td>';
                        } else {
                            h[++i] = '<td></td>';
                        }
                    }

                }
                h[++i] = '</tr>';
                h[++i] = '</tbody>';

            }

            $elem.html(h.join(''));
            $('.retry_button', $elem).click(function() {
                var $this = $(this);
                var messageId = $this.val();
                $this.closest('tr').remove();

                addHourglass();
                $.ajax({
                    url: "/surveyKPI/eventList/retry/" + messageId,
                    dataType: 'json',
                    cache: false,
                    success: function() {
                        removeHourglass();
                    },
                    error: function(xhr, textStatus, err) {
                        removeHourglass();
                        if(xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert("Failed reset message notification");
                        }
                    }
                });
            });

            $('.optin_retry_button', $elem).button().click(function() {
                var $this = $(this);
                var id = $this.val();

                addHourglass();
                $.ajax({
                    url: "/surveyKPI/eventList/optin_retry/" + id,
                    dataType: 'json',
                    cache: false,
                    success: function() {
                        removeHourglass();
                        refreshData(globals.gCurrentProject, $('#survey option:selected').val());
                    },
                    error: function(xhr, textStatus, err) {
                        removeHourglass();
                        if(xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert("Failed reset message notification");
                        }
                    }
                });
            });


        }

        /*
        function refreshFormsTable(forms) {

            var $elem = $("#events"),
                $msg = $('#events_table_msg'),
                h = [],
                i = -1;

            $elem.empty();
            $msg.empty();

            if($('#project_name').val() == 0) {
                var msg = "<h5>" + localise.set["msg_sp"] + "</h5>";
                $msg.html(msg);
                return;
            }

            if(typeof forms === "undefined" || forms.length === 0) {
                var msg = "<h5>" + localise.set["msg_nf"] + "</h5>";
                $msg.html(msg);
                return;
            }

            // Add the head
            h[++i] = '<thead class="thead-dark">';
            h[++i] = '<tr>';
            h[++i] = '<th>' + localise.set["c_user"] + ' ' + localise.set["c_name"] + '</th>';
            h[++i] = '<th>' + localise.set["c_user"] + ' ' + localise.set["c_ident"] + '</th>';
            h[++i] = '<th>' + localise.set["c_device"] + ' ' + localise.set["c_ident"] + '</th>';
            h[++i] = '<th>' + localise.set["c_survey"] + ' ' + localise.set["c_name"] + '</th>';
            h[++i] = '<th>' + localise.set["c_survey"] + ' ' + localise.set["c_version"] + '</th>';
            h[++i] = '</tr>';
            h[++i] = '</thead>';


            // Add the body
            h[++i] = '<tbody>';
            for(j = 0; j < forms.length; j++) {
                h[++i] = '<tr>';
                h[++i] = '<td>' + htmlEncode(forms[j].u_name) + '</td>';
                h[++i] = '<td>' + htmlEncode(forms[j].u_ident) + '</td>';
                h[++i] = '<td>' + htmlEncode(forms[j].device_id) + '</td>';

                if(forms[j].no_download) {
                    h[++i] = '<td class="error">' + htmlEncode(forms[j].survey_name) + '</td>';
                } else {
                    h[++i] = '<td class="success">' + htmlEncode(forms[j].survey_name) + '</td>';
                }

                if(forms[j].survey_version === forms[j].download_version || forms[j].download_version === '') {
                    h[++i] = '<td class="success">' + forms[j].download_version + '</td>';
                } else {
                    h[++i] = '<td class="error">' + forms[j].download_version + ' (' +
                        forms[j].survey_version + ')'+ '</td>';
                }

                h[++i] = '</tr>';

            }
            h[++i] = '</tbody>';
            $elem.html(h.join(''));

        }

         */

        function refreshCases() {
            var sId = $('#survey').val();
            if(sId && sId != "_all") {

                var url = "/api/v1/cases/progress/" + $('#survey').val() + "?intervalCount=" + $('#showInterval').val();
                var savedData = gMonitor.cache[url];
                if(savedData) {
                    gMonitor.caseProgress = savedData;
                    $('#case_msg').hide();
                    $('#case_data').removeClass("d-none").show();
                    chart.refresh();
                } else {
                    var cbUrl = url + addCacheBuster(url);
                    addHourglass();
                    $.ajax({
                        url: cbUrl,
                        dataType: 'json',
                        cache: false,
                        success: function (data) {
                            removeHourglass();
                            gMonitor.cache[url] = data;
                            gMonitor.caseProgress = data;
                            $('#case_msg').hide();
                            $('#case_data').removeClass("d-none").show();
                            chart.refresh();

                        },
                        error: function (xhr, textStatus, err) {
                            removeHourglass();
                            if (xhr.readyState == 0 || xhr.status == 0) {
                                return;  // Not an error
                            } else {
                                $('#case_data').hide();
                                $('#case_msg').removeClass("d-none").text(localise.set["c_error"] + ": " + xhr.responseText).show();
                            }
                        }
                    });
                }
            } else {
                $('#case_data').hide();
                $('#case_msg').removeClass("d-none").text(localise.set["cm_ns"]).show();
            }
        }

        /*
	     * Respond to a panel being changed
	     * panelChange($(this), 'userPanel', 'usersTab');
	     */
        function panelChange($this, name) {
            gPanel = name;

            setcontrols();

            $(".monpanel").hide();
            $this.tab('show');
            $('#' + name + 'Panel').removeClass('d-none').show();
            setInLocalStorage("currentTab" + $('body').data('page'), '#' + name + 'Tab a');

        }
    });