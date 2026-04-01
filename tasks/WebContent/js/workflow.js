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

// Icon per workitem type
const TYPE_ICONS = {
	form:     "fas fa-file-alt",
	task:     "fas fa-file-alt",
	"case":   "fas fa-file-alt",
	periodic: "fas fa-clock",
	reminder: "fas fa-bell",
	email:    "fas fa-envelope",
	sms:      "fas fa-comment-alt"
};

// Localised label per workitem type — shown in the node card header
function typeLabel(type) {
	const l = localise.set;
	const labels = {
		form:     l["c_form"],
		task:     l["c_task"],
		"case":   l["c_case"],
		periodic: l["c_scheduled"],
		reminder: l["c_reminder"],
		email:    l["c_email"],
		sms:      l["c_sms"]
	};
	return labels[type] || type;
}

/*
 * Build a node card.  Shape is determined by role:
 *   form         → rectangle
 *   trigger      → rectangle (clock/bell icon)
 *   notification → rectangle (envelope/comment icon)
 *   decision     → diamond (not yet implemented)
 */
function nodeCard(x, y, role, type, name) {
	const icon = TYPE_ICONS[type] || "fas fa-circle";
	const label = typeLabel(type);

	const div = document.createElement("div");
	div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:240px;`
		+ `background:#fff;border-radius:6px;`
		+ `box-shadow:0 2px 8px rgba(0,0,0,0.12);`
		+ `border:1px solid #dee2e6;overflow:hidden;font-family:sans-serif;`;

	const header = document.createElement("div");
	header.style.cssText = `background:#f8f9fa;border-bottom:1px solid #dee2e6;`
		+ `height:32px;display:flex;align-items:center;padding:0 10px;gap:7px;`;
	header.innerHTML = `<i class="${icon}" style="color:#6c757d;font-size:13px;"></i>`
		+ `<span style="font-size:12px;color:#6c757d;font-weight:600;">${label}</span>`;

	const body = document.createElement("div");
	body.style.cssText = "padding:8px 10px;";
	body.innerHTML = `<div style="font-size:13px;font-weight:600;color:#212529;">${name || ""}</div>`;

	div.appendChild(header);
	div.appendChild(body);
	return div;
}

function renderWorkflow(data) {
	const nodesEl = document.getElementById("wf-nodes");
	const svgEl   = document.getElementById("wf-arrows");

	nodesEl.innerHTML = "";
	while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

	const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
	defs.innerHTML = `<marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
		<polygon points="0 0, 10 3.5, 0 7" fill="#adb5bd"/>
	</marker>`;
	svgEl.appendChild(defs);

	const LEFT_X  = 60;
	const RIGHT_X = 340;
	const ROW_H   = 100;
	const CARD_W  = 240;
	const CARD_H  = 68;
	const START_Y = 40;

	const items = (data && data.items) ? data.items : [];
	const links = (data && data.links) ? data.links : [];

	// Determine column placement from links:
	// items that appear only as link sources → left
	// items that appear only as link targets → right
	// items appearing as both, or unlinked → left
	const appearsAsTo   = new Set(links.map(function(l) { return l.to; }));
	const appearsAsFrom = new Set(links.map(function(l) { return l.from; }));

	const leftItems  = items.filter(function(i) { return !appearsAsTo.has(i.id) || appearsAsFrom.has(i.id); });
	const rightItems = items.filter(function(i) { return appearsAsTo.has(i.id) && !appearsAsFrom.has(i.id); });

	const positions = {};

	leftItems.forEach(function(n, idx) {
		const y = START_Y + idx * ROW_H;
		positions[n.id] = { x: LEFT_X, midY: y + CARD_H / 2 };
		nodesEl.appendChild(nodeCard(LEFT_X, y, n.role, n.type, n.name));
	});

	rightItems.forEach(function(n, idx) {
		const y = START_Y + idx * ROW_H;
		positions[n.id] = { x: RIGHT_X, midY: y + CARD_H / 2 };
		nodesEl.appendChild(nodeCard(RIGHT_X, y, n.role, n.type, n.name));
	});

	// Draw bezier arrows
	links.forEach(function(link) {
		const from = positions[link.from];
		const to   = positions[link.to];
		if (!from || !to) return;

		const x1  = from.x + CARD_W;
		const y1  = from.midY;
		const x2  = to.x;
		const y2  = to.midY;
		const cx1 = x1 + 40;
		const cx2 = x2 - 40;

		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`);
		path.setAttribute("stroke", "#adb5bd");
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
