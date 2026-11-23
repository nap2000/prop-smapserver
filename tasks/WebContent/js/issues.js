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
 * Operational issues: problems in the user's projects that need to be fixed, each with a button
 * that opens the page that can fix it
 */

"use strict";

import localise from "../../../smapServer/WebContent/js/app/localise";
import globals from "../../../smapServer/WebContent/js/app/globals.js";
import {
	addHourglass,
	downloadFile,
	getLoggedInUser,
	handleLogout,
	htmlEncode,
	removeHourglass,
	setupUserProfile
} from "../../../smapServer/WebContent/js/app/common";

const $ = window.$;

var gUserLocale = navigator.language;
try {
	gUserLocale = localStorage.getItem("user_locale") || navigator.language;
} catch (error) {
	gUserLocale = navigator.language;
}
window.gUserLocale = gUserLocale;

var gIssues = [];

localise.initLocale(gUserLocale).then(function () {

	$(document).ready(function() {

		setTheme();
		setupUserProfile();
		localise.setlang();		// Localise HTML

		getLoggedInUser(undefined, false, false, undefined);
		getIssues();

		$('#m_refresh').click(function(e) {
			e.preventDefault();
			getIssues();
		});

		$('#iss_type, #iss_survey').change(showIssues);
		$('#iss_search').on('input', showIssues);

		$('#iss_xlsx').click(function() {
			downloadFile('/surveyKPI/issues/xlsx?tz=' + encodeURIComponent(timezone()));
		});
	});
});

function timezone() {
	return globals.gTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function getIssues() {
	addHourglass();
	$('#iss_error').hide();
	$.ajax({
		url: '/surveyKPI/issues?tz=' + encodeURIComponent(timezone()),
		dataType: 'json',
		cache: false,
		success: function(data) {
			removeHourglass();
			if(handleLogout(data)) {
				gIssues = data || [];
				setFilters();
				showIssues();
			}
		},
		error: function(xhr) {
			removeHourglass();
			if(handleLogout(xhr.responseText)) {
				$('#iss_error').text(localise.set["c_error"] + (xhr.responseText ? ': ' + xhr.responseText : '')).show();
			}
		}
	});
}

/*
 * The type and survey choices, and a count of each type that can be clicked to show only that type
 */
function setFilters() {
	var types = {}, surveys = {}, h = [];
	gIssues.forEach(function(i) {
		types[i.type] = types[i.type] || { label: i.typeLabel, count: 0 };
		types[i.type].count++;
		if(i.survey) {
			surveys[i.survey] = true;
		}
	});

	var $type = $('#iss_type'), type = $type.val();
	$type.empty().append($('<option>').val('').text(localise.set["iss_all_types"]));
	Object.keys(types).forEach(function(t) {
		$type.append($('<option>').val(t).text(types[t].label + ' (' + types[t].count + ')'));
	});
	$type.val(types[type] ? type : '');

	var $survey = $('#iss_survey'), survey = $survey.val();
	$survey.empty().append($('<option>').val('').text(localise.set["iss_all_surveys"]));
	Object.keys(surveys).sort().forEach(function(s) {
		$survey.append($('<option>').val(s).text(s));
	});
	$survey.val(surveys[survey] ? survey : '');

	Object.keys(types).forEach(function(t) {
		h.push('<button type="button" class="btn btn-sm btn-outline-secondary iss_pick" data-type="' + htmlEncode(t) + '">'
			+ htmlEncode(types[t].label) + ' <span class="badge text-bg-secondary">' + types[t].count + '</span></button>');
	});
	$('#iss_summary').html(h.join(''));
	$('.iss_pick').click(function() {
		$('#iss_type').val($(this).data('type'));
		showIssues();
	});
}

function showIssues() {
	var type = $('#iss_type').val(),
		survey = $('#iss_survey').val(),
		search = ($('#iss_search').val() || '').toLowerCase(),
		h = [],
		shown = 0;

	gIssues.forEach(function(i) {
		if(type && i.type !== type) return;
		if(survey && i.survey !== survey) return;
		if(search) {
			var text = [i.typeLabel, i.project, i.survey, i.item, i.detail].join(' ').toLowerCase();
			if(text.indexOf(search) < 0) return;
		}
		shown++;
		h.push('<tr>');
		h.push('<td>' + htmlEncode(i.typeLabel) + '</td>');
		h.push('<td>' + htmlEncode(i.project) + '</td>');
		h.push('<td>' + htmlEncode(i.survey) + '</td>');
		h.push('<td class="text-break">' + htmlEncode(i.item) + '</td>');
		h.push('<td class="text-break small">' + htmlEncode(i.detail) + '</td>');
		h.push('<td class="text-end">' + htmlEncode(i.count) + '</td>');
		h.push('<td class="text-nowrap small">' + htmlEncode(i.first) + '</td>');
		h.push('<td class="text-nowrap small">' + htmlEncode(i.last) + '</td>');
		h.push('<td>');
		// Fix links are paths on this server built from ids, anything else is not shown
		if(i.fixUrl && i.fixUrl.indexOf('/') === 0 && i.fixUrl.indexOf('//') !== 0) {
			h.push('<a class="btn btn-sm btn-primary text-nowrap" href="' + htmlEncode(i.fixUrl) + '">'
				+ '<i class="fas fa-wrench"></i> ' + htmlEncode(localise.set["iss_fix"]) + '</a>');
		}
		h.push('</td>');
		h.push('</tr>');
	});

	$('#iss_table tbody').html(h.join(''));
	$('#iss_none').toggle(shown === 0);
}
