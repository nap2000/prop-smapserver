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

"use strict";
requirejs.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 60,
    paths: {
        app: '../app',
        i18n: '../../../../js/libs/i18n',
        async: '../../../../js/libs/async',
        localise: '../../../../js/app/localise',
        modernizr: '../../../../js/libs/modernizr',
        common: '../../../../js/app/common',
        globals: '../../../../js/app/globals',
        toggle: 'bootstrap-toggle.min',
        lang_location: '../../../../js',
        file_input: '../../../../js/libs/bootstrap.file-input',
        datetimepicker: '../../../../js/libs/bootstrap-datetimepicker.min',
        pace: '../../../../js/libs/wb/plugins/pace/pace.min',
        knockout: '../../../../js/libs/knockout',
	    slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll.min',
        bootbox: 'bootbox.min',

    },
    shim: {

        'common': ['jquery'],
        'datetimepicker': ['moment'],
        'app/plugins': ['jquery'],
        'file_input': ['jquery'],
        'app/summary_report': ['jquery'],
	    'slimscroll': ['jquery'],
        'toggle': ['bootstrap.min']
    }
});

require([
    'jquery',
    'common',
    'localise',
    'globals',
    'moment',
    'bootbox',
    'datetimepicker',
	'slimscroll'

], function ($,
             common,
             localise,
             globals,
             moment,
             bootbox) {

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

        $('#m_search').click(function(e) {
            e.preventDefault();
            getMatchesAllItems();
        });
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
                                            <i class="fa fa-cog" data-idx="${index}"></i>
                                        </div>
                                        <div class="card-body">
                                            <div class="row" id="matches${index}">
                                                
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
    function getMatches(index, link) {
        var threshold = $('#threshold').val();
        var link = gLinkageItems[index];

        if(link.fp_image) {

            if(!threshold) {
                threshold = 40.0;
            }

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

        $('#matches' + idx).empty();
        if(matches) {
            for (var i = 0; i < matches.length; i++) {

                var match = matches[i];
                var image = (' ' + match.linkageItem.fp_image).slice(1);    // Force copy
                if (location.hostname === 'localhost') {
                    image = image.replace("https", "http");
                }
                var matchHtml = `<div class="col-sm">
                                    <img src="${image}" alt="${fpAlt}">
                                    <p>${match.score}</p>
                                    </div>`;
                $('#matches' + idx).append(matchHtml);
            }
        }
    }
});


