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

import $ from "jquery";
import localise from "localise";
import globals from "globals";
import { getLoggedInUser, setupUserProfile } from "common";

$(document).ready(function() {

	setTheme();
	setupUserProfile(true);
	localise.setlang();

	getLoggedInUser(userKnown, false, false, undefined);

	// DSAR
	$('#dsar_submit').on('click', function() {
		dsarExport();
	});

	// RTBF phase 1 — search
	$('#rtbf_search').on('click', function() {
		rtbfSearch();
	});

	// Select-all checkbox
	$(document).on('change', '#rtbf_select_all', function() {
		$('#rtbf_tbody input[type="checkbox"]').prop('checked', this.checked);
	});

	// RTBF phase 2 — redact selected
	$('#rtbf_redact').on('click', function() {
		rtbfRedactSelected();
	});

});

function userKnown() {
	if (!globals.gIsDpo) {
		$('#dsar_card').addClass('d-none');
		$('#rtbf_card').addClass('d-none');
		$('#dpo_access_denied').removeClass('d-none');
		return;
	}
}

// -------------------------------------------------------------------------
// DSAR
// -------------------------------------------------------------------------

function dsarExport() {
	var ident = $('#dsar_ident').val().trim();
	if (!ident) {
		showResult('#dsar_result', 'danger', localise.set['msg_val_required']);
		return;
	}
	var url = '/surveyKPI/dsar?identifier=' + encodeURIComponent(ident);
	if ($('#dsar_partial').is(':checked')) {
		url += '&partial=true';
	}
	showResult('#dsar_result', 'info', localise.set['msg_loading']);

	fetch(url, { credentials: 'same-origin' })
		.then(function(response) {
			if (!response.ok) {
				return response.text().then(function(text) {
					throw new Error('HTTP ' + response.status + (text ? ': ' + text : ''));
				});
			}
			return response.blob();
		})
		.then(function(blob) {
			var a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'dsar_' + ident.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.xlsx';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			showResult('#dsar_result', 'success', localise.set['msg_success']);
		})
		.catch(function(err) {
			showResult('#dsar_result', 'danger', err.message);
		});
}

// -------------------------------------------------------------------------
// RTBF — phase 1: search
// -------------------------------------------------------------------------

function rtbfSearch() {
	var ident = $('#rtbf_ident').val().trim();
	if (!ident) {
		showResult('#rtbf_result', 'danger', localise.set['msg_val_required']);
		return;
	}

	$('#rtbf_results').addClass('d-none');
	$('#rtbf_tbody').empty();
	showResult('#rtbf_result', 'info', localise.set['rtbf_searching']);

	var url = '/surveyKPI/rtbf?identifier=' + encodeURIComponent(ident);
	if ($('#rtbf_partial').is(':checked')) {
		url += '&partial=true';
	}

	fetch(url, { credentials: 'same-origin' })
		.then(function(response) {
			return response.json().then(function(data) {
				if (!response.ok) {
					throw new Error(data.error || 'HTTP ' + response.status);
				}
				return data;
			});
		})
		.then(function(matches) {
			showResult('#rtbf_result', '', '');
			if (!matches.length) {
				showResult('#rtbf_result', 'warning', localise.set['rtbf_no_results']);
				return;
			}
			renderRtbfTable(matches);
			$('#rtbf_results').removeClass('d-none');
			$('#rtbf_select_all').prop('checked', true);
		})
		.catch(function(err) {
			showResult('#rtbf_result', 'danger', err.message);
		});
}

function renderRtbfTable(matches) {
	var tbody = $('#rtbf_tbody');
	tbody.empty();

	matches.forEach(function(m) {
		var badgeClass = 'bg-success';
		if (m.status === 'History') badgeClass = 'bg-warning text-dark';
		if (m.status === 'Deleted') badgeClass = 'bg-danger';

		var row = $('<tr>');
		row.append($('<td>').append(
			$('<input type="checkbox" class="form-check-input rtbf-check">')
				.attr('data-target', m.target)
				.prop('checked', true)
		));
		row.append($('<td>').text(m.project));
		row.append($('<td>').text(m.survey));
		row.append($('<td>').text(m.form));
		row.append($('<td>').append(
			$('<span class="badge">').addClass(badgeClass).text(m.status)
		));
		row.append($('<td>').text(m.fields));
		tbody.append(row);
	});
}

// -------------------------------------------------------------------------
// RTBF — phase 2: redact selected
// -------------------------------------------------------------------------

function rtbfRedactSelected() {
	var targets = [];
	$('.rtbf-check:checked').each(function() {
		targets.push($(this).data('target'));
	});

	if (!targets.length) {
		showResult('#rtbf_result', 'warning', localise.set['c_select']);
		return;
	}

	var ident = $('#rtbf_ident').val().trim();
	var confirmMsg = localise.set['rtbf_confirm'].replace('%s1', ident);
	if (!confirm(confirmMsg)) return;

	var url = '/surveyKPI/rtbf?' + targets.map(function(t) {
		return 'target=' + encodeURIComponent(t);
	}).join('&');

	showResult('#rtbf_result', 'info', localise.set['msg_loading']);

	fetch(url, { method: 'POST', credentials: 'same-origin' })
		.then(function(response) {
			return response.json().then(function(data) {
				if (!response.ok) {
					throw new Error(data.error || 'HTTP ' + response.status);
				}
				return data;
			});
		})
		.then(function(data) {
			var msg = data.affected > 0
				? localise.set['rtbf_done'].replace('%s1', data.affected).replace('%s2', ident)
				: localise.set['rtbf_none'].replace('%s1', ident);
			showResult('#rtbf_result', data.affected > 0 ? 'success' : 'warning', msg);
			// Clear the results table — those records are now redacted
			$('#rtbf_results').addClass('d-none');
			$('#rtbf_tbody').empty();
		})
		.catch(function(err) {
			showResult('#rtbf_result', 'danger', err.message);
		});
}

// -------------------------------------------------------------------------

function showResult(selector, level, msg) {
	if (!level) {
		$(selector).html('');
	} else {
		$(selector).html('<div class="alert alert-' + level + '">' + msg + '</div>');
	}
}
