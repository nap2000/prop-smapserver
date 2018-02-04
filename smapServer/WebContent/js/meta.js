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
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
    	jquery: 'jquery-2.1.1',
    	lang_location: '..'
    },
    shim: {
    	'app/common': ['jquery'],
        'bootstrap.min': ['jquery'],
        'jquery.autosize.min': ['jquery']
    }
});

require([
         'jquery',
         'app/common', 
         'bootstrap.min', 
         'modernizr',
         'app/localise',
         'app/ssc',
         'app/globals',
         'jquery.autosize.min'], 
		function($, common, bootstrap, modernizr, lang, ssc, globals) {


var	gMode = "survey",
	gTempQuestions = [];

$(document).ready(function() {
	
	var i,
		params,
		pArray = [],
		param = [];
	
	localise.setlang();		// Localise HTML

	// Get the user details
	globals.gIsAdministrator = false;
	getLoggedInUser(surveyListDone, false, true, undefined, false, false);

	// Add menu functions
	$('#m_open').off().click(function() {	// Open an existing form
		openForm("existing");
	});

	// Add menu functions
	$('#m_simple_edit').off().click(function() {	// Edit a survey
		gMode = "simple_edit";
		refreshView(gMode);
	});


	
	// Add responses to events
	$('#project_name').change(function() {
		globals.gCurrentProject = $('#project_name option:selected').val();
		globals.gCurrentSurvey = -1;
		globals.gCurrentTaskGroup = undefined;
		
		saveCurrentProject(globals.gCurrentProject, 
				globals.gCurrentSurvey, 
				globals.gCurrentTaskGroup);
		
		getSurveyList();
 	 });
	
	enableUserProfileBS();
});

function getSurveyList() {
	console.log("getSurveyList: " + globals.gCurrentSurvey);
	if(globals.gCurrentSurvey > 0) {
		loadSurveys(globals.gCurrentProject, undefined, false, false, surveyListDone);
	} else {
		loadSurveys(globals.gCurrentProject, undefined, false, false, undefined);
	}
}

function surveyListDone() {
	getSurveyDetails(refreshView, true);
}

function refreshView() {
	
	var i,
		j,
		qList = [],
		index = -1,
		survey = globals.model.survey,
		key,
		options = [];
	
	gTempQuestions = [];

	setChangesHtml($('#meta'), survey, survey);
}


/*
 * Convert change log JSON to html
 */
function setChangesHtml($element, survey) {
	var h =[],
		idx = -1,
		i;
	
	if(!survey) {
		$('#errormesg').html("<strong>No Changes</strong> Create or select a survey to see meta items");
		$('#infobox').show();
	} else {

		h[++idx] = '<table class="table table-striped">';
		
		// write the table headings
		h[++idx] = '<thead>';
			h[++idx] = '<tr>';
				h[++idx] = '<th>';
					h[++idx] = localise.set["c_type"];
				h[++idx] = '</th>';

        		h[++idx] = '<th>';
        			h[++idx] = localise.set["c_name"];
        		h[++idx] = '</th>';
			h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		
		// Write the table body
		h[++idx] = '<body>';
		for(i = 0; i < survey.meta.length; i++) {

			if(survey.meta[i].isPreload) {
                h[++idx] = '<tr>';
                h[++idx] = '<td>';
                h[++idx] = survey.meta[i].sourceParam;
                h[++idx] = '</td>';
                h[++idx] = '<td>';
                h[++idx] = survey.meta[i].name;
                h[++idx] = '</td>';
                h[++idx] = '</tr>';
            }
		}
		h[++idx] = '</body>';
		
		h[++idx] = '</table>';
	} 
	
	$element.html(h.join(''));
	
	
}

});