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
import { addHourglass, removeHourglass, getLoggedInUser, handleLogout } from "common";

const CARD_W = 240;
const CARD_H = 68;

// Module-level state
let gData      = null;
let gPositions = {};   // id -> {x, y}  (updated live during drag)

// Icon per workitem type
const TYPE_ICONS = {
	form:     "fas fa-file-alt",
	task:     "fas fa-file-alt",
	"case":   "fas fa-file-alt",
	periodic: "fas fa-clock",
	reminder: "fas fa-bell",
	email:    "fas fa-envelope",
	sms:      "fas fa-comment-alt",
	decision: "fas fa-filter"
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
		sms:      l["c_sms"],
		decision: l["c_decision"] || "Decision"
	};
	return labels[type] || type;
}

/*
 * Build a node card element positioned at (x, y).
 * Decision nodes get a distinct amber style.
 */
function nodeCard(x, y, item) {
	const icon  = TYPE_ICONS[item.type] || "fas fa-circle";
	const label = typeLabel(item.type);
	const isDecision = item.role === "decision";

	const div = document.createElement("div");
	div.dataset.id = item.id;
	div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${CARD_W}px;`
		+ `background:#fff;border-radius:6px;cursor:grab;user-select:none;`
		+ `box-shadow:0 2px 8px rgba(0,0,0,0.12);`
		+ `border:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};overflow:hidden;font-family:sans-serif;`;

	const header = document.createElement("div");
	header.style.cssText = `background:${isDecision ? "#fff3cd" : "#f8f9fa"};`
		+ `border-bottom:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};`
		+ `height:32px;display:flex;align-items:center;padding:0 10px;gap:7px;`;
	header.innerHTML = `<i class="${icon}" style="color:${isDecision ? "#fd7e14" : "#6c757d"};font-size:13px;"></i>`
		+ `<span style="font-size:12px;color:${isDecision ? "#854d0e" : "#6c757d"};font-weight:600;">${label}</span>`;

	const body = document.createElement("div");
	body.style.cssText = "padding:8px 10px;";
	body.innerHTML = `<div style="font-size:13px;font-weight:600;color:#212529;">${item.name || ""}</div>`;

	div.appendChild(header);
	div.appendChild(body);
	return div;
}

/*
 * Draw all SVG arrows based on current gPositions.
 * Also resizes the SVG to cover the full node extent.
 */
function drawArrows() {
	const svgEl = document.getElementById("wf-arrows");
	while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

	const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
	defs.innerHTML = `<marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
		<polygon points="0 0, 10 3.5, 0 7" fill="#adb5bd"/>
	</marker>`;
	svgEl.appendChild(defs);

	// Resize SVG to encompass all nodes
	let maxX = 0, maxY = 0;
	Object.values(gPositions).forEach(function(p) {
		maxX = Math.max(maxX, p.x + CARD_W + 60);
		maxY = Math.max(maxY, p.y + CARD_H + 60);
	});
	svgEl.setAttribute("width",  maxX);
	svgEl.setAttribute("height", maxY);

	const links = (gData && gData.links) ? gData.links : [];
	links.forEach(function(link) {
		const from = gPositions[link.from];
		const to   = gPositions[link.to];
		if (!from || !to) return;

		const x1  = from.x + CARD_W;
		const y1  = from.y + CARD_H / 2;
		const x2  = to.x;
		const y2  = to.y + CARD_H / 2;
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

/*
 * Attach mousedown drag behaviour to a node card element.
 * Updates gPositions and redraws arrows live during the drag.
 */
function makeDraggable(el) {
	el.addEventListener("mousedown", function(e) {
		if (e.button !== 0) return;
		e.preventDefault();

		const id       = el.dataset.id;
		const startX   = e.clientX;
		const startY   = e.clientY;
		const startPos = gPositions[id];
		const origX    = startPos ? startPos.x : 0;
		const origY    = startPos ? startPos.y : 0;

		el.style.cursor = "grabbing";

		function onMove(e) {
			const newX = Math.max(0, origX + e.clientX - startX);
			const newY = Math.max(0, origY + e.clientY - startY);
			el.style.left = newX + "px";
			el.style.top  = newY + "px";
			gPositions[id] = { x: newX, y: newY };
			drawArrows();
		}

		function onUp() {
			el.style.cursor = "grab";
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup",   onUp);
		}

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup",   onUp);
	});
}

function renderWorkflow(data) {
	gData      = data;
	gPositions = {};

	const items = (data && data.items) ? data.items : [];
	items.forEach(function(item) {
		gPositions[item.id] = { x: item.x, y: item.y };
	});

	const nodesEl = document.getElementById("wf-nodes");
	nodesEl.innerHTML = "";

	items.forEach(function(item) {
		const pos  = gPositions[item.id];
		const card = nodeCard(pos.x, pos.y, item);
		makeDraggable(card);
		nodesEl.appendChild(card);
	});

	drawArrows();
}

function loadWorkflow() {
	addHourglass();
	fetch("/surveyKPI/workflow/items", { credentials: "include" })
		.then(function(resp) { return resp.text(); })
		.then(function(text) {
			if (!handleLogout(text)) return;
			renderWorkflow(JSON.parse(text));
		})
		.catch(function(err) {
			console.error("loadWorkflow error:", err);
		})
		.finally(function() {
			removeHourglass();
		});
}

function saveLayout() {
	fetch("/surveyKPI/workflow/positions", {
		method:      "PUT",
		credentials: "include",
		headers:     { "Content-Type": "application/json" },
		body:        JSON.stringify(gPositions)
	}).catch(function(err) {
		console.error("saveLayout error:", err);
	});
}

function resetLayout() {
	fetch("/surveyKPI/workflow/positions", {
		method:      "DELETE",
		credentials: "include"
	})
	.then(function() { loadWorkflow(); })
	.catch(function(err) {
		console.error("resetLayout error:", err);
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
		$("#m_refresh").on("click", function(e) {
			e.preventDefault();
			loadWorkflow();
		});
		$("#m_save_layout").on("click", function(e) {
			e.preventDefault();
			saveLayout();
		});
		$("#m_reset_layout").on("click", function(e) {
			e.preventDefault();
			resetLayout();
		});
	});
});
