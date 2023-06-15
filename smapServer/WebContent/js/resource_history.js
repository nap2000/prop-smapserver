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

	var gHistory,
		gResource,
		gSurveyId;

$(document).ready(function() {

	setTheme();
	setupUserProfile(true);
	localise.setlang();		// Localise HTML

	/*
	 * Get the parameters
	 */
	var params = location.search.substring(location.search.indexOf("?") + 1);
	var pArray = params.split("&");
	var i;
	for (i = 0; i < pArray.length; i++) {
		var param = pArray[i].split("=");
		if ( param[0] === "resource" ) {
			gResource= param[1];
		} else if ( param[0] === "survey_id" ) {
			gSurveyId= param[1];
		}
	}

	// Get the user details
	globals.gIsAdministrator = false;
	getLoggedInUser(surveyListDone, false, true, undefined, false, false);

});

function surveyListDone() {
	getResourceHistory(gResource, gSurveyId);
}

function refreshView() {
	setChangesHtml($('#history'), gHistory);
}


function getResourceHistory(resource, surveyId) {

	var url="/surveyKPI/shared/media/" + encodeURIComponent(resource) + "/history";
	if(surveyId > 0) {
		url += '?survey_id=' + surveyId;
	}
	url += (surveyId > 0) ? '&' : '?';
	url += "tz=" + encodeURIComponent(globals.gTimezone);   // Also add timezone to URL

	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			gHistory = data;
			refreshView();
		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert("Error: " + err);
			}
		}
	});

}

/*
 * Convert change log JSON to html
 */
function setChangesHtml($element, items) {
	var h =[],
		idx = -1,
		i,
		changes;
		
	h[++idx] = '<table class="table table-responsive-sm table-striped">';
		
	// write the table headings
	h[++idx] = '<thead>';
	h[++idx] = '<tr>';
		h[++idx] = '<th>';
		h[++idx] = localise.set["c_file"];
		h[++idx] = '</th>';

		h[++idx] = '<th>';
		h[++idx] = localise.set["c_user"];
		h[++idx] = '</th>';

		h[++idx] = '<th>';
		h[++idx] = localise.set["ed_dt"];
		h[++idx] = ' (';
		h[++idx] = globals.gTimezone;
		h[++idx] = ')';
		h[++idx] = '</th>';
	h[++idx] = '</tr>';
	h[++idx] = '</thead>';
		
	// Write the table body
	h[++idx] = '<body>';
	for(i = 0; i < items.length; i++) {

		h[++idx] = '<tr>';
		h[++idx] = '<td>';
		h[++idx] = htmlEncode(items[i].file_name);
		h[++idx] = '</td>';

		h[++idx] = '<td>';
		h[++idx] = htmlEncode(items[i].user_ident);
		h[++idx] = '</td>';

		h[++idx] = '<td>';
		h[++idx] = htmlEncode(items[i].uploaded);
		h[++idx] = '</td>';

		h[++idx] = '</tr>';
	}
	h[++idx] = '</body>';
	h[++idx] = '</table>';
	
	$element.html(h.join(''));
}

});