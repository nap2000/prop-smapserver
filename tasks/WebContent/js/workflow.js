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

import localise from "../../../smapServer/WebContent/js/app/localise";
import { addHourglass, removeHourglass, getLoggedInUser } from "common";

const TRIGGER_COLORS = {
	submission: "#e06c00",
	periodic: "#7c3aed",
	reminder: "#ca8a04"
};

const TARGET_COLORS = {
	task: "#2563eb",
	"case": "#7c3aed",
	email: "#16a34a",
	sms: "#0891b2",
	server_calc: "#0e7490",
	forward: "#e06c00"
};

function triggerColor(type) {
	return TRIGGER_COLORS[type] || "#6b7280";
}

function targetColor(type) {
	return TARGET_COLORS[type] || "#6b7280";
}

function triggerLabel(type) {
	const l = localise.set;
	const labels = {
		submission: l["submission"],
		periodic: l["c_scheduled"],
		reminder: l["task_reminder"]
	};
	return labels[type] || type;
}

function targetLabel(type) {
	const l = localise.set;
	const labels = {
		task:        l["c_create"] + " " + l["c_task"],
		"case":      l["c_create"] + " " + l["c_case"],
		email:       l["c_send"]   + " " + l["c_email"],
		sms:         l["c_send"]   + " " + l["c_sms"],
		server_calc: l["ed_s_calc"],
		forward:     l["c_forward"] + " " + l["c_data"]
	};
	return labels[type] || type;
}

function nodeCard(x, y, headerColor, icon, typeLabel, name, subName) {
	const div = document.createElement("div");
	div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:280px;background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:1px solid #dee2e6;color:#212529;font-family:sans-serif;overflow:hidden;`;

	const header = document.createElement("div");
	header.style.cssText = `background:${headerColor};height:36px;display:flex;align-items:center;padding:0 12px;gap:8px;`;
	header.innerHTML = `<i class="${icon}" style="color:#fff;font-size:14px;"></i><span style="color:#fff;font-size:13px;font-weight:600;">${typeLabel}</span>`;

	const body = document.createElement("div");
	body.style.cssText = "padding:10px 12px;";
	body.innerHTML = `<div style="font-weight:700;color:#212529;font-size:14px;">${name || ""}</div>
		<div style="font-size:12px;color:#6c757d;margin-top:3px;">${subName || ""}</div>`;

	div.appendChild(header);
	div.appendChild(body);
	return div;
}

function renderWorkflow(data) {
	const nodesEl = document.getElementById("wf-nodes");
	const svgEl = document.getElementById("wf-arrows");

	nodesEl.innerHTML = "";
	while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

	const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
	defs.innerHTML = `<marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
		<polygon points="0 0, 10 3.5, 0 7" fill="#4a9eff"/>
	</marker>`;
	svgEl.appendChild(defs);

	const TRIGGER_X = 60;
	const ACTION_X  = 380;
	const ROW_H     = 120;
	const CARD_W    = 280;
	const CARD_H    = 80;
	const START_Y   = 40;

	const items   = (data && data.items) ? data.items : [];
	const links   = (data && data.links) ? data.links : [];

	// Split by role and assign y positions
	const triggers = items.filter(function(i) { return i.role === "trigger"; });
	const actions  = items.filter(function(i) { return i.role === "action"; });

	// Map id → { x, y, cardMidY } for arrow drawing
	const positions = {};

	triggers.forEach(function(n, idx) {
		const y = START_Y + idx * ROW_H;
		positions[n.id] = { x: TRIGGER_X, y: y, midY: y + CARD_H / 2 };
		nodesEl.appendChild(nodeCard(
			TRIGGER_X, y,
			triggerColor(n.type),
			"fas fa-bolt",
			triggerLabel(n.type) + " " + localise.set["c_trigger"],
			n.name || "",
			""
		));
	});

	actions.forEach(function(n, idx) {
		const y = START_Y + idx * ROW_H;
		positions[n.id] = { x: ACTION_X, y: y, midY: y + CARD_H / 2 };
		nodesEl.appendChild(nodeCard(
			ACTION_X, y,
			targetColor(n.type),
			"fas fa-arrow-right",
			targetLabel(n.type),
			n.name || "",
			""
		));
	});

	// Draw arrows for each link
	links.forEach(function(link) {
		const from = positions[link.from];
		const to   = positions[link.to];
		if (!from || !to) return;

		const x1  = from.x + CARD_W;
		const y1  = from.midY;
		const x2  = to.x;
		const y2  = to.midY;
		const cx1 = x1 + 50;
		const cx2 = x2 - 50;

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
		path.setAttribute("stroke", "#4a9eff");
		path.setAttribute("stroke-width", "2");
		path.setAttribute("fill", "none");
		path.setAttribute("marker-end", "url(#arrow)");
		svgEl.appendChild(path);
	});
}

function loadWorkflow() {
	addHourglass();
	fetch("/surveyKPI/workflow/items", { credentials: "include" })
		.then(function(resp) {
			if (!resp.ok) throw new Error("HTTP " + resp.status);
			return resp.json();
		})
		.then(function(data) {
			renderWorkflow(data);
		})
		.catch(function(err) {
			console.error("loadWorkflow error:", err);
		})
		.finally(function() {
			removeHourglass();
		});
}

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch(e) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function() {
	window.localise = localise;

	$(document).ready(function() {
		localise.setlang();
		getLoggedInUser(loadWorkflow, false, false, undefined);
	});
});
