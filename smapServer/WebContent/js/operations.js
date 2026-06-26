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
 * Operations Monitor (L0) - senior-manager overview of case management and workflow.
 * Talks to GET /surveyKPI/ops/overview. See docs/manager-reporting-solution.md (Part C).
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

var gBacklogChart;
var gBacklog = [];				// latest backlog series, kept so the toggle can re-render without re-fetching
var gBacklogMode = "line";		// "line" (net backlog + opened/closed lines) or "bar" (opened vs closed throughput)
var gUnits = [];				// latest per-unit (role) breakdown
var gBundles = [];				// latest per-bundle breakdown
var gUnitMode = "unit";			// "unit" or "bundle" - which case breakdown the table shows
var gSparklines = [];

const RAG = { green: "#198754", amber: "#ffc107", red: "#dc3545", none: "#6c757d" };

// KPI tiles in display order. label resolved from localise by key, falling back to server label.
const KPI_ORDER = ["open_cases", "unassigned_cases", "tasks_in_progress", "tasks_overdue", "stale_items", "open_alerts", "submissions_7d"];

$(document).ready(function () {

	if (typeof setTheme === "function") {
		setTheme();
	}
	localise.initLocale(gUserLocale).then(function () {
		setupUserProfile();
		localise.setlang();		// Localise static HTML
		// A full page draw forces a fresh snapshot (recompute + repopulate the server cache).
		// Drill-down pages then read that snapshot. The app "refresh" menu does the same.
		loadOverview(true);		// Load data directly - does not depend on the user lookup
	});

	// Loads the profile menu and applies role-based menu visibility
	getLoggedInUser(undefined, false, false, undefined);

	$('#ops_refresh').on('click', function (e) {
		e.preventDefault();
		loadOverview(true);
	});

	// Switch the backlog chart between line (backlog trend) and bar (opened/closed throughput)
	$('#ops_backlog_toggle button').on('click', function () {
		var mode = $(this).data('mode');
		if (mode === gBacklogMode) { return; }
		gBacklogMode = mode;
		$('#ops_backlog_toggle button').removeClass('active');
		$(this).addClass('active');
		renderBacklog(gBacklog);
	});

	// Expand / collapse the backlog chart
	$('#ops_backlog_expand').on('click', function () {
		var expanded = $('#ops_backlog_wrap').toggleClass('chart-expanded').hasClass('chart-expanded');
		$(this).find('i').toggleClass('fa-expand', !expanded).toggleClass('fa-compress', expanded);
		if (gBacklogChart) { gBacklogChart.resize(); }
	});

	// Switch the case breakdown between by-unit (role) and by-bundle
	$('#ops_units_toggle button').on('click', function () {
		var mode = $(this).data('mode');
		if (mode === gUnitMode) { return; }
		gUnitMode = mode;
		$('#ops_units_toggle button').removeClass('active');
		$(this).addClass('active');
		renderBreakdown();
	});
});

function loadOverview(force) {
	$('.hour_glass').show();
	// Send the browser timezone so the backlog trend buckets by local day, not UTC.
	// Computed directly (not via globals.gTimezone) as this runs before the user lookup.
	var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	var params = (force ? 'refresh=true&' : '') + 'tz=' + encodeURIComponent(tz);
	fetch('/surveyKPI/ops/overview?' + params, { credentials: 'same-origin', cache: 'no-store' })
		.then(function (resp) {
			if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
			return resp.json();
		})
		.then(function (data) {
			renderOverview(data);
		})
		.catch(function (err) {
			console.error('Operations overview failed', err);
		})
		.finally(function () {
			$('.hour_glass').hide();
		});
}

function renderOverview(data) {
	renderKpis(data.kpis || []);
	renderBacklog(data.backlog || []);
	renderAlerts(data.alerts || []);
	gUnits = data.units || [];
	gBundles = data.bundles || [];
	renderBreakdown();
	if (data.generatedAt) {
		$('#ops_generated').text((localise.set["ops_generated"] || "Updated") + ": " + data.generatedAt.replace('T', ' '));
	}
}

function kpiLabel(kpi) {
	return localise.set[kpi.key] || localise.set["ops_" + kpi.key] || kpi.label || kpi.key;
}

