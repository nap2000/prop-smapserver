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
        'app/globals'],
    function($, common, lang, globals) {

        var gCurrentCmsIndex;

        $(document).ready(function() {

            setupUserProfile(true);
            localise.setlang();		// Localise HTML

            // Get the user details
            globals.gIsAdministrator = false;
            getLoggedInUser(surveyListDone, false, true, undefined, false, false);

            /*
         * Case Management
         */
            $('#create_cm_setting').click(function () {
                openCmsDialog(false, -1);
            });

            /*
              * Save a case management setting details
              */
            $('#cmsSave').click(function(){
                saveCaseManagementSetting();
            });
        });

        function surveyListDone() {
            getCms(updateCmsTable);
        }

        /*
          * Update the case management settings table
          */
        function updateCmsTable() {


            var $tab = $('#cms_table'),
                i, cms,
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
            h[++idx] = localise.set["c_type"];	// type
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


            for (i = 0; i < globals.gCmsList.length; i++) {
                cms = globals.gCmsList[i];

                h[++idx] = '<tr>';
                h[++idx] = '<td class="control_td"><input type="checkbox" name="controls" value="';
                h[++idx] = i;
                h[++idx] = '"></td>';
                h[++idx] = '<td>';
                h[++idx] = cms.id;
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cms.name);
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cms.type);
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = htmlEncode(cms.changed_by);
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
        function saveCaseManagementSetting() {
            var cms = {};

            if(gCurrentCmsIndex === -1) {
                cms.id = -1;
            } else {
                cms.id = globals.gCmsList[gCurrentCmsIndex].id;
            }

            cms.name = $('#cms_name').val();
            cms.type = $('#cms_type').val();
            cms.pId = $('#cms_project').val();

            if(!cms.name || cms.name.trim().length === 0) {
                alert(localise.set["msg_val_nm"]);
                $('#cms_name').focus();
                return;
            }

            var cmsString = JSON.stringify(cms);

            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/json",
                cache: false,
                url: "/surveyKPI/cases/settings",
                data: { settings: cmsString },
                success: function(data, status) {
                    removeHourglass();
                    getCms(updateCmsTable);
                    $('#create_cms_popup').modal("hide");
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
        }

        /*
          * Delete the case management setting
          */
        function deleteCms (cmsIdx) {

            var cms;

            cms = {id: globals.gCmsList[cmsIdx].id};

            bootbox.confirm(localise.set["msg_del_cms"] +  ' ' + globals.gCmsList[cmsIdx].name, function(decision) {
                if (decision === true) {
                    addHourglass();
                    $.ajax({
                        type: "DELETE",
                        contentType: "application/json",
                        url: "/surveyKPI/cases/settings",
                        data: { cms: JSON.stringify(cms) },
                        success: function(data, status) {
                            removeHourglass();
                            getCms(updateCmsTable);
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
                var cms = globals.gCmsList[gCurrentCmsIndex];
                $('#cms_name').val(cms.name)
                $('#cms_type').val(cms.type)
                $('#cms_project').val(cms.pId)
            }
            $('#create_cms_popup').modal("show");
        }




    });