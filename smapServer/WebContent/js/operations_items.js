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
 * Operations Monitor - L2 org-wide at-risk record list.
 * Talks to GET /surveyKPI/ops/items?type=. See docs/manager-reporting-solution.md (Part E).
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

var gType;

$(document).ready(function () {
	if (typeof setTheme === "function") {
		setTheme();
	}
	gType = new URLSearchParams(window.location.search).get("type");
	if (gType !== "stale" && gType !== "overdue") {
		gType = "overdue";		// page is reached from the L0 stale / overdue cards
	}

	localise.initLocale(gUserLocale).then(function () {
		setupUserProfile();
		localise.setlang();
		applyHeading();
		loadItems();
	});

	getLoggedInUser(undefined, false, false, undefined);
});

function applyHeading() {
	var key = gType === 'stale' ? "ops_stale_items" : "ops_tasks_overdue";
	$('#ops_items_heading').text(localise.set[key] || "At-risk records");
}

function loadItems() {
	$('.hour_glass').show();
	fetch('/surveyKPI/ops/items?type=' + encodeURIComponent(gType), { credentials: 'same-origin' })
		.then(function (resp) {
			if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
			return resp.json();
		})
		.then(function (items) {
			renderItems(items || []);
		})
		.catch(function (err) {
			console.error('At-risk items failed', err);
		})
		.finally(function () {
			$('.hour_glass').hide();
		});
}

function renderItems(items) {
	if (!items.length) {
		$('#ops_items').html('<tr><td colspan="4" class="text-muted">' +
			(localise.set["ops_no_at_risk"] || "Nothing at risk") + '</td></tr>');
		return;
	}
	let html = "";
	items.forEach(function (it) {
		const flag = it.overdue
			? '<span class="badge bg-danger">' + (localise.set["ops_overdue_flag"] || "Overdue") + '</span>'
			: '<span class="badge bg-warning text-dark">' + (localise.set["ops_stale_flag"] || "Stale") + '</span>';
		const typeLabel = it.type === 'task'
			? (localise.set["ops_task"] || "Task")
			: (localise.set["ops_case"] || "Case");
		const href = it.link ? esc(it.link) : '#';
		html += '<tr>' +
			'<td><a href="' + href + '" class="text-decoration-none">' + esc(it.title || "") + '</a>' +
			'<div class="small text-muted">' + esc(typeLabel) +
			(it.bundle ? ' &middot; ' + esc(it.bundle) : '') + '</div></td>' +
			'<td>' + esc(it.assignee || "") + '</td>' +
			'<td class="text-end">' + esc(String(it.ageDays)) + '</td>' +
			'<td>' + flag + '</td>' +
			'</tr>';
	});
	$('#ops_items').html(html);
}

function esc(s) {
	return $('<div>').text(s == null ? "" : s).html();
}
