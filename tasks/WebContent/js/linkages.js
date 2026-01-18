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

"use strict";

import localise from "../../../smapServer/WebContent/js/app/localise";
import globals from "../../../smapServer/WebContent/js/app/globals";
import "../../../smapServer/WebContent/js/app/common";
import "../../../smapServer/WebContent/js/libs/bootstrap-toggle.min";
import "../../../smapServer/WebContent/js/libs/bootstrap.file-input";
import "../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker.min";
import "../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min";
import "../../../smapServer/WebContent/js/libs/bootbox.min";

const $ = window.$;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
    try {
        gUserLocale = localStorage.getItem("user_locale") || navigator.language;
    } catch (error) {
        gUserLocale = navigator.language;
    }
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function () {

    var gSurveyIdent;
    var gRecord;
    var gLinkageItems;

    $(document).ready(function () {

        setCustomLinkages();
        setTheme();
        setupUserProfile(true);
        localise.setlang();		// Localise HTML

        // Get the parameters and start editing a survey if one was passed as a parameter
        var params = location.search.substr(location.search.indexOf("?") + 1);
        var pArray = params.split("&");

        for (var i = 0; i < pArray.length; i++) {
            var param = pArray[i].split("=");
            if ( param[0] === "survey" ) {
                gSurveyIdent = param[1];
                saveCurrentProject(-1, globals.gCurrentSurvey, undefined);	// Save the current survey id
            } else if ( param[0] === "record" ) {
                gRecord = param[1];
            }
        }

        getLinkageItems();

        /*
         * Set initial threshold and respond to updates
         */
        var threshold = localStorage.getItem('fp_threshold');
        if(!threshold) {
            threshold = 40.0;
            $('#m_search').prop('disabled', false);
        }
        $('#threshold').val(threshold);
        $('#threshold').change(function() {
                $('#m_search').prop('disabled', false);
                localStorage.setItem('fp_threshold', $('#threshold').val());
            }
        )

        $('#m_search').click(function(e) {
            e.preventDefault();
            $('#m_search').prop('disabled', true);
            getMatchesAllItems();
        });

        $('#m_back').click(function(e){
            e.preventDefault();
            history.back();
        })
    });         // End of document ready

    /*
     * Get items that can link other records to this one
     */
    function getLinkageItems() {
        if(gRecord && gSurveyIdent) {
            addHourglass();
            $.ajax({
                url: "/surveyKPI/match/record/" + gSurveyIdent + "/" + gRecord,
                cache: false,
                dataType: 'json',
                success: function (data) {
                    removeHourglass();
                    gLinkageItems = data;
                    showLinkageItems();
                    getMatchesAllItems();

                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(xhr.responseText + " " + gSurveyIdent + " " + localise.set["msg_not_f"]);
                    }
                }
            });
        }
    }

    function showLinkageItems() {

        var fpAlt = localise.set["c_fingerprint"];

        $('#links').empty();
        for(var index = 0; index < gLinkageItems.length; index++) {

            var link = gLinkageItems[index];
            var image = (' ' + link.fp_image).slice(1);    // Force copy
            if(location.hostname === 'localhost') {
                image = image.replace("https", "http");
            }
            var linkHtml = `<div class="col-sm-12">
                                    <div class="card">
                                        <div class="card-header d-flex chart-header">
                                            <span class="mr-auto">${link.colName}</span>
                                            <img src="${image}" alt="${fpAlt}">
                                        </div>
                                        <div class="card-body">
                                            <div class="row bg-success" id="matches${index}">
                                                
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
            $('#links').append(linkHtml);
        }
    }

    /*
     * Get matches for current items
     */
    function getMatchesAllItems() {

        for(var index = 0; index < gLinkageItems.length; index++) {
            getMatches(index);
        }
    }

    /*
     * Get matches for a singe link item
     */
    function getMatches(index) {
        var threshold = $('#threshold').val();
        var link = gLinkageItems[index];

        if(link.fp_image) {

            if(!threshold) {
                threshold = 40.0;
                $('#threshold').val(threshold);
            }

            var url = "/surveyKPI/match/fingerprint/image?image=" + link.fp_image + "&threshold=" + threshold;
            url += addCacheBuster(url);
            addHourglass();
            $.ajax({
                url: "/surveyKPI/match/fingerprint/image?image=" + link.fp_image + "&threshold=" + threshold,
                cache: false,
                dataType: 'json',
                success: function (data) {
                    removeHourglass();
                    var idx = index;
                    showMatches(idx, data);

                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(xhr.responseText + " " + gSurveyIdent + " " + localise.set["msg_not_f"]);
                    }
                }
            });
        }
    }

    function showMatches(idx, matches) {

        var fpAlt = localise.set["c_fingerprint"];
        var fpView = localise.set["m_view"];

        $('#matches' + idx).empty();
        if(matches && matches.length) {
            for (var i = 0; i < matches.length; i++) {

                var match = matches[i];
                var image = (' ' + match.linkageItem.fp_image).slice(1);    // Force copy
                var url = (' ' + match.url).slice(1);    // Force copy

                if (location.hostname === 'localhost') {
                    image = image.replace("https://", "http://");
                    url = url.replace("https://", "http://");
                }
                var matchHtml = `<div class="col-sm">
                                    <img src="${image}" alt="${fpAlt}">
                                    <p>${match.score}</p>
                                    <p><a href="${url}">${fpView}</a></p>
                                    </div>`;
                $('#matches' + idx).append(matchHtml);
            }
        } else {
            var noMatch = localise.set["fp_nm"]
            var matchHtml = `<div class="col-sm">
                                    <p>${noMatch}</p>
                                    </div>`;
            $('#matches' + idx).append(matchHtml);
        }
    }
});


