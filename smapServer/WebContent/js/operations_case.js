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
 * Operations Monitor - org-scoped single case viewer (Phase 5).
 * Talks to /surveyKPI/ops/case*. See docs/manager-reporting-solution.md (Part G).
 */
"use strict";

import $ from "jquery";
import globals from "./app/globals.js";
import localise from "./app/localise.js";
import { getLoggedInUser, setupUserProfile } from "./app/common";

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;	// common.js reads this as a global

var gSurvey;
var gInstance;

$(document).ready(function () {
	if (typeof setTheme === "function") {
		setTheme();
	}
	var params = new URLSearchParams(window.location.search);
	gSurvey = params.get("survey");
	gInstance = params.get("instanceid");

	localise.initLocale(gUserLocale).then(function () {
		setupUserProfile();
		localise.setlang();
		loadUsers();
		loadCase();
	});

	getLoggedInUser(undefined, false, false, undefined);

	$('#ops_case_assign').on('click', function () {
		var user = $('#ops_case_user').val();
		if (!user) { return; }
		act('assign', user);
	});
	$('#ops_case_release').on('click', function () {
		act('release', null);
	});
});

function loadCase() {
	if (!gSurvey || !gInstance) { return; }
	$('.hour_glass').show();
	fetch('/surveyKPI/ops/case?survey=' + encodeURIComponent(gSurvey) + '&instanceid=' + encodeURIComponent(gInstance),
		{ credentials: 'same-origin' })
		.then(function (resp) {
			if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
			return resp.json();
		})
		.then(renderCase)
		.catch(function (err) { console.error('Case load failed', err); })
		.finally(function () { $('.hour_glass').hide(); });
}

function loadUsers() {
	fetch('/surveyKPI/ops/case/users', { credentials: 'same-origin' })
		.then(function (resp) { return resp.ok ? resp.json() : []; })
		.then(function (users) {
			var html = '<option value="">' + (localise.set["ops_case_unassigned"] || "Unassigned") + '</option>';
			(users || []).forEach(function (u) {
				html += '<option value="' + esc(u.ident) + '">' + esc(u.name || u.ident) + '</option>';
			});
			$('#ops_case_user').html(html);
		})
		.catch(function (err) { console.error('User list failed', err); });
}

function renderCase(c) {
	$('#ops_case_heading').text(c.title || (localise.set["ops_case_title"] || "Case"));

	var sub = c.bundle ? esc(c.bundle) : "";
	var ownerLabel = c.assignee
		? (localise.set["ops_case_owner"] || "Owner") + ": " + esc(c.assignee)
		: (localise.set["ops_case_unassigned"] || "Unassigned");
	var stateLabel = c.closed
		? '<span class="badge bg-secondary">' + (localise.set["ops_case_closed"] || "Closed") + '</span>'
		: '<span class="badge bg-success">' + (localise.set["ops_case_open_state"] || "Open") + '</span>';
	$('#ops_case_sub').html(sub + ' &nbsp; ' + ownerLabel + ' &nbsp; ' + stateLabel);

	if (c.assignee) {
		$('#ops_case_user').val(c.assignee);
	}

	var rows = "";
	(c.fields || []).forEach(function (f) {
		rows += '<tr><th style="width:30%">' + esc(f.name) + '</th><td>' + esc(f.value) + '</td></tr>';
	});
	if (!rows) {
		rows = '<tr><td class="text-muted">' + (localise.set["ops_case_no_fields"] || "No data") + '</td></tr>';
	}
	$('#ops_case_fields').html(rows);
}

function act(action, user) {
	$('.hour_glass').show();
	var body = new URLSearchParams();
	body.set('survey', gSurvey);
	body.set('instanceid', gInstance);
	body.set('action', action);
	if (user) { body.set('user', user); }

	fetch('/surveyKPI/ops/case/assign', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: body.toString()
	})
		.then(function (resp) {
			if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
			$('#ops_case_msg').text(localise.set["msg_upd"] || "Updated").show();
			loadCase();
		})
		.catch(function (err) {
			console.error('Case action failed', err);
			alert((localise.set["c_error"] || "Error") + ": " + err.message);
		})
		.finally(function () { $('.hour_glass').hide(); });
}

function esc(s) {
	return $('<div>').text(s == null ? "" : s).html();
}
