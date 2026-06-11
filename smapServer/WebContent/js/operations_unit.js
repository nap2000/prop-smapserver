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
 * Operations Monitor - single unit (role) drill-down page (L1).
 * Talks to GET /surveyKPI/ops/unit/{role}. See docs/manager-reporting-solution.md (Part D).
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

const RAG = { green: "#198754", amber: "#ffc107", red: "#dc3545", none: "#6c757d" };

var gThroughputChart;
var gBacklogChart;
var gRole;

$(document).ready(function () {

	if (typeof setTheme === "function") {
		setTheme();
	}
	gRole = new URLSearchParams(window.location.search).get("role") || "";

	localise.initLocale(gUserLocale).then(function () {
		setupUserProfile();
		localise.setlang();
		loadUnit();
	});

	getLoggedInUser(undefined, false, false, undefined);
});

function loadUnit() {
	if (!gRole) { return; }
	$('.hour_glass').show();
	$('#ops_unit_role').text(gRole);
	document.title = gRole + " – " + (localise.set["ops_title"] || "Operations Monitor");

	fetch('/surveyKPI/ops/unit/' + encodeURIComponent(gRole), { credentials: 'same-origin' })
		.then(function (resp) {
			if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
			return resp.json();
		})
		.then(function (data) {
			renderUnit(data);
		})
		.catch(function (err) {
			console.error('Unit detail failed', err);
		})
		.finally(function () {
			$('.hour_glass').hide();
		});
}

function renderUnit(d) {
	$('#ops_unit_role').text(d.role);
	const colour = RAG[d.rag] || RAG.none;
	$('#ops_unit_rag').css('background-color', colour);

	$('#ops_unit_stats').html(
		stat(localise.set["ops_open_cases"] || "Open cases", d.openCases) +
		stat(localise.set["ops_open_tasks"] || "Open tasks", d.openTasks) +
		stat(localise.set["ops_tasks_overdue"] || "Overdue", d.overdue, colour) +
		stat(localise.set["ops_overdue_pct"] || "Overdue %", (d.overduePct || 0).toFixed(0) + '%', colour) +
		stat(localise.set["ops_avg_cycle_cases"] || "Avg case cycle (days)", (d.avgCycleDaysCases || 0).toFixed(1)) +
		stat(localise.set["ops_avg_cycle_tasks"] || "Avg task cycle (days)", (d.avgCycleDaysTasks || 0).toFixed(1))
	);

	renderThroughput(d);
	renderBacklog(d);
	renderAtRisk(d.atRisk || []);

	if (d.generatedAt) {
		$('#ops_unit_generated').text((localise.set["ops_generated"] || "Updated") + ": " + d.generatedAt.replace('T', ' '));
	}
}

function stat(label, value, colour) {
	return '<div class="col-6 col-md-4 col-xl-2 mb-3">' +
		'<div class="card h-100"><div class="card-body py-2">' +
		'<div class="text-muted text-uppercase small">' + esc(label) + '</div>' +
		'<div class="fs-4 fw-bold"' + (colour ? ' style="color:' + colour + '"' : '') + '>' + esc(value) + '</div>' +
		'</div></div></div>';
}

function renderThroughput(d) {
	const ctx = document.getElementById('ops_unit_chart');
	if (gThroughputChart) { try { gThroughputChart.destroy(); } catch (e) {} }
	gThroughputChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: (d.casesClosed || []).map(function (p) { return p.date; }),
			datasets: [
				{
					label: localise.set["ops_cases_closed"] || "Cases closed",
					data: (d.casesClosed || []).map(function (p) { return p.value; }),
					borderColor: RAG.green, borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false
				},
				{
					label: localise.set["ops_tasks_completed"] || "Tasks completed",
					data: (d.tasksCompleted || []).map(function (p) { return p.value; }),
					borderColor: '#0d6efd', borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false
				}
			]
		},
		options: {
			responsive: true, maintainAspectRatio: false,
			interaction: { mode: 'index', intersect: false },
			plugins: { legend: { position: 'bottom' } },
			scales: { y: { beginAtZero: true } }
		}
	});
}

function renderBacklog(d) {
	const ctx = document.getElementById('ops_unit_backlog');
	if (gBacklogChart) { try { gBacklogChart.destroy(); } catch (e) {} }
	const backlog = d.backlog || [];
	gBacklogChart = new Chart(ctx, {
		type: 'line',
		data: {
			labels: backlog.map(function (p) { return p.date; }),
			datasets: [{
				label: localise.set["ops_net_backlog"] || "Net backlog",
				data: backlog.map(function (p) { return p.net; }),
				borderColor: RAG.red, backgroundColor: 'rgba(220,53,69,0.1)',
				borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true
			}]
		},
		options: {
			responsive: true, maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { beginAtZero: true } }
		}
	});
}

function renderAtRisk(items) {
	if (!items.length) {
		$('#ops_unit_atrisk').html('<tr><td colspan="4" class="text-muted">' +
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
	$('#ops_unit_atrisk').html(html);
}

function esc(s) {
	return $('<div>').text(s == null ? "" : s).html();
}
