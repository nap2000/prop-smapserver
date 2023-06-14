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

$(document).ready(function() {

	setTheme();
	setupUserProfile(true);
	localise.setlang();		// Localise HTML

	// Get the user details
	globals.gIsAdministrator = false;
	getLoggedInUser(surveyListDone, false, true, undefined, false, false);

});

function surveyListDone() {
	getResourceHistory(refreshView, true);
}

function refreshView() {
	setChangesHtml($('#changes'), globals.model.survey);
}


function getResourceHistory() {

	var url="/surveyKPI/shared/maps/";

				addHourglass();
				$.ajax({
					url: url,
					dataType: 'json',
					cache: false,
					success: function(data) {
						removeHourglass();
						gMaps = data;
						updateMapList(data);
					},
					error: function(xhr, textStatus, err) {
						removeHourglass();
						if(xhr.readyState == 0 || xhr.status == 0) {
							return;  // Not an error
						} else {
							console.log("Error: Failed to get list of maps: " + err);
						}
					}
				});

			}

/*
 * Convert change log JSON to html
 */
function setChangesHtml($element, survey) {
	var h =[],
		idx = -1,
		i,
		changes;
	
	if(!survey) {
		$('#errormesg').html("<strong>No Changes</strong> Create or select a survey to see changes");
		$('#infobox').show();
	} else {

		changes = survey.changes;
		
		h[++idx] = '<table class="table table-responsive-sm table-striped">';
		
		// write the table headings
		h[++idx] = '<thead>';
			h[++idx] = '<tr>';
        		h[++idx] = '<th>';
        			h[++idx] = localise.set["c_version"];
        		h[++idx] = '</th>';

        		h[++idx] = '<th>';
        			h[++idx] = localise.set["c_changes"];
        		h[++idx] = '</th>';

        		h[++idx] = '<th>';
					h[++idx] = localise.set["rev_cb"];
        		h[++idx] = '</th>';

				h[++idx] = '<th>';
					h[++idx] = localise.set["ed_dt"];
					h[++idx] = ' (';
					h[++idx] = globals.gTimezone;
					h[++idx] = ')';
				h[++idx] = '</th>';

				h[++idx] = '<th>' + localise.set["c_file"] + '</th>';
				h[++idx] = '<th>' + localise.set["c_msg"] + '</th>';
			h[++idx] = '</tr>';
		h[++idx] = '</thead>';
		
		// Write the table body
		h[++idx] = '<body>';
		for(i = 0; i < changes.length; i++) {
			
			var status = "pending";
			if(!changes[i].apply_results) {		// Change has been applied to the results tables
				status = changes[i].success ? "success" : "failed";
			}
			var filehtml = "";
			if(changes[i].change.fileName && changes[i].change.fileName.trim().length > 0) {
				var filename = changes[i].change.fileName;
				var fnIndex = changes[i].change.fileName.lastIndexOf('/');
				if(fnIndex >= 0) {
					filename = filename.substr(fnIndex + 1);
				}
				var url = null;
				if(filename.indexOf(".pdf") === filename.length - 4) {
					if(!changes[i].msg) {
						// deprecated old style
						url = '/surveyKPI/file/' + filename + '/surveyPdfTemplate/' + changes[i].change.origSId + '?archive=true';
					} else {
						url = '/surveyKPI/file/' + filename + '/pdfTemplate/' + changes[i].change.origSId;
						filename = changes[i].msg;
					}
				} else {
					url = '/surveyKPI/survey/' + changes[i].change.origSId + '/download?type=xlsx';
				}
                filehtml = '<a href="' + url + '">' + filename + '</a>';
			}
			h[++idx] = '<tr class="change_';
					h[++idx] = status;
					h[++idx] = '">';
				h[++idx] = '<td>';
				h[++idx] = changes[i].version;
				h[++idx] = '</td>';	
				h[++idx] = '<td>';
				h[++idx] = getChangeDescription(changes[i].change, changes[i].version);
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = htmlEncode(changes[i].userName);
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = changes[i].updatedTime;
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = filehtml;
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = changes[i].msg;
				h[++idx] = '</td>';
			h[++idx] = '</tr>';
		}
		h[++idx] = '</body>';
		
		h[++idx] = '</table>';
	} 
	
	$element.html(h.join(''));
	
	
}

});