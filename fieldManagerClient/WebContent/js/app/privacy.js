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

	$('#dsar_submit').on('click', function() {
		dsarExport();
	});

	$('#rtbf_erase').on('click', function() {
		rtbfAction('erase');
	});

	$('#rtbf_anonymise').on('click', function() {
		rtbfAction('anonymise');
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

function dsarExport() {
	var ident = $('#dsar_ident').val().trim();
	if (!ident) {
		showResult('#dsar_result', 'danger', localise.set['msg_val_required'] || 'Identifier required');
		return;
	}
	var url = '/surveyKPI/dsar?identifier=' + encodeURIComponent(ident);
	if ($('#dsar_partial').is(':checked')) {
		url += '&partial=true';
	}
	showResult('#dsar_result', 'info', localise.set['msg_loading'] || 'Exporting...');

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
			showResult('#dsar_result', 'success', localise.set['msg_success'] || 'Export complete');
		})
		.catch(function(err) {
			showResult('#dsar_result', 'danger', err.message);
		});
}

function rtbfAction(action) {
	var ident = $('#rtbf_ident').val().trim();
	if (!ident) {
		showResult('#rtbf_result', 'danger', localise.set['msg_val_required'] || 'Identifier required');
		return;
	}
	// TODO: implement backend API /api/v1/privacy/rtbf
	showResult('#rtbf_result', 'warning', 'RTBF ' + action + ' API not yet implemented');
}

function showResult(selector, level, msg) {
	$(selector).html('<div class="alert alert-' + level + '">' + msg + '</div>');
}
