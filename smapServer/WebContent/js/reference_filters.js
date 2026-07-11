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

"use strict";

import localise from "./app/localise.js";
import globals from "./app/globals.js";
import {
	addHourglass,
	getLoggedInUser,
	handleLogout,
	htmlEncode,
	loadSurveys,
	removeHourglass,
	saveCurrentProject,
	setupUserProfile
} from "./app/common";

const $ = window.$;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

var	gData,				// { filters: [], sources: [] }
	gCurrentLinked;		// The source (linked) survey ident currently being edited

localise.initLocale(gUserLocale).then(function () {

	setCustomEdit();
	setTheme();
	setupUserProfile();
	localise.setlang();		// Localise HTML

	// Get the user details
	getLoggedInUser(projectChanged, false, true, undefined, false, false);

	// Save the filter being edited
	$('#saveFilter').off().click(function() {
		saveFilter(gCurrentLinked, $('#filter_content').val());
	});

	$('#project_name').change(function() {
        globals.gCurrentProject = $(this).val();
        globals.gCurrentSurvey = 0;
		projectChanged();
	});

	// Set change function on survey
	$('#survey_name').change(function() {
		globals.gCurrentSurvey = $('#survey_name option:selected').val();
		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);	// Save the current survey id
		surveyChanged();
	});

function projectChanged() {
	loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged, false, undefined, undefined, true);			// Get surveys
}

function surveyChanged() {
	gData = undefined;
    globals.gCurrentSurvey = $('#survey_name option:selected').val();
	$('#survey_name_disp').text($('#survey_name option:selected').text());
	getFilters();
}

/*
 * Get the configured filters and the linkable source surveys for the current survey
 */
function getFilters() {

	if(globals.gCurrentSurvey) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/referencefilter/survey/" + globals.gCurrentSurvey,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				if(handleLogout(data)) {
					gData = data || {filters: [], sources: []};
					refreshView();
				}
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
		              return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_q"] + ": " + err);
				}
			}
		});
	}
}

/*
 * Return the configured filter for a source survey ident, or undefined
 */
function getFilterFor(linkedIdent) {
	var i;
	if(gData && gData.filters) {
		for(i = 0; i < gData.filters.length; i++) {
			if(gData.filters[i].linkedSIdent === linkedIdent) {
				return gData.filters[i];
			}
		}
	}
	return undefined;
}

/*
 * Convert the linkable sources and their filters to html
 */
function refreshView() {

	var h = [],
		idx = -1,
		i,
		filter,
		sources = (gData && gData.sources) ? gData.sources : [],
		hasFilter = false,
		$element = $('#rf_table');

	if(sources.length === 0) {
		$element.html('');
		$('#rf_alert').html(localise.set["rf_none"]);
		return;
	}

	// Write the table headings
	h[++idx] = '<table class="table">';
	h[++idx] = '<thead>';
	h[++idx] = '<tr>';
	h[++idx] = '<th>' + localise.set["rf_source"] + '</th>';
	h[++idx] = '<th>' + localise.set["rf_filter"] + '</th>';
	h[++idx] = '<th></th>';
	h[++idx] = '</tr>';
	h[++idx] = '</thead>';

	// Write the table body
	h[++idx] = '<tbody>';
	for (i = 0; i < sources.length; i++) {

		filter = getFilterFor(sources[i].linkedSIdent);

		h[++idx] = '<tr>';
		h[++idx] = '<td>';
		h[++idx] = htmlEncode(sources[i].linkedSName || sources[i].linkedSIdent);
		h[++idx] = '</td>';
		h[++idx] = '<td><code>';
		h[++idx] = (filter && filter.filter) ? htmlEncode(filter.filter) : '';
		h[++idx] = '</code></td>';
		h[++idx] = '<td>';
		h[++idx] = '<button class="btn btn-xs edit_filter" data-ident="' + htmlEncode(sources[i].linkedSIdent) + '">';
		h[++idx] = '<i class="fa fa-filter" aria-hidden="true"></i>';
		h[++idx] = '</button> ';
		h[++idx] = '<button class="btn btn-xs clear_filter" data-ident="' + htmlEncode(sources[i].linkedSIdent) + '"';
		if (!(filter && filter.filter)) {
			h[++idx] = ' disabled';
		}
		h[++idx] = '>';
		h[++idx] = '<i class="fa fa-trash" aria-hidden="true"></i>';
		h[++idx] = '</button>';
		h[++idx] = '</td>';
		h[++idx] = '</tr>';

		if(filter && filter.filter) {
			hasFilter = true;
		}
	}
	h[++idx] = '</tbody>';
	h[++idx] = '</table>';

	$element.html(h.join(''));

	// Edit a filter
	$('.edit_filter', $element).off().click(function () {
		var $this = $(this),
			ident = $this.data("ident"),
			filter = getFilterFor(ident),
			source = getSource(ident);

		gCurrentLinked = ident;
		$('#filter_source_disp').text(source ? (source.linkedSName || source.linkedSIdent) : ident);
		$('#filter_content').val(filter ? filter.filter : '');
		window.bsModalShow('#filter_popup');
	});

	// Clear a filter
	$('.clear_filter', $element).off().click(function () {
		var $this = $(this),
			ident = $this.data("ident");

		if (!$this.hasClass("disabled") && confirm(localise.set["msg_confirm"] || "Delete this filter?")) {
			deleteFilter(ident);
		}
	});

	if (hasFilter) {
		$('#rf_alert').html(localise.set["rf_has"]);
	} else {
		$('#rf_alert').html(localise.set["rf_no"]);
	}
}

function getSource(linkedIdent) {
	var i;
	if(gData && gData.sources) {
		for(i = 0; i < gData.sources.length; i++) {
			if(gData.sources[i].linkedSIdent === linkedIdent) {
				return gData.sources[i];
			}
		}
	}
	return undefined;
}

/*
 * Save (create or update) a filter for a source survey
 */
function saveFilter(linkedIdent, filterText) {

	var rf = {
		linkedSIdent: linkedIdent,
		filter: filterText,
		enabled: true
	};

	addHourglass();
	$.ajax({
		  type: "POST",
		  contentType: "application/x-www-form-urlencoded",
		  cache: false,
		  url: "/surveyKPI/referencefilter/survey/" + globals.gCurrentSurvey,
		  data: {
			  filter: JSON.stringify(rf)
			  },
		  success: function(data, status) {
			  removeHourglass();
			  if(handleLogout(data)) {
				  window.bsModalHide('#filter_popup');
				  getFilters();		// Reload
			  }
		  }, error: function(data, status) {
			  removeHourglass();
			  if(data && data.responseText) {
				  alert(data.responseText);
			  } else {
				  alert(localise.set["msg_u_f"]);
			  }
		  }
	});
}

/*
 * Delete a filter for a source survey
 */
function deleteFilter(linkedIdent) {

	addHourglass();
	$.ajax({
		  type: "DELETE",
		  cache: false,
		  url: "/surveyKPI/referencefilter/survey/" + globals.gCurrentSurvey + "/" + encodeURIComponent(linkedIdent),
		  success: function(data, status) {
			  removeHourglass();
			  if(handleLogout(data)) {
				  getFilters();		// Reload
			  }
		  }, error: function(data, status) {
			  removeHourglass();
			  if(data && data.responseText) {
				  alert(data.responseText);
			  } else {
				  alert(localise.set["msg_u_f"]);
			  }
		  }
	});
}

});