function renderKpis(kpis) {
	// keep stable order
	const byKey = {};
	kpis.forEach(function (k) { byKey[k.key] = k; });
	const ordered = [];
	KPI_ORDER.forEach(function (key) { if (byKey[key]) { ordered.push(byKey[key]); } });
	kpis.forEach(function (k) { if (KPI_ORDER.indexOf(k.key) < 0) { ordered.push(k); } });

	// tidy up any previous sparkline charts
	gSparklines.forEach(function (c) { try { c.destroy(); } catch (e) {} });
	gSparklines = [];

	const linkFor = {
		open_cases: '/app/operations_items.html?type=open_cases',
		unassigned_cases: '/app/operations_items.html?type=unassigned',
		tasks_in_progress: '/app/operations_items.html?type=in_progress',
		tasks_overdue: '/app/operations_items.html?type=overdue',
		stale_items: '/app/operations_items.html?type=stale',
		open_alerts: '/app/operations_items.html?type=alerts'
	};

	let html = "";
	ordered.forEach(function (k) {
		const colour = RAG[k.rag] || RAG.none;
		const hasTrend = k.trend && k.trend.length > 0;
		const url = linkFor[k.key];
		const open = url ? '<a href="' + url + '" class="text-decoration-none text-reset">' : '';
		const close = url ? '</a>' : '';
		html += '<div class="col-6 col-md-4 col-xl">' + open +
			'<div class="card h-100">' +
			'<div class="card-body py-2">' +
			'<div class="text-muted text-uppercase small">' + esc(kpiLabel(k)) +
			(url ? ' <i class="fas fa-chevron-right small"></i>' : '') + '</div>' +
			'<div class="d-flex align-items-center justify-content-between">' +
			'<span class="fs-3 fw-bold" style="color:' + colour + '">' + esc(String(k.value)) + '</span>' +
			(hasTrend ? '<canvas class="ops-spark" data-key="' + esc(k.key) + '" width="80" height="34"></canvas>' : '') +
			'</div></div></div>' + close + '</div>';
	});
	$('#ops_kpis').html(html);

	// render sparklines after the canvases exist
	ordered.forEach(function (k) {
		if (k.trend && k.trend.length > 0) {
			const canvas = document.querySelector('.ops-spark[data-key="' + cssEsc(k.key) + '"]');
			if (canvas) {
				gSparklines.push(new Chart(canvas, {
					type: 'line',
					data: {
						labels: k.trend.map(function (p) { return p.date; }),
						datasets: [{
							data: k.trend.map(function (p) { return p.value; }),
							borderColor: RAG[k.rag] || RAG.none,
							borderWidth: 1.5,
							pointRadius: 0,
							tension: 0.3,
							fill: false
						}]
					},
					options: {
						responsive: false,
						plugins: { legend: { display: false }, tooltip: { enabled: false } },
						scales: { x: { display: false }, y: { display: false } }
					}
				}));
			}
		}
	});
}

function renderBacklog(backlog) {
	gBacklog = backlog || [];
	const ctx = document.getElementById('ops_backlog_chart');
	if (!ctx) { return; }
	if (gBacklogChart) { try { gBacklogChart.destroy(); } catch (e) {} }

	const labels = gBacklog.map(function (p) { return p.date; });
	let config;

	if (gBacklogMode === "bar") {
		// Throughput: opened vs closed per day, across the same surveys the backlog trend covers
		config = {
			type: 'bar',
			data: {
				labels: labels,
				datasets: [
					{
						label: localise.set["ops_opened"] || "Opened",
						data: gBacklog.map(function (p) { return p.opened; }),
						backgroundColor: RAG.red
					},
					{
						label: localise.set["ops_closed"] || "Closed",
						data: gBacklog.map(function (p) { return p.closed; }),
						backgroundColor: RAG.green
					}
				]
			}
		};
	} else {
		// Cumulative backlog trend with opened / closed reference lines
		config = {
			type: 'line',
			data: {
				labels: labels,
				datasets: [
					{
						label: localise.set["ops_net_backlog"] || "Net backlog",
						data: gBacklog.map(function (p) { return p.net; }),
						borderColor: RAG.red,
						backgroundColor: 'rgba(220,53,69,0.1)',
						borderWidth: 2,
						pointRadius: 0,
						tension: 0.3,
						fill: true
					},
					{
						label: localise.set["ops_opened"] || "Opened",
						data: gBacklog.map(function (p) { return p.opened; }),
						borderColor: RAG.amber,
						borderWidth: 1,
						pointRadius: 0,
						tension: 0.3,
						fill: false
					},
					{
						label: localise.set["ops_closed"] || "Closed",
						data: gBacklog.map(function (p) { return p.closed; }),
						borderColor: RAG.green,
						borderWidth: 1,
						pointRadius: 0,
						tension: 0.3,
						fill: false
					}
				]
			}
		};
	}

	config.options = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: { mode: 'index', intersect: false },
		plugins: { legend: { position: 'bottom' } },
		scales: { y: { beginAtZero: true } }
	};

	gBacklogChart = new Chart(ctx, config);
}

function renderAlerts(alerts) {
	if (!alerts.length) {
		$('#ops_alerts').html('<li class="list-group-item text-muted lang" data-lang="ops_no_alerts">' +
			(localise.set["ops_no_alerts"] || "No open alerts") + '</li>');
		return;
	}
	let html = "";
	alerts.forEach(function (a) {
		const cls = a.priority === 1 ? 'text-danger' : (a.priority === 2 ? 'text-warning' : 'text-muted');
		const href = a.link ? esc(a.link) : '#';
		html += '<li class="list-group-item">' +
			'<a href="' + href + '" class="' + cls + ' text-decoration-none">' +
			'<i class="fas fa-exclamation-circle me-1"></i>' + esc(a.message || "") + '</a>' +
			'<div class="small text-muted">' +
			(a.bundle ? esc(a.bundle) + ' &middot; ' : '') + ago(a.sinceSeconds) +
			'</div></li>';
	});
	$('#ops_alerts').html(html);
}

