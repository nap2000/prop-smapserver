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
 * Purpose: Allow the user to select a web form in order to complete a survey
 */
var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 

var gReportList = [];
var gConfig;
var gReportIdx;
var gForm = 0;

window.gTasks = {
    cache: {
        surveyRoles: {}
    }
};

requirejs.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '/js/app',
       	lang_location: '/js'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery']
    }
});

require([
         'jquery',
         'app/common',
         'app/globals',
         'app/localise',
         'app/data'
         ], function($, common, globals, localise, datafns) {

	$(document).ready(function() {

		setupUserProfile(true);
		setTheme();
		localise.setlang();		// Localise HTML

		// Get the user details
		globals.gIsAdministrator = false;
        getLoggedInUser(projectChanged, true, true, undefined);

        $('#generateUrl').click(function() {
        	var i;
        	var filename;
        	var val;
        	var params = [];
        	var url;
        	var action = gReportList[gReportIdx].action_details;

            $('#url').html('https://sg.smap.com.au');


		});

		$('#api').change(function () {
			var api = $('$api').val(),
				h = [],
				idx = -1;

			if(api === "data") {
				h[++idx] = '<option value="json">';
				h[++idx] = localise.set["c_json"];
				h[++idx] = '</option>';

				h[++idx] = '<option value="csv">';
				h[++idx] = localise.set["c_csv"];
				h[++idx] = '</option>';

			} else {
				h[++idx] = '<option value="geojson">';
				h[++idx] = localise.set["c_geojson"];
				h[++idx] = '</option>';
			}
			setUrl();
		});

		$('#format').change(function () {
			setUrl();
		});

        // Set change function on projects
        $('#project_name').change(function () {
            projectChanged();
        });

        // Set change function on surveys
        $('#survey').change(function() {
            surveyChangedApi();
        });

        $('.options').change(function() {
        	setUrl();
        });

	});

    function surveyChangedApi(callback) {
	    // Set the survey meta data
	    var sId = $('#survey').val();
	    var sMeta = globals.gSelector.getSurvey(sId);
	    if(!sMeta) {
		    getSurveyMetaSE(sId, undefined, false, true, true, undefined, setUrl);
	    } else {
		    setUrl();
	    }

    }

    /*
     * Function called when the current project is changed
     */
    function projectChanged() {

        globals.gCurrentProject = $('#project_name option:selected').val();
        globals.gCurrentSurvey = -1;
        globals.gCurrentTaskGroup = undefined;

        if(globals.gCurrentProject !== "0") {

	        loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChangedApi, false);
	        saveCurrentProject(globals.gCurrentProject, globals.gCurrentSurvey, globals.gCurrentTaskGroup);
	        $('.project_selected').show();
        } else {
        	$('.project_selected').hide();
        }

        setUrl();
    }

    /*
     * Set the URL
     */
    function setUrl() {
    	var project = $('#project_name').val(),
		    sId = $('#survey').val(),
		    audit = $('#option_audit').prop("checked"),
		    links = $('#option_links').prop("checked"),
		    format = $('#format').val(),
		    url,
		    hasParam = false;

	    var sMeta = globals.gSelector.getSurvey(sId);

    	url = window.location.protocol;
    	url += '//';
    	url += window.location.hostname;
    	url += '/api/v1/data'

	    if(format === "csv") {
	    	url += ".csv";
	    }
	    if(project !== "0" && sMeta) {
	    	url += '/' + sMeta.survey_ident;

	    	if(audit) {
	    		url += (hasParam ? '&' : '?') + 'audit=yes';
	    		hasParam = true;
		    }
		    if(links) {
			    url += (hasParam ? '&' : '?') + 'links=yes';
			    hasParam = true;
		    }
	    }
    	$('#url').html(url).prop("href", url);
    }

});

