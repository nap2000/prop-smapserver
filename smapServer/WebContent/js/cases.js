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

"use strict";
require.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
        app: '/js/app',
        bootbox: 'bootbox.min',
        lang_location: '/js'
    },
    shim: {
        'app/common': ['jquery'],
        'jquery.autosize.min': ['jquery']
    }
});

require([
        'jquery',
        'app/common',
        'app/localise',
        'bootbox',
        'app/globals'],
    function($, common, lang, bootbox, globals) {

        var gCurrentCmsIndex;

        $(document).ready(function() {

            setupUserProfile(true);
            localise.setlang();		// Localise HTML

            // Get the user details
            globals.gIsAdministrator = false;
            getLoggedInUser(currentSurveyDone, false, true, undefined, false, false);

            $('#create_cm_alert').click(function () {
                openCmsDialog(false, -1);
            });

            /*
              * Save a case management setting details
              */
            $('#alertSave').click(function(){
                saveCaseManagementAlert();
            });

            $('#saveSettings').click(function(){
                saveSettings();
            });

            $('#cms_fs').keydown(function(){
                $('.save_alert').hide();
            })
            $('#cms_sq').change(function(){
                $('.save_alert').hide();
            })
        });

        function currentSurveyDone() {
            getGroupStatusQuestions($('#cms_sq'), globals.gCurrentSurvey, true);
            getGroupSurveys(groupSurveysDone);
        }

        function groupSurveysDone() {
            getCms(updateCmsData);
        }

        /*
          * Update the case management settings table and other case management data
          */
        function updateCmsData() {

            var $tab = $('#cms_table'),
                i, cmAlert,
                alertList = globals.gCmSettings.alerts,
                settings = globals.gCmSettings.settings,
                h = [],
                idx = -1;

            /*
             * Update settings
             */
            $('#cms_fs').val(settings.finalStatus);
            $('#cms_sq').val(settings.statusQuestion);      // The list of questions should have been set by now but it is not guaranteed

            /*
             * Update alerts table
             */
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
            h[++idx] = localise.set["cm_p"];	// Period
            h[++idx] = '</th>';
            h[++idx] = '<th scope="col">';
            h[++idx] = localise.set["c_action"];
            h[++idx] = '</th>';
            h[++idx] = '</tr>';
            h[++idx] = '</thead>';
            h[++idx] = '<tbody>';


            for (i = 0; i < alertList.length; i++) {
                cmAlert = alertList[i];

                h[++idx] = '<tr>';
                h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
                h[++idx] = i;
                h[++idx] = '"></td>';
                h[++idx] = '<td>';
                h[++idx] = cmAlert.id;
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cmAlert.name);
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cmAlert.period);
                h[++idx] = '</td>';

                h[++idx] = '<td>';
                h[++idx] = '<div class="d-flex">';
                h[++idx] = '<button type="button" data-idx="';
                h[++idx] = i;
                h[++idx] = '" class="btn btn-sm rm_cms btn-danger mr-2">';
                h[++idx] = '<i class="fas fa-trash-alt"></i></button>';

                h[++idx] = '<button type="button" data-idx="';
                h[++idx] = i;
                h[++idx] = '" class="btn-sm cms_edit btn-info" value="';
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

            $('.cms_edit', $tab).click(function () {
                openCmsDialog(true, $(this).val());
            });

            $(".rm_cms", $tab).click(function(){
                var idx = $(this).data("idx");
                deleteCms(idx);
            });


        }

        /*
         * Save a new or updated case managment setting
         */
        function saveSettings() {
            var settings = {};

            settings.statusQuestion = $('#cms_sq').val();
            settings.finalStatus = $('#cms_fs').val();

            $('.org_alert').hide();
            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/json",
                cache: false,
                url: "/surveyKPI/cases/settings/" + globals.gCmSettings.group_survey_ident,
                data: { settings: JSON.stringify(settings) },
                success: function(data, status) {
                    removeHourglass();

                    $('.save_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
                    getCms(updateCmsData);
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();

                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        var msg = xhr.responseText;
                        if (!msg) {
                            msg = localise.set["c_error"];
                        }
                        $('.save_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);
                    }
                }
            });
        }

        /*
  * Save a new or updated case managment setting
  */
        function saveCaseManagementAlert() {
            var cmsAlert = {};

            if(gCurrentCmsIndex === -1) {
                cmsAlert.id = -1;
            } else {
                cmsAlert.id = globals.gCmSettings.alerts[gCurrentCmsIndex].id;
            }

            cmsAlert.name = $('#cms_name').val();
            cmsAlert.period = $('#cms_period').val() + ' ' + $('#period_list_sel').val();
            cmsAlert.group_survey_ident = globals.gGroupSurveys[0].groupSurveyIdent;

            if(!cmsAlert.name || cmsAlert.name.trim().length === 0) {
                alert(localise.set["msg_val_nm"]);
                $('#cms_name').focus();
                return;
            }

            var alertString = JSON.stringify(cmsAlert);

            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/json",
                cache: false,
                url: "/surveyKPI/cases/settings/alert",
                data: { alert: alertString },
                success: function(data, status) {
                    removeHourglass();
                    getCms(updateCmsData);
                    $('#create_cms_popup').modal("hide");
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();

                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        var msg = xhr.responseText;
                        if (msg) {
                            if (msg.indexOf("cms_unique_name") > 0) {
                                msg = localise.set["cm_dcms"];
                            }
                        } else {
                            msg = localise.set["c_error"];
                        }
                        alert(msg);
                    }
                }
            });
        }

        /*
          * Delete the case management alert
          */
        function deleteCms (cmsIdx) {

            var cmAlert = {id: globals.gCmSettings.alerts[cmsIdx].id};

            bootbox.confirm(localise.set["msg_del_cms"] +  ' ' + globals.gCmSettings.alerts[cmsIdx].name, function(decision) {
                if (decision === true) {
                    addHourglass();
                    $.ajax({
                        type: "DELETE",
                        contentType: "application/json",
                        url: "/surveyKPI/cases/settings/alert",
                        data: { alert: JSON.stringify(cmAlert) },
                        success: function(data, status) {
                            removeHourglass();
                            getCms(updateCmsData);
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
          * Show the case management dialog
          */
        function openCmsDialog(existing, cmsIndex) {
            gCurrentCmsIndex = cmsIndex;
            if(cmsIndex >= 0) {
                var cmAlert = globals.gCmSettings.alerts[gCurrentCmsIndex];
                $('#cms_name').val(cmAlert.name)
                if ((cmAlert.period)) {
                    var periodArray = cmAlert.period.split(" ");
                    if (periodArray.length > 1) {
                        $('#cms_period').val(periodArray[0]);
                        $('#period_list_sel').val(periodArray[1]);
                    }
                }
            }
            $('#create_cms_popup').modal("show");
        }




    });