function renderBreakdown() {
	if (gUnitMode === "bundle") {
		renderBundles(gBundles);
	} else {
		renderUnits(gUnits);
	}
}

function renderUnits(units) {
	$('#ops_units_title').text(localise.set["ops_units"] || "Units (roles)");
	$('#ops_units_head').html('<tr>' +
		'<th>' + (localise.set["ops_role"] || "Role") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_open_cases"] || "Open cases") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_open_tasks"] || "Open tasks") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_tasks_overdue"] || "Overdue") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_overdue_pct"] || "Overdue %") + '</th>' +
		'</tr>');
	if (!units.length) {
		$('#ops_units').html('<tr><td colspan="5" class="text-muted">' +
			(localise.set["ops_no_units"] || "No units with open work") + '</td></tr>');
		return;
	}
	let html = "";
	units.forEach(function (u) {
		const colour = RAG[u.rag] || RAG.none;
		if (u.aggregate) {
			// Reconciliation row (Unassigned / No unit). Drills to the L2 record list when a type is set.
			const label = u.itemType
				? '<a href="/app/operations_items.html?type=' + encodeURIComponent(u.itemType) +
					'" class="text-decoration-none text-muted">' + esc(u.role) +
					' <i class="fas fa-chevron-right small"></i></a>'
				: esc(u.role);
			html += '<tr class="text-muted">' +
				'<td><span class="badge me-1 bg-light">&nbsp;</span>' + label + '</td>' +
				'<td class="text-end">' + esc(String(u.openCases)) + '</td>' +
				'<td class="text-end">&mdash;</td>' +
				'<td class="text-end">&mdash;</td>' +
				'<td class="text-end">&mdash;</td>' +
				'</tr>';
			return;
		}
		const href = '/app/operations_unit.html?role=' + encodeURIComponent(u.role);
		html += '<tr>' +
			'<td><span class="badge me-1" style="background-color:' + colour + '">&nbsp;</span>' +
			'<a href="' + href + '" class="text-decoration-none">' + esc(u.role) +
			' <i class="fas fa-chevron-right text-muted small"></i></a></td>' +
			'<td class="text-end">' + esc(String(u.openCases)) + '</td>' +
			'<td class="text-end">' + esc(String(u.openTasks)) + '</td>' +
			'<td class="text-end">' + esc(String(u.overdue)) + '</td>' +
			'<td class="text-end" style="color:' + colour + '">' + u.overduePct.toFixed(0) + '%</td>' +
			'</tr>';
	});
	$('#ops_units').html(html);
}

function renderBundles(bundles) {
	$('#ops_units_title').text(localise.set["ops_bundles"] || "Bundles");
	$('#ops_units_head').html('<tr>' +
		'<th>' + (localise.set["ops_bundle"] || "Bundle") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_open_cases"] || "Open cases") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_stale"] || "Stale") + '</th>' +
		'<th class="text-end">' + (localise.set["ops_unit_unassigned"] || "Unassigned") + '</th>' +
		'</tr>');
	if (!bundles.length) {
		$('#ops_units').html('<tr><td colspan="4" class="text-muted">' +
			(localise.set["ops_no_bundles"] || "No bundles with open cases") + '</td></tr>');
		return;
	}
	let html = "";
	bundles.forEach(function (b) {
		const colour = RAG[b.rag] || RAG.none;
		html += '<tr>' +
			'<td><span class="badge me-1" style="background-color:' + colour + '">&nbsp;</span>' + esc(b.name) + '</td>' +
			'<td class="text-end">' + esc(String(b.openCases)) + '</td>' +
			'<td class="text-end">' + esc(String(b.stale)) + '</td>' +
			'<td class="text-end">' + esc(String(b.unassigned)) + '</td>' +
			'</tr>';
	});
	$('#ops_units').html(html);
}

// ---- helpers ----

function ago(seconds) {
	if (seconds == null) { return ""; }
	const d = Math.floor(seconds / 86400);
	if (d > 0) { return d + (localise.set["ops_days_ago"] || "d ago"); }
	const h = Math.floor(seconds / 3600);
	if (h > 0) { return h + (localise.set["ops_hours_ago"] || "h ago"); }
	const m = Math.floor(seconds / 60);
	return m + (localise.set["ops_mins_ago"] || "m ago");
}

function esc(s) {
	return $('<div>').text(s == null ? "" : s).html();
}

function cssEsc(s) {
	return String(s).replace(/"/g, '\\"');
}
