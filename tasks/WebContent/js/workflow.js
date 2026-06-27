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
import { addHourglass, removeHourglass, getLoggedInUser, handleLogout, htmlEncode, setupUserProfile } from "common";
import globals from "globals";

const CARD_W = 240;
const CARD_H = 88;   // expanded to fit assignee row on task/case cards

// Module-level state
let gData      = null;
let gPositions = {};   // id -> {x, y}  (updated live during drag)
let gHighlight = "none";

// Edit-drawer state
let gEditItem     = null;   // WorkflowItem currently open in drawer
let gEditNotifs   = [];     // WorkflowEditNotif[] from server
let gEditTGs      = [];     // WorkflowEditTG[]   from server
let gEditStartIds = [];     // workflow_start IDs backing this node
let gSurveys    = null;   // cached survey list (null until first fetch)
let gUsers      = null;   // cached user list (null until first fetch)
let gRoles      = null;   // cached role list (null until first fetch)

// Drawer create-mode state
let gDrawerCreateMode = false;
let gCreateType       = "task";

// Add-step trigger state
let gSelectedNode    = null; // card element selected as trigger for new step
let gTriggerSurveyId = 0;   // survey ID parsed from selected node

// Fixed colours per node type (used when highlight = "type")
const TYPE_COLOURS = {
	form:             "#4a90d9",
	task:             "#27ae60",
	emailtask:        "#27ae60",
	"case":           "#e67e22",
	reference:        "#d35400",
	decision:         "#f39c12",
	periodic:         "#8e44ad",
	reminder:         "#16a085",
	email:            "#e74c3c",
	sms:              "#c0392b",
	sharepoint_list:  "#0078d4"
};

// Palette for dynamic dimensions (project, bundle)
const PALETTE = [
	"#1f78b4","#33a02c","#e31a1c","#ff7f00","#6a3d9a",
	"#b15928","#a6cee3","#b2df8a","#fb9a99","#fdbf6f",
	"#cab2d6","#ffff99"
];

// Icon per workitem type
const TYPE_ICONS = {
	form:            "fas fa-file-alt",
	task:            "fas fa-file-alt",
	emailtask:       "fas fa-envelope",
	"case":          "fas fa-file-alt",
	reference:       "fas fa-link",
	periodic:        "fas fa-clock",
	reminder:        "fas fa-bell",
	email:           "fas fa-envelope",
	sms:             "fas fa-comment-alt",
	decision:        "fas fa-filter",
	sharepoint_list: "fas fa-table"
};

// Types that get an edit button on their card
const EDITABLE_TYPES = ["task", "emailtask", "case", "reference", "email", "sms", "sharepoint_list", "periodic"];

// Localised label per workitem type
function typeLabel(type) {
	const l = localise.set;
	const labels = {
		form:     l["c_form"],
		task:     l["c_task"],
		emailtask: l["c_emailtask"],
		"case":   l["c_case"],
		reference: l["c_reference"],
		periodic: l["c_scheduled"],
		scheduled: l["c_scheduled"],
		reminder: l["c_reminder"],
		email:    l["c_email"],
		sms:      l["c_sms"],
		decision:        l["c_decision"],
		sharepoint_list: l["c_sharepoint_list"]
	};
	return labels[type] || type;
}

/*
 * Parse the survey ID out of a composite node ID.
 * Node ID formats: "form:s:123", "task:s:456:a:user@x.com", "case:s:789:a:..."
 */
function surveyIdFromNodeId(nodeId) {
	const parts = (nodeId || "").split(":");
	// Only valid for nodes with an "s" (survey) marker, e.g. "form:s:123" or "task:s:456:a:..."
	// Nodes like "case:f:100:a:..." carry a forward record ID at [2], not a survey ID.
	if (parts[1] !== "s") return 0;
	return parseInt(parts[2], 10) || 0;
}

// Walk gData.links backward from startNodeId to find the survey whose fields should
// populate the SP column map. Stops at:
//   - a "case" node       → returns its caseSurveyId (the case management survey)
//   - a "form:s:X" node   → returns the trigger form's survey ID
//   - a "task:tg:X" node  → returns the task's targetSurveyId (source for downstream steps)
//   - a "task:s:X" node   → returns the survey ID encoded in the node ID (legacy format)
function findAncestorSurveyId(startNodeId) {
	if (!gData) return 0;
	const links  = gData.links || [];
	const items  = gData.items || [];
	const visited = new Set();
	let current = startNodeId;
	while (current && !visited.has(current)) {
		visited.add(current);
		const parts = (current || "").split(":");
		if (parts[0] === "case" || parts[0] === "reference") {
			const item = items.find(function(i) { return i.id === current; });
			const caseId = item ? (item.caseSurveyId || 0) : 0;
			if (caseId) return caseId;
		}
		if (parts[0] === "form" && parts[1] === "s") {
			return parseInt(parts[2], 10) || 0;
		}
		if (parts[0] === "task" || parts[0] === "emailtask") {
			if (parts[1] === "s") return parseInt(parts[2], 10) || 0;
			const item = items.find(function(i) { return i.id === current; });
			const survId = item ? (item.targetSurveyId || 0) : 0;
			if (survId) return survId;
		}
		const inLink = links.find(function(l) { return l.to === current; });
		if (!inLink) break;
		current = inLink.from;
	}
	return 0;
}

/*
 * Select a node card as the trigger for a new step.
 * Passing null clears the selection.
 */
function selectNode(cardEl) {
	if (gSelectedNode) {
		gSelectedNode.classList.remove("wf-selected");
		const old = gSelectedNode.querySelector(".wf-connector-badge");
		if (old) old.remove();
	}
	gSelectedNode    = cardEl;
	gTriggerSurveyId = cardEl ? surveyIdFromNodeId(cardEl.dataset.id) : 0;
	const noChildren = ["email", "sms", "sharepoint_list"];
	if (gSelectedNode) {
		gSelectedNode.classList.add("wf-selected");
		if (noChildren.includes(gSelectedNode.dataset.type)) return;
		const badge = document.createElement("button");
		badge.className = "wf-connector-badge";
		badge.title     = localise.set["c_add_step_from_node"];
		badge.textContent = "+";
		badge.addEventListener("mousedown", function(e) { e.stopPropagation(); });
		badge.addEventListener("click",     function(e) { e.stopPropagation(); openAddDialog(); });
		gSelectedNode.appendChild(badge);
	}
}

/*
 * Build a node card element positioned at (x, y).
 */
function nodeCard(x, y, item) {
	const icon       = TYPE_ICONS[item.type] || "fas fa-circle";
	const label      = typeLabel(item.type);
	const isDecision  = item.role === "decision";
	const hasStartIds = (item.startIds || []).length > 0;
	const isEditable  = EDITABLE_TYPES.includes(item.type) || (item.type === "form" && hasStartIds);

	const div = document.createElement("div");
	div.dataset.id       = item.id;
	div.dataset.role     = item.role     || "";
	div.dataset.type     = item.type     || "";
	div.dataset.name     = item.name     || "";
	div.dataset.project  = item.project  || "";
	div.dataset.bundle   = item.bundle   || "";
	div.dataset.assignee = item.assignee || "";
	div.dataset.fwdIds       = JSON.stringify(item.fwdIds    || []);
	div.dataset.tgIds        = JSON.stringify(item.tgIds     || []);
	div.dataset.startIds     = JSON.stringify(item.startIds  || []);
	div.dataset.caseSurveyId = item.caseSurveyId || 0;

	div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${CARD_W}px;`
		+ `background:#fff;border-radius:6px;cursor:${isDecision ? "pointer" : "grab"};user-select:none;`
		+ `box-shadow:0 2px 8px rgba(0,0,0,0.12);`
		+ `border:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};font-family:sans-serif;`;

	const header = document.createElement("div");
	header.style.cssText = `background:${isDecision ? "#fff3cd" : "#f8f9fa"};`
		+ `border-bottom:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};`
		+ `height:32px;display:flex;align-items:center;padding:0 8px;gap:7px;`
		+ `border-radius:6px 6px 0 0;`;
	header.innerHTML = `<i class="${icon}" style="color:${isDecision ? "#fd7e14" : "#6c757d"};font-size:13px;"></i>`
		+ `<span style="font-size:11px;color:${isDecision ? "#854d0e" : "#6c757d"};font-weight:600;flex-shrink:0;">${label}</span>`
		+ (item.label ? `<span style="font-size:12px;font-weight:700;color:#212529;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;margin-left:4px;" title="${esc(item.label)}">${esc(item.label)}</span>` : `<span style="flex:1;"></span>`);

	// Edit button for editable node types and decision nodes
	if (isEditable || isDecision) {
		const editBtn = document.createElement("button");
		editBtn.className = "wf-node-edit-btn";
		editBtn.title = localise.set["c_edit"];
		editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>';
		editBtn.addEventListener("click", function(e) {
			e.stopPropagation();
			if (isDecision) {
				// Open the downstream target's drawer
				const link = (gData && gData.links || []).find(function(l) { return l.from === item.id; });
				if (!link) return;
				const targetEl = document.querySelector(`#wf-nodes [data-id="${link.to}"]`);
				if (targetEl && EDITABLE_TYPES.includes(targetEl.dataset.type)) {
					openEditDrawer(targetEl);
				}
			} else {
				openEditDrawer(div);
			}
		});
		header.appendChild(editBtn);
	}

	const hasAssignee = (item.type === "task" || item.type === "case" || item.type === "reference") && item.assignee;

	const body = document.createElement("div");
	body.style.cssText = "padding:8px 10px;";
	let bodyHtml = `<div style="font-size:13px;font-weight:600;color:#212529;">${item.name || ""}</div>`;
	if (hasAssignee) {
		bodyHtml += `<div style="font-size:11px;color:#6c757d;margin-top:3px;">${item.assignee}</div>`;
	}
	body.innerHTML = bodyHtml;

	div.addEventListener("click", function() {
		selectNode(div);
	});

	div.appendChild(header);
	div.appendChild(body);
	return div;
}

/*
 * Draw all SVG arrows based on current gPositions.
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
 * Attach drag behaviour to a node card element.
 */
function makeDraggable(el) {
	el.addEventListener("mousedown", function(e) {
		if (e.button !== 0) return;
		// Don't start a drag if clicking the edit button
		if (e.target.closest(".wf-node-edit-btn")) return;
		e.preventDefault();

		const id       = el.dataset.id;
		const startX   = e.clientX;
		const startY   = e.clientY;
		const startPos = gPositions[id];
		const origX    = startPos ? startPos.x : 0;
		const origY    = startPos ? startPos.y : 0;
		let   didDrag  = false;

		el.style.cursor = "grabbing";

		function onMove(e) {
			didDrag = true;
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
			if (didDrag) {
				// Suppress the click event that fires after mouseup so that
				// a drag on a decision node never opens the edit drawer.
				el.addEventListener("click", function suppressClick(e) {
					e.stopPropagation();
					el.removeEventListener("click", suppressClick, true);
				}, true);
				// Auto-persist so refresh / add-step / delete all restore dragged positions
				saveLayout();
			}
		}

		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup",   onUp);
	});
}

/*
 * Build colour map for the current highlight dimension.
 */
function buildColourMap(dimension) {
	const items = (gData && gData.items) ? gData.items : [];
	if (dimension === "type") {
		return TYPE_COLOURS;
	}
	const values = new Set();
	items.forEach(function(item) {
		const v = dimension === "project" ? item.project : item.bundle;
		if (v) values.add(v);
	});
	const sorted = Array.from(values).sort();
	const map = {};
	sorted.forEach(function(v, i) { map[v] = PALETTE[i % PALETTE.length]; });
	return map;
}

function applyHighlight() {
	const cards = document.querySelectorAll("#wf-nodes [data-id]");
	if (gHighlight === "none") {
		cards.forEach(function(el) {
			const isDecision = el.dataset.role === "decision";
			el.style.borderLeft = `1px solid ${isDecision ? "#fd7e14" : "#dee2e6"}`;
		});
		hideLegend();
		return;
	}
	const colourMap = buildColourMap(gHighlight);
	cards.forEach(function(el) {
		const val = gHighlight === "type"    ? el.dataset.type
		          : gHighlight === "project" ? el.dataset.project
		          :                            el.dataset.bundle;
		const colour = (val && colourMap[val]) ? colourMap[val] : "#ccc";
		el.style.borderLeft = `4px solid ${colour}`;
	});
	showLegend(colourMap);
}

function showLegend(colourMap) {
	const canvas = document.getElementById("workflow-canvas");
	let leg = document.getElementById("wf-legend");
	if (!leg) {
		leg = document.createElement("div");
		leg.id = "wf-legend";
		leg.style.cssText = "position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.96);"
			+ "border:1px solid #dee2e6;border-radius:6px;padding:10px 14px;z-index:10;"
			+ "font-family:sans-serif;font-size:12px;min-width:130px;"
			+ "box-shadow:0 2px 8px rgba(0,0,0,0.12);pointer-events:none;";
		canvas.appendChild(leg);
	}
	const l2 = localise.set;
	const labels = { type: l2["c_type"], project: l2["c_project"], bundle: l2["c_bundle"] };
	let html = `<div style="font-weight:700;margin-bottom:8px;color:#495057;">${labels[gHighlight] || gHighlight}</div>`;
	const entries = Object.entries(colourMap);
	if (entries.length === 0) {
		html += `<div style="color:#6c757d;font-style:italic;">${localise.set["c_no_data"]}</div>`;
	}
	entries.forEach(function([val, colour]) {
		html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">`
			+ `<span style="display:inline-block;width:13px;height:13px;border-radius:3px;`
			+ `background:${colour};flex-shrink:0;"></span>`
			+ `<span style="color:#495057;">${val || "(none)"}</span></div>`;
	});
	leg.innerHTML = html;
	leg.style.display = "";
}

function hideLegend() {
	const leg = document.getElementById("wf-legend");
	if (leg) leg.style.display = "none";
}

function renderWorkflow(data) {
	gData         = data;
	gPositions    = {};
	gSelectedNode = null;
	gTriggerSurveyId = 0;

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
	applyHighlight();
}

function loadWorkflow(afterRender) {
	addHourglass();
	fetch("/surveyKPI/workflow/items", { credentials: "include", cache: "no-store" })
		.then(function(resp) { return resp.text(); })
		.then(function(text) {
			if (!handleLogout(text)) return;
			renderWorkflow(JSON.parse(text));
			if (typeof afterRender === "function") afterRender();
		})
		.catch(function(err) {
			console.error("loadWorkflow error:", err);
		})
		.finally(function() {
			removeHourglass();
		});
}

// Find the lowest y at which a CARD_H-tall item at x=newX doesn't overlap anything,
// excluding the item with id excludeId.
function findFreeY(newX, excludeId) {
	const GAP = 20;
	const occupied = [];
	Object.entries(gPositions).forEach(function([id, pos]) {
		if (id === excludeId) return;
		if (pos.x < newX + CARD_W && pos.x + CARD_W > newX) {
			occupied.push({ y: pos.y, bottom: pos.y + CARD_H });
		}
	});
	occupied.sort(function(a, b) { return a.y - b.y; });
	let candidate = GAP;
	for (const slot of occupied) {
		if (candidate + CARD_H + GAP <= slot.y) break;
		candidate = Math.max(candidate, slot.bottom + GAP);
	}
	return candidate;
}

// Move any newly-created form items (ids not in knownIds) to a non-overlapping position.
function positionNewFormItems(knownIds) {
	let moved = false;
	Object.entries(gPositions).forEach(function([id, pos]) {
		if (knownIds.has(id)) return;
		const el = document.querySelector(`#wf-nodes [data-id="${id}"]`);
		if (!el || el.dataset.type !== "form") return;
		const freeY = findFreeY(pos.x, id);
		if (freeY === pos.y) return;
		gPositions[id] = { x: pos.x, y: freeY };
		el.style.left = pos.x + "px";
		el.style.top  = freeY + "px";
		moved = true;
	});
	if (moved) {
		drawArrows();
		saveLayout();
	}
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

// ============================================================
// Edit drawer
// ============================================================

/*
 * Open the edit drawer for the given node card element.
 * Fetches notification / task-group detail from the server.
 */
function openEditDrawer(cardEl) {
	selectNode(null);
	gEditItem        = cardEl;
	gDrawerCreateMode = false;
	gEditNotifs      = [];
	gEditTGs         = [];

	const saveBtn = document.getElementById("wf-drawer-save");
	if (saveBtn) saveBtn.innerHTML = '<span class="lang" data-lang="c_save">Save</span>';

	const fwdIds   = JSON.parse(cardEl.dataset.fwdIds   || "[]");
	const tgIds    = JSON.parse(cardEl.dataset.tgIds    || "[]");
	const startIds = JSON.parse(cardEl.dataset.startIds || "[]");
	const type     = cardEl.dataset.type;
	gEditStartIds  = startIds;

	const promises = [];
	if (fwdIds.length > 0) {
		promises.push(
			fetch(`/surveyKPI/workflow/edit/notifications?ids=${fwdIds.join(",")}&tz=${encodeURIComponent((typeof globals !== "undefined" && globals.gTimezone) || "UTC")}`, { credentials: "include" })
				.then(function(r) { return r.json(); })
				.then(function(d) { gEditNotifs = d; })
		);
	}
	if (tgIds.length > 0) {
		promises.push(
			fetch(`/surveyKPI/workflow/edit/taskgroups?ids=${tgIds.join(",")}`, { credentials: "include" })
				.then(function(r) { return r.json(); })
				.then(function(d) { gEditTGs = d; })
		);
	}

	addHourglass();
	Promise.all(promises)
		.then(function() { renderDrawerContent(type); })
		.catch(function(err) { console.error("openEditDrawer error:", err); })
		.finally(function() {
			removeHourglass();
			document.getElementById("wf-drawer").classList.add("open");
		});
}

function closeEditDrawer() {
	document.getElementById("wf-drawer").classList.remove("open");
	gEditItem          = null;
	gEditNotifs        = [];
	gEditTGs           = [];
	gEditStartIds      = [];
	gDrawerCreateMode  = false;
	// Restore footer defaults
	const saveBtn = document.getElementById("wf-drawer-save");
	if (saveBtn) saveBtn.innerHTML = '<span class="lang" data-lang="c_save">Save</span>';
}

/*
 * Render the drawer body and condition list for the given node type.
 * Shared properties come from the first record; per-connection filters
 * are listed individually in the amber Conditions section.
 */
// Wire the create-mode step-type selector buttons to switch type and re-render
function wireCreateTypeButtons() {
	document.querySelectorAll(".wf-create-type-btn").forEach(function(btn) {
		btn.addEventListener("click", function() { gCreateType = this.dataset.type; renderDrawerContent(gCreateType); });
	});
}

/*
 * Build the schedule fields (label, report, period, time, weekday/monthday/month)
 * shared by the scheduled create drawer and the periodic edit drawer.
 * `vals` pre-fills the controls when editing.
 */
function scheduleFieldsHtml(l, vals) {
	vals = vals || {};
	const period = vals.period || "daily";
	const time   = vals.time   || "09:00";
	const wd     = vals.weekday  != null ? vals.weekday  : 0;
	const md     = vals.monthday != null ? vals.monthday : 1;
	const mo     = vals.month    != null ? vals.month    : 1;
	const weekDays = [
		[0, l["c_sunday"]], [1, l["c_monday"]], [2, l["c_tuesday"]], [3, l["c_wednesday"]],
		[4, l["c_thursday"]], [5, l["c_friday"]], [6, l["c_saturday"]]
	];
	let dayOpts = "";
	for (let d = 1; d <= 31; d++) dayOpts += `<option value="${d}"${d === md ? " selected" : ""}>${d}</option>`;
	let monthOpts = "";
	for (let m = 1; m <= 12; m++) monthOpts += `<option value="${m}"${m === mo ? " selected" : ""}>${m}</option>`;
	function psel(v) { return period === v ? " selected" : ""; }
	return `<div class="wf-field">
			<label>${l["c_label"]}</label>
			<input id="wfd-sched-label" type="text" value="${esc(vals.label || "")}" placeholder="${esc(l["c_scheduled"])}">
		</div>
		<div class="wf-field">
			<label>${l["c_report"]}</label>
			<select id="wfd-sched-report"><option value="ops_summary">${l["ops_summary_report"]}</option></select>
		</div>
		<div class="wf-field">
			<label>${l["c_period"]}</label>
			<select id="wfd-sched-period">
				<option value="daily"${psel("daily")}>${l["c_daily"]}</option>
				<option value="weekly"${psel("weekly")}>${l["c_weekly"]}</option>
				<option value="monthly"${psel("monthly")}>${l["c_monthly"]}</option>
				<option value="quarterly"${psel("quarterly")}>${l["c_quarterly"]}</option>
				<option value="yearly"${psel("yearly")}>${l["c_yearly"]}</option>
			</select>
		</div>
		<div class="wf-field">
			<label>${l["ed_t"]}</label>
			<input id="wfd-sched-time" type="time" value="${esc(time)}">
		</div>
		<div class="wf-field" id="wfd-sched-weekday-row" style="display:none;">
			<label>${l["n_dow"]}</label>
			<select id="wfd-sched-weekday">${weekDays.map(function(w){return `<option value="${w[0]}"${w[0] === wd ? " selected" : ""}>${esc(w[1])}</option>`;}).join("")}</select>
		</div>
		<div class="wf-field" id="wfd-sched-monthday-row" style="display:none;">
			<label>${l["n_dom"]}</label>
			<select id="wfd-sched-monthday">${dayOpts}</select>
		</div>
		<div class="wf-field" id="wfd-sched-month-row" style="display:none;">
			<label>${l["c_month"]}</label>
			<select id="wfd-sched-month">${monthOpts}</select>
		</div>`;
}

/*
 * Populate the report list for the current project and wire the period selector
 * so only the schedule fields relevant to the chosen period are shown.
 * `selectedReport` pre-selects a report value once the list loads ("ops_summary"
 * or a numeric report id) when editing.
 */
function wireScheduleFields(selectedReport) {
	const repSel = document.getElementById("wfd-sched-report");
	const pId = (typeof globals !== "undefined" && globals.gCurrentProject) || 0;
	if (pId && repSel) {
		fetch(`/surveyKPI/reporting/reports?pId=${pId}`, { credentials: "include", cache: "no-store" })
			.then(function(r) { return r.json(); })
			.then(function(reports) {
				if (!Array.isArray(reports)) return;
				reports.forEach(function(rep) {
					const opt = document.createElement("option");
					opt.value = rep.id;
					opt.textContent = rep.name;
					repSel.appendChild(opt);
				});
				if (selectedReport != null && selectedReport !== "") repSel.value = String(selectedReport);
			})
			.catch(function(err) { console.error("load reports error:", err); });
	}

	const periodSel = document.getElementById("wfd-sched-period");
	function syncSchedFields() {
		const p = periodSel.value;
		document.getElementById("wfd-sched-weekday-row").style.display  = (p === "weekly") ? "" : "none";
		document.getElementById("wfd-sched-monthday-row").style.display = (p === "monthly" || p === "quarterly" || p === "yearly") ? "" : "none";
		document.getElementById("wfd-sched-month-row").style.display    = (p === "yearly") ? "" : "none";
	}
	periodSel.addEventListener("change", syncSchedFields);
	syncSchedFields();
}

function renderDrawerContent(type) {
	const l      = localise.set;
	const icon   = TYPE_ICONS[type] || "fas fa-circle";
	const label  = typeLabel(type);
	const colour = TYPE_COLOURS[type] || "#6c757d";

	document.getElementById("wf-drawer-icon").className = icon;
	document.getElementById("wf-drawer-icon").style.color = colour;
	document.getElementById("wf-drawer-title").textContent = label;

	// Form start nodes: read-only in edit mode; in create mode fall through to survey selector
	if (type === "form" && !gDrawerCreateMode) {
		document.getElementById("wf-drawer-body").innerHTML =
			`<div style="font-size:13px;color:#6c757d;">Survey: <strong>${esc(gEditItem.dataset.name)}</strong></div>`;
		document.getElementById("wf-conditions").style.display   = "none";
		document.getElementById("wf-drawer-save").style.display     = "none";
		document.getElementById("wf-drawer-advanced").style.display = "none";
		document.getElementById("wf-drawer-delete").style.display   = gEditStartIds.length > 0 ? "" : "none";
		return;
	}

	// Restore footer visibility for non-form types (in case drawer was previously on a form node)
	document.getElementById("wf-conditions").style.display      = "";
	document.getElementById("wf-drawer-save").style.display     = "";
	document.getElementById("wf-drawer-advanced").style.display = "";
	document.getElementById("wf-drawer-delete").style.display   = "";

	// Derive shared values from the first available record
	const firstNotif = gEditNotifs[0] || null;
	const firstTG    = gEditTGs[0]    || null;
	const name    = (firstNotif && firstNotif.name) || (firstTG && firstTG.name) || "";
	const enabled = firstNotif ? firstNotif.enabled : true;
	const remoteUser = (firstNotif && firstNotif.remoteUser) || (firstTG && firstTG.remoteUser) || "";

	let bodyHtml = "";

	// Create-mode header: type selector + trigger info
	if (gDrawerCreateMode) {
		const availTypes = gSelectedNode
			? ["task", "emailtask", "case", "reference", "email", "sms", "sharepoint_list"]
			: ["form", "scheduled"];
		const TYPE_BTN_STYLE = {
			form:            { cls: "btn-outline-primary",   icon: "fas fa-play-circle" },
			scheduled:       { cls: "", icon: "fas fa-clock", xstyle: "color:#8e44ad;border:1px solid #8e44ad;background:transparent;" },
			task:            { cls: "btn-outline-success",   icon: "fas fa-file-alt" },
			emailtask:       { cls: "btn-outline-success",   icon: "fas fa-envelope" },
			"case":          { cls: "btn-outline-warning",   icon: "fas fa-file-alt" },
			reference:       { cls: "", icon: "fas fa-link", xstyle: "color:#d35400;border:1px solid #d35400;background:transparent;" },
			email:           { cls: "btn-outline-danger",    icon: "fas fa-envelope" },
			sms:             { cls: "btn-outline-secondary", icon: "fas fa-comment-alt" },
			sharepoint_list: { cls: "", icon: "fas fa-table", xstyle: "color:#0078d4;border:1px solid #0078d4;background:transparent;" }
		};
		bodyHtml += `<div class="wf-field">
			<label>${l["c_step_type"]}</label>
			<div style="display:flex;flex-wrap:wrap;gap:4px;">
				${availTypes.map(function(t) {
					const s = TYPE_BTN_STYLE[t] || { cls: "btn-outline-secondary", icon: "fas fa-circle" };
					const st = (s.xstyle || "") + "font-size:11px;";
					return `<button type="button" class="btn ${s.cls} btn-sm wf-create-type-btn${t === type ? " active" : ""}"
						data-type="${t}" style="${st}"><i class="${s.icon}"></i> ${typeLabel(t)}</button>`;
				}).join("")}
			</div>
		</div>
		<div class="wf-field" style="font-size:12px;color:#6c757d;margin-bottom:8px;">
			${l["c_trigger"]}: <strong>${esc(gSelectedNode ? (gSelectedNode.dataset.label || gSelectedNode.dataset.name || gSelectedNode.dataset.id) : l["c_standalone"])}</strong>
		</div>`;
	}

	// Form create mode: survey selector
	if (type === "form" && gDrawerCreateMode) {
		bodyHtml += `<div class="wf-field">
			<label>${l["c_survey"]}</label>
			<select id="wfd-form-survey"><option value="">Loading…</option></select>
		</div>`;
		document.getElementById("wf-drawer-body").innerHTML = bodyHtml;
		wireCreateTypeButtons();
		fetchSurveys().then(function(surveys) {
			const el = document.getElementById("wfd-form-survey");
			if (el) el.innerHTML = surveys.map(function(s) {
				return `<option value="${esc(s.ident)}" data-id="${s.sId}">${esc(s.projectName)} / ${esc(s.name)}</option>`;
			}).join("");
		});
		document.getElementById("wf-conditions").style.display      = "none";
		document.getElementById("wf-drawer-delete").style.display   = "none";
		document.getElementById("wf-drawer-advanced").style.display = "none";
		document.getElementById("wf-drawer-save").textContent = localise.set["c_create_step"];
		return;
	}

	// Scheduled create mode: report selector + periodic schedule fields
	if (type === "scheduled" && gDrawerCreateMode) {
		bodyHtml += scheduleFieldsHtml(l, {});
		document.getElementById("wf-drawer-body").innerHTML = bodyHtml;
		wireCreateTypeButtons();
		wireScheduleFields(null);
		document.getElementById("wf-conditions").style.display      = "none";
		document.getElementById("wf-drawer-delete").style.display   = "none";
		document.getElementById("wf-drawer-advanced").style.display = "none";
		document.getElementById("wf-drawer-save").textContent = localise.set["c_create_step"];
		return;
	}

	// Periodic edit mode: change schedule, label and report of an existing scheduled step.
	// Recipients are edited separately on the linked email node.
	if (type === "periodic" && !gDrawerCreateMode) {
		const n = gEditNotifs[0] || {};
		const isOps = n.reportType === "ops_summary";
		bodyHtml += scheduleFieldsHtml(l, {
			label:    n.name,
			period:   n.periodicPeriod,
			time:     n.periodicTime,
			weekday:  n.periodicWeekDay,
			monthday: n.periodicMonthDay,
			month:    n.periodicMonth
		});
		document.getElementById("wf-drawer-body").innerHTML = bodyHtml;
		wireScheduleFields(isOps ? "ops_summary" : n.rId);
		document.getElementById("wf-conditions").style.display      = "none";
		document.getElementById("wf-drawer-advanced").style.display = "none";
		document.getElementById("wf-drawer-delete").style.display   = "";
		document.getElementById("wf-drawer-save").innerHTML = '<span class="lang" data-lang="c_save">Save</span>';
		return;
	}

	// Label field (notification name) — not shown for form type
	bodyHtml += `<div class="wf-field">
		<label>${l["c_label"]}</label>
		<input id="wfd-name" type="text" value="${esc(name)}">
	</div>`;

	if (type === "task" || type === "emailtask") {
		const targetSurveyId = firstTG ? firstTG.targetSurveyId : 0;
		bodyHtml += `<div class="wf-field">
			<label>${l["c_survey"]}</label>
			<select id="wfd-task-survey" data-current="${targetSurveyId}">
				<option value="">Loading…</option>
			</select>
		</div>`;
	}

	if (type === "emailtask") {
		const emailTo = (firstTG && firstTG.remoteUser) || (firstNotif && firstNotif.remoteUser) || "";
		bodyHtml += `<div class="wf-field">
			<label>${l["c_email_addresses"]}</label>
			<input id="wfd-task-email-to" type="text" value="${esc(emailTo)}" placeholder="comma-separated">
		</div>`;
	}

	if (type === "case" || type === "reference") {
		const caseSurveyIdent = (firstNotif && firstNotif.caseSurveyIdent) || "";
		bodyHtml += `<div class="wf-field">
			<label>${l["c_survey"]}</label>
			<select id="wfd-case-survey" data-current="${esc(caseSurveyIdent)}"><option value="">Loading…</option></select>
		</div>`;

		const isCaseRole = remoteUser.startsWith("_role:");
		const caseRoleId = isCaseRole ? remoteUser.substring(6) : "";
		bodyHtml += `<div class="wf-field">
			<label>${l["c_assign_type"]}</label>
			<div class="btn-group btn-group-sm">
				<button type="button" id="wfd-case-assign-user" class="btn btn-outline-secondary${isCaseRole ? "" : " active"}" style="font-size:11px;">${l["c_user"]}</button>
				<button type="button" id="wfd-case-assign-role" class="btn btn-outline-secondary${isCaseRole ? " active" : ""}" style="font-size:11px;">${l["c_role"]}</button>
			</div>
		</div>
		<div class="wf-field" id="wfd-case-user-row"${isCaseRole ? ' style="display:none;"' : ""}>
			<label>${l["c_assign_to"]}</label>
			<select id="wfd-case-user-select" data-current="${esc(isCaseRole ? "" : remoteUser)}"><option value="">Loading…</option></select>
		</div>
		<div class="wf-field" id="wfd-case-role-row"${isCaseRole ? "" : ' style="display:none;"'}>
			<label>${l["c_role"]}</label>
			<select id="wfd-case-role-select" data-current="${esc(caseRoleId)}"><option value="">Loading…</option></select>
		</div>`;
	}

	if (type === "email") {
		const emailTo      = (firstNotif && firstNotif.emailTo)      || "";
		const emailSubject = (firstNotif && firstNotif.emailSubject)  || "";
		const emailContent = (firstNotif && firstNotif.emailContent)  || "";
		bodyHtml += `
		<div class="wf-field"><label>${l["c_to_emails"]}</label>
			<input id="wfd-email-to" type="text" value="${esc(emailTo)}" placeholder="comma-separated">
		</div>
		<div class="wf-field"><label>${l["c_subject"]}</label>
			<input id="wfd-email-subj" type="text" value="${esc(emailSubject)}">
		</div>
		<div class="wf-field"><label>${l["c_message"]}</label>
			<textarea id="wfd-email-content">${esc(emailContent)}</textarea>
		</div>`;
	}

	if (type === "sms") {
		const smsTo      = (firstNotif && firstNotif.smsTo)      || "";
		const smsMessage = (firstNotif && firstNotif.smsMessage) || "";
		bodyHtml += `
		<div class="wf-field"><label>${l["c_to_phone"]}</label>
			<input id="wfd-sms-to" type="text" value="${esc(smsTo)}">
		</div>
		<div class="wf-field"><label>${l["c_message"]}</label>
			<textarea id="wfd-sms-content">${esc(smsMessage)}</textarea>
		</div>`;
	}

	if (type === "sharepoint_list") {
		const spOp = (firstNotif && firstNotif.spOperation) || "insert";
		bodyHtml += `
		<div class="wf-field">
			<label>${l["c_list"]}</label>
			<select id="wfd-sp-list"><option value="">Loading…</option></select>
		</div>
		<div class="wf-field">
			<label>${l["c_operation"]}</label>
			<div>
				<div class="form-check form-check-inline">
					<input class="form-check-input" type="radio" name="wfd-sp-op" id="wfd-sp-op-insert" value="insert" ${spOp !== "update" ? "checked" : ""}>
					<label class="form-check-label" for="wfd-sp-op-insert">${l["c_insert"]}</label>
				</div>
				<div class="form-check form-check-inline">
					<input class="form-check-input" type="radio" name="wfd-sp-op" id="wfd-sp-op-update" value="update" ${spOp === "update" ? "checked" : ""}>
					<label class="form-check-label" for="wfd-sp-op-update">${l["c_update_or_insert"]}</label>
				</div>
			</div>
		</div>
		<div id="wfd-sp-match-section" style="${spOp === "update" ? "" : "display:none;"}">
			<div class="wf-field">
				<label>${l["c_match_sp_column"]}</label>
				<select id="wfd-sp-match-col"><option value="">Loading…</option></select>
			</div>
			<div class="wf-field">
				<label>${l["c_match_survey_field"]}</label>
				<select id="wfd-sp-match-field"><option value="">Loading…</option></select>
			</div>
		</div>
		<div class="wf-field">
			<label>${l["c_column_map"]}</label>
			<table class="table table-sm table-bordered" style="font-size:12px;">
				<thead><tr>
					<th>${l["c_sp_column"]}</th><th>${l["c_survey_field"]}</th><th></th>
				</tr></thead>
				<tbody id="wfd-sp-col-map-body"></tbody>
			</table>
			<button type="button" id="wfd-sp-add-row" class="btn btn-sm btn-secondary">+ ${l["c_add_row"]}</button>
		</div>`;
		document.getElementById("wf-drawer-body").innerHTML = bodyHtml;

		// Load lists, columns, and survey fields in parallel then wire up
		const savedNotif = firstNotif || {};
		const nodeId = gEditItem ? gEditItem.dataset.id : (gSelectedNode ? gSelectedNode.dataset.id : null);
		const srcSurveyId = gDrawerCreateMode
			? (gTriggerSurveyId || findAncestorSurveyId(nodeId))
			: (savedNotif.srcSurveyId || findAncestorSurveyId(nodeId));
		addHourglass();
		Promise.all([
			fetchSpLists(),
			savedNotif.spListTitle ? fetchSpColumns(savedNotif.spListTitle) : Promise.resolve([]),
			fetchSurveyFields(srcSurveyId)
		]).then(function(results) {
			const lists    = results[0];
			const cols     = results[1];
			const fields   = results[2];
			gSpFields = fields;
			spPopulateDrawerLists(lists, savedNotif.spListTitle);
			spPopulateDrawerColumns(cols, savedNotif.spMatchColumn);
			spPopulateDrawerFields(fields, savedNotif.spMatchField);
			(savedNotif.spColumnMap || []).forEach(function(row) {
				spAddDrawerMapRow(cols, fields, row.sp_column, row.smap_field);
			});
		}).finally(function() { removeHourglass(); });

		// Wire operation radio to show/hide match section
		document.querySelectorAll("input[name='wfd-sp-op']").forEach(function(radio) {
			radio.addEventListener("change", function() {
				document.getElementById("wfd-sp-match-section").style.display =
					this.value === "update" ? "" : "none";
			});
		});

		// Wire list select to reload columns
		document.getElementById("wfd-sp-list").addEventListener("change", function() {
			const title = this.value;
			if (!title) return;
			gSpColumns = null;
			addHourglass();
			fetchSpColumns(title).then(function(cols) {
				spPopulateDrawerColumns(cols, null);
				document.querySelectorAll("#wfd-sp-col-map-body .wfd-sp-col-sel").forEach(function(sel) {
					spFillSelect(sel, cols.map(function(c) { return { val: c.internalName, text: c.displayName }; }), sel.value);
				});
			}).finally(function() { removeHourglass(); });
		});

		// Wire add-row button
		document.getElementById("wfd-sp-add-row").addEventListener("click", function() {
			spAddDrawerMapRow(gSpColumns || [], gSpFields || [], "", "");
		});

		// SP drawer has no Advanced link
		document.getElementById("wf-drawer-advanced").style.display = "none";
		document.getElementById("wf-conditions").style.display = "";
		if (gDrawerCreateMode) {
			document.getElementById("wf-drawer-save").textContent = localise.set["c_create_step"];
			document.getElementById("wf-drawer-delete").style.display = "none";
			wireCreateTypeButtons();
		}
		buildConditionRows();
		return;   // body already set — skip the generic innerHTML assignment below
	}

	// Bundle checkbox — create mode only, non-task/form/SP types
	if (gDrawerCreateMode && type !== "task" && type !== "emailtask" && type !== "form" && type !== "sharepoint_list") {
		bodyHtml += `<div class="wf-field wf-field-inline">
			<input id="wfd-bundle" type="checkbox">
			<label style="margin-left:6px;font-size:12px;">${l["c_bundle_notification"]}</label>
		</div>`;
	}

	// Enabled toggle (notifications, or create mode)
	if (gEditNotifs.length > 0 || gDrawerCreateMode) {
		bodyHtml += `<div class="wf-field wf-field-inline">
			<label>${l["c_enabled"]}</label>
			<input id="wfd-enabled" type="checkbox" ${enabled ? "checked" : ""}>
		</div>`;
	}

	// Assignee for task — shown for TG-backed edit OR create mode
	if (type === "task" && (gEditTGs.length > 0 || gDrawerCreateMode)) {
		const tgRoleId = firstTG ? (firstTG.roleId || 0) : 0;
		const tgUserId = firstTG ? (firstTG.userId || 0) : 0;
		const taskAssignMode = tgRoleId > 0 ? "role" : (tgUserId > 0 ? "user" : "unassigned");
		bodyHtml += `<div class="wf-field">
			<label>${l["c_assign_type"]}</label>
			<div class="btn-group btn-group-sm">
				<button type="button" id="wfd-task-assign-unassigned" class="btn btn-outline-secondary${taskAssignMode === "unassigned" ? " active" : ""}" style="font-size:11px;">${l["c_unassigned"]}</button>
				<button type="button" id="wfd-task-assign-user"       class="btn btn-outline-secondary${taskAssignMode === "user"       ? " active" : ""}" style="font-size:11px;">${l["c_user"]}</button>
				<button type="button" id="wfd-task-assign-role"       class="btn btn-outline-secondary${taskAssignMode === "role"       ? " active" : ""}" style="font-size:11px;">${l["c_role"]}</button>
			</div>
		</div>
		<div class="wf-field" id="wfd-task-user-row"${taskAssignMode === "user" ? "" : ' style="display:none;"'}>
			<label>${l["c_user"]}</label>
			<select id="wfd-task-user-select" data-current="${tgUserId}"><option value="">Loading…</option></select>
		</div>
		<div class="wf-field" id="wfd-task-role-row"${taskAssignMode === "role" ? "" : ' style="display:none;"'}>
			<label>${l["c_role"]}</label>
			<select id="wfd-task-role-select" data-current="${tgRoleId}"><option value="">Loading…</option></select>
		</div>`;
	}

	document.getElementById("wf-drawer-body").innerHTML = bodyHtml;

	// Populate task survey select if present
	const taskSurveyEl = document.getElementById("wfd-task-survey");
	if (taskSurveyEl) {
		const currentId = parseInt(taskSurveyEl.dataset.current, 10) || 0;
		fetchSurveys().then(function(surveys) {
			taskSurveyEl.innerHTML = surveys.map(function(s) {
				const sel = s.sId === currentId ? " selected" : "";
				return `<option value="${s.sId}"${sel}>${esc(s.projectName)} / ${esc(s.name)}</option>`;
			}).join("");
			if (surveys.length === 0) {
				taskSurveyEl.innerHTML = `<option value=''>${localise.set["t_select_survey"]}</option>`;
			}
		});
	}

	// Populate and wire task drawer assignee (user/role selects + toggles)
	if (type === "task" && (gEditTGs.length > 0 || gDrawerCreateMode)) {
		const userEl = document.getElementById("wfd-task-user-select");
		const roleEl = document.getElementById("wfd-task-role-select");
		if (userEl) {
			fetchUsers().then(function(users) {
				const cur = parseInt(userEl.dataset.current, 10) || 0;
				userEl.innerHTML = users.map(function(u) {
					return `<option value="${u.id}"${u.id === cur ? " selected" : ""}>${esc(u.name)}</option>`;
				}).join("");
			});
		}
		if (roleEl) {
			fetchRoles().then(function(roles) {
				fillRoleSelect(roleEl, roles, roleEl.dataset.current);
			});
		}
		function setDrawerTaskMode(mode) {
			["unassigned","user","role"].forEach(function(m) {
				const btn = document.getElementById("wfd-task-assign-" + m);
				if (btn) btn.classList.toggle("active", m === mode);
			});
			const uRow = document.getElementById("wfd-task-user-row");
			const rRow = document.getElementById("wfd-task-role-row");
			if (uRow) uRow.style.display = mode === "user" ? "" : "none";
			if (rRow) rRow.style.display = mode === "role" ? "" : "none";
		}
		["unassigned","user","role"].forEach(function(m) {
			const btn = document.getElementById("wfd-task-assign-" + m);
			if (btn) btn.onclick = function() { setDrawerTaskMode(m); };
		});
	}

	// Populate case/reference survey select (shared control)
	if (type === "case" || type === "reference") {
		const caseSurveyEl = document.getElementById("wfd-case-survey");
		if (caseSurveyEl) {
			const srcId = gDrawerCreateMode
					? (gTriggerSurveyId || findAncestorSurveyId(gSelectedNode ? gSelectedNode.dataset.id : ""))
					: (firstNotif ? firstNotif.srcSurveyId : 0);
			if (srcId) {
				fetch("/surveyKPI/surveyResults/" + srcId + "/groups", { credentials: "include", cache: "no-store" })
					.then(function(r) { return r.json(); })
					.then(function(data) {
						const cur = caseSurveyEl.dataset.current || "";
						caseSurveyEl.innerHTML = "<option value=''>-- select --</option>"
							+ (data || []).map(function(s) {
								return `<option value="${esc(s.surveyIdent)}"${s.surveyIdent === cur ? " selected" : ""}>${esc(s.surveyName)}</option>`;
							}).join("");
					})
					.catch(function() { caseSurveyEl.innerHTML = `<option value=''>${localise.set["c_no_surveys"]}</option>`; });
			} else {
				caseSurveyEl.innerHTML = `<option value=''>${localise.set["c_no_trigger"]}</option>`;
			}
		}
	}

	// Wire create-mode type selector buttons
	if (gDrawerCreateMode) {
		wireCreateTypeButtons();
		// Footer: Create mode
		document.getElementById("wf-drawer-save").textContent = localise.set["c_create_step"];
		document.getElementById("wf-drawer-delete").style.display   = "none";
		document.getElementById("wf-drawer-advanced").style.display = "none";
	}

	// Populate and wire case/reference drawer assignee (role select + toggles) - shared controls
	if (type === "case" || type === "reference") {
		const caseRoleEl = document.getElementById("wfd-case-role-select");
		if (caseRoleEl) {
			fetchRoles().then(function(roles) {
				fillRoleSelect(caseRoleEl, roles, caseRoleEl.dataset.current);
			});
		}
		const caseUserEl = document.getElementById("wfd-case-user-select");
		if (caseUserEl) {
			fetchUsers().then(function(users) {
				const cur = caseUserEl.dataset.current;
				const special = [
					{value: "_submitter", label: localise.set["c_submitter"]},
					{value: "_data",      label: localise.set["t_ad"]}
				];
				caseUserEl.innerHTML = special.concat(users.map(function(u) {
					return {value: u.ident, label: u.name};
				})).map(function(o) {
					return `<option value="${esc(o.value)}"${o.value === cur ? " selected" : ""}>${esc(o.label)}</option>`;
				}).join("");
			});
		}
		function setDrawerCaseMode(mode) {
			const uBtn = document.getElementById("wfd-case-assign-user");
			const rBtn = document.getElementById("wfd-case-assign-role");
			if (uBtn) uBtn.classList.toggle("active", mode === "user");
			if (rBtn) rBtn.classList.toggle("active", mode === "role");
			const uRow = document.getElementById("wfd-case-user-row");
			const rRow = document.getElementById("wfd-case-role-row");
			if (uRow) uRow.style.display = mode === "user" ? "" : "none";
			if (rRow) rRow.style.display = mode === "role" ? "" : "none";
		}
		const uBtn = document.getElementById("wfd-case-assign-user");
		const rBtn = document.getElementById("wfd-case-assign-role");
		if (uBtn) uBtn.onclick = function() { setDrawerCaseMode("user"); };
		if (rBtn) rBtn.onclick = function() { setDrawerCaseMode("role"); };
	}

	buildConditionRows();
}

function buildConditionRows() {
	if (gDrawerCreateMode) {
		document.getElementById("wf-conditions-list").innerHTML =
			`<div class="wf-cond-row">
				<input class="wf-cond-input" type="text" placeholder="${localise.set["c_no_condition"]}">
			</div>`;
		document.getElementById("wf-conditions").style.display = "";
		return;
	}
	const allRecords = [
		...gEditNotifs.map(function(n) {
			return { id: n.id, tgId: 0, srcName: n.srcSurveyName || localise.set["c_source"], filter: n.filter || "" };
		}),
		...gEditTGs.map(function(tg) {
			return { id: 0, tgId: tg.tgId, srcName: tg.sourceSurveyName || localise.set["c_source"], filter: tg.filter || "" };
		})
	];

	const condList = document.getElementById("wf-conditions-list");
	if (allRecords.length === 0) {
		condList.innerHTML = `<div style="font-size:11px;color:#6c757d;font-style:italic;">${localise.set["c_no_conditions"]}</div>`;
	} else {
		condList.innerHTML = allRecords.map(function(rec) {
			const attr = rec.tgId ? `data-tgid="${rec.tgId}"` : `data-fwdid="${rec.id}"`;
			const fromLabel = allRecords.length > 1 ? `${localise.set["c_source"]}: ${esc(rec.srcName)}` : localise.set["c_condition"];
			return `<div class="wf-cond-row">
				<span class="wf-cond-from">${fromLabel}</span>
				<input class="wf-cond-input" ${attr} type="text"
				       value="${esc(rec.filter)}" placeholder="${localise.set["c_no_condition"]}">
			</div>`;
		}).join("");
	}

	// Advanced link (not shown for SP — no advanced page)
	const type = gEditItem ? gEditItem.dataset.type : "";
	if (type !== "sharepoint_list") {
		const advEl = document.getElementById("wf-drawer-advanced");
		advEl.onclick = null;
		if (gEditNotifs.length > 0) {
			const notif = gEditNotifs[0];
			const url   = "/app/fieldManager/notifications.html?fwd_id=" + notif.id;
			advEl.href  = url;
			const needsSwitch = notif.projectId && notif.projectId !== globals.gCurrentProject;
			if (needsSwitch) {
				advEl.onclick = function(e) {
					e.preventDefault();
					const newTab = window.open("about:blank", "_blank");
					fetch("/surveyKPI/user/currentproject", {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
						body: JSON.stringify({ current_project_id: notif.projectId, current_survey_id: 0, current_task_group_id: 0 })
					}).finally(function() { newTab.location.href = url; });
				};
			}
		} else if (gEditTGs.length > 0) {
			const tg = gEditTGs[0];
			const url = "/app/tasks/taskManagement.html?tg_id=" + tg.tgId;
			advEl.href = url;
			const needsSwitch = tg.projectId && tg.projectId !== globals.gCurrentProject;
			if (needsSwitch) {
				advEl.onclick = function(e) {
					e.preventDefault();
					const newTab = window.open("about:blank", "_blank");
					fetch("/surveyKPI/user/currentproject", {
						method: "POST",
						credentials: "include",
						headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
						body: JSON.stringify({ current_project_id: tg.projectId, current_survey_id: 0, current_task_group_id: 0 })
					}).finally(function() { newTab.location.href = url; });
				};
			}
		}
	}

	document.getElementById("wf-drawer-delete").removeAttribute("title");
}

/*
 * Collect current drawer values and save to server.
 */
function saveDrawer() {
	if (gDrawerCreateMode) { executeCreate(); return; }
	if (!gEditItem || gEditItem.dataset.type === "form") return;
	if (gEditItem.dataset.type === "periodic") { saveScheduled(); return; }

	const type    = gEditItem.dataset.type;
	const name    = (document.getElementById("wfd-name")     || {}).value || "";
	const enabled = (document.getElementById("wfd-enabled")  || { checked: true }).checked;

	// remoteUser: source depends on node type
	let assignee = "";
	if (type === "emailtask") {
		assignee = (document.getElementById("wfd-task-email-to") || {}).value || "";
	} else {
		const caseRoleBtn = document.getElementById("wfd-case-assign-role");
		if (caseRoleBtn && caseRoleBtn.classList.contains("active")) {
			const cRoleId = (document.getElementById("wfd-case-role-select") || {}).value || "";
			assignee = cRoleId ? "_role:" + cRoleId : "";
		} else {
			assignee = (document.getElementById("wfd-case-user-select") || {}).value || "";
		}
	}

	// Task assignee — role id or user id
	let taskRoleId = 0;
	let taskUserId = 0;
	const taskRoleBtn = document.getElementById("wfd-task-assign-role");
	const taskUserBtn = document.getElementById("wfd-task-assign-user");
	if (taskRoleBtn && taskRoleBtn.classList.contains("active")) {
		taskRoleId = parseInt((document.getElementById("wfd-task-role-select") || {}).value || "0", 10);
	} else if (taskUserBtn && taskUserBtn.classList.contains("active")) {
		taskUserId = parseInt((document.getElementById("wfd-task-user-select") || {}).value || "0", 10);
	}

	// Email fields
	const emailTo      = (document.getElementById("wfd-email-to")      || {}).value || null;
	const emailSubject = (document.getElementById("wfd-email-subj")    || {}).value || null;
	const emailContent = (document.getElementById("wfd-email-content") || {}).value || null;

	// SMS fields
	const smsTo      = (document.getElementById("wfd-sms-to")      || {}).value || null;
	const smsMessage = (document.getElementById("wfd-sms-content") || {}).value || null;

	// SharePoint fields
	const spListTitle   = (document.getElementById("wfd-sp-list")         || {}).value || null;
	const spOpEl        = document.querySelector("input[name='wfd-sp-op']:checked");
	const spOperation   = spOpEl ? spOpEl.value : null;
	const spMatchColumn = (document.getElementById("wfd-sp-match-col")    || {}).value || null;
	const spMatchField  = (document.getElementById("wfd-sp-match-field")  || {}).value || null;
	const spColumnMap   = [];
	document.querySelectorAll("#wfd-sp-col-map-body tr").forEach(function(tr) {
		const col   = (tr.querySelector(".wfd-sp-col-sel")   || {}).value;
		const field = (tr.querySelector(".wfd-sp-field-sel") || {}).value;
		if (col && field) spColumnMap.push({ sp_column: col, smap_field: field });
	});

	// Build per-connection filter map from condition inputs
	const filtersByFwdId = {};
	const filtersByTgId  = {};
	document.querySelectorAll(".wf-cond-input").forEach(function(inp) {
		if (inp.dataset.fwdid) filtersByFwdId[inp.dataset.fwdid] = inp.value;
		if (inp.dataset.tgid)  filtersByTgId[inp.dataset.tgid]   = inp.value;
	});

	const promises = [];

	// Build updated notifications list
	if (gEditNotifs.length > 0) {
		const caseSurveyIdent = (document.getElementById("wfd-case-survey") || {}).value || null;
		const updatedNotifs = gEditNotifs.map(function(n) {
			return Object.assign({}, n, {
				name:            name,
				enabled:         enabled,
				remoteUser:      assignee,
				filter:          filtersByFwdId[String(n.id)] !== undefined
				                     ? filtersByFwdId[String(n.id)] : (n.filter || ""),
				emailTo:         emailTo,
				emailSubject:    emailSubject,
				emailContent:    emailContent,
				smsTo:           smsTo,
				smsMessage:      smsMessage,
				caseSurveyIdent: caseSurveyIdent,
				spListTitle:     spListTitle,
				spOperation:     spOperation,
				spMatchColumn:   spMatchColumn,
				spMatchField:    spMatchField,
				spColumnMap:     spColumnMap
			});
		});
		promises.push(
			fetch("/surveyKPI/workflow/edit/notifications", {
				method:      "PUT",
				credentials: "include",
				headers:     { "Content-Type": "application/json" },
				body:        JSON.stringify(updatedNotifs)
			})
		);
	}

	// Build updated task groups list
	if (gEditTGs.length > 0) {
		const taskSurveyEl  = document.getElementById("wfd-task-survey");
		const targetSurveyId = taskSurveyEl ? (parseInt(taskSurveyEl.value, 10) || 0) : 0;
		const updatedTGs = gEditTGs.map(function(tg) {
			const update = {
				name:   name,
				filter: filtersByTgId[String(tg.tgId)] !== undefined
				            ? filtersByTgId[String(tg.tgId)] : (tg.filter || ""),
				roleId: taskRoleId,
				userId: taskUserId,
				remoteUser: type === "emailtask"
				                ? assignee
				                : ((taskRoleId === 0 && taskUserId === 0) ? (tg.remoteUser || "") : "")
			};
			if (targetSurveyId > 0) update.targetSurveyId = targetSurveyId;
			return Object.assign({}, tg, update);
		});
		promises.push(
			fetch("/surveyKPI/workflow/edit/taskgroups", {
				method:      "PUT",
				credentials: "include",
				headers:     { "Content-Type": "application/json" },
				body:        JSON.stringify(updatedTGs)
			})
		);
	}

	addHourglass();
	Promise.all(promises)
		.then(function() {
			closeEditDrawer();
			loadWorkflow();
		})
		.catch(function(err) { console.error("saveDrawer error:", err); })
		.finally(function() { removeHourglass(); });
}

/*
 * Save schedule/label/report changes for a periodic (scheduled) node.
 */
function saveScheduled() {
	const n = gEditNotifs[0];
	if (!n) { closeEditDrawer(); return; }
	const repSel  = document.getElementById("wfd-sched-report");
	const repVal  = repSel ? repSel.value : "";
	const isOps   = (repVal === "ops_summary");
	const repName = repSel ? (repSel.options[repSel.selectedIndex] || {}).text || "" : "";
	const period  = (document.getElementById("wfd-sched-period") || {}).value || "daily";
	const payload = {
		id:               n.id,
		projectId:        n.projectId || (typeof globals !== "undefined" && globals.gCurrentProject) || 0,
		label:            (document.getElementById("wfd-sched-label") || {}).value || "",
		rId:              isOps ? 0 : (parseInt(repVal, 10) || 0),
		reportType:       isOps ? "ops_summary" : "",
		reportName:       repName,
		periodicPeriod:   period,
		periodicTime:     (document.getElementById("wfd-sched-time")     || {}).value || "09:00",
		periodicWeekDay:  parseInt((document.getElementById("wfd-sched-weekday")  || {}).value || "0", 10),
		periodicMonthDay: parseInt((document.getElementById("wfd-sched-monthday") || {}).value || "1", 10),
		periodicMonth:    parseInt((document.getElementById("wfd-sched-month")    || {}).value || "1", 10),
		tz:               (typeof globals !== "undefined" && globals.gTimezone) || "UTC"
	};
	addHourglass();
	fetch("/surveyKPI/workflow/edit/scheduled", {
		method:      "PUT",
		credentials: "include",
		headers:     { "Content-Type": "application/json" },
		body:        JSON.stringify(payload)
	})
		.then(function() { closeEditDrawer(); loadWorkflow(); })
		.catch(function(err) { console.error("saveScheduled error:", err); })
		.finally(function() { removeHourglass(); });
}

/*
 * Show the delete confirm modal, then delete all backing records on confirm.
 */
function deleteFromDrawer() {
	if (!gEditItem) return;
	const totalRecords = gEditNotifs.length + gEditTGs.length;
	const nodeType = gEditItem.dataset.type;
	const nodeName = (gEditItem.querySelector("div > div") || {}).textContent || nodeType;

	const msg = localise.set["t_delete_step_confirm"].replace("{0}", nodeName);
	document.getElementById("wf-delete-msg").textContent = msg;

	const modal = new bootstrap.Modal(document.getElementById("wf-delete-modal"));
	modal.show();

	// Wire confirm button (replace any previous listener)
	const confirmBtn = document.getElementById("wf-delete-confirm");
	const newBtn = confirmBtn.cloneNode(true);
	confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
	newBtn.addEventListener("click", function() {
		modal.hide();
		executeDelete();
	});
}

function executeDelete() {
	const fwdDeletes = gEditNotifs.map(function(n) {
		return fetch(`/surveyKPI/workflow/edit/notification/${n.id}`, {
			method: "DELETE", credentials: "include"
		});
	});
	const tgDeletes = gEditTGs.map(function(tg) {
		return fetch(`/surveyKPI/workflow/edit/taskgroup/${tg.tgId}`, {
			method: "DELETE", credentials: "include"
		});
	});
	const startDeletes = gEditStartIds.map(function(id) {
		return fetch(`/surveyKPI/workflow/edit/form/${id}`, {
			method: "DELETE", credentials: "include"
		});
	});

	addHourglass();
	Promise.all([...fwdDeletes, ...tgDeletes, ...startDeletes])
		.then(function() {
			closeEditDrawer();
			loadWorkflow();
		})
		.catch(function(err) { console.error("executeDelete error:", err); })
		.finally(function() { removeHourglass(); });
}

// ============================================================
// SharePoint drawer helpers
// ============================================================

function spFillSelect(el, options, selectedVal) {
	el.innerHTML = options.map(function(o) {
		const sel = o.val === selectedVal ? " selected" : "";
		return `<option value="${esc(o.val)}"${sel}>${esc(o.text)}</option>`;
	}).join("");
}

function spPopulateDrawerLists(lists, selectedTitle) {
	const el = document.getElementById("wfd-sp-list");
	if (!el) return;
	spFillSelect(el, [{ val: "", text: "-- select --" }].concat(
		lists.map(function(t) { return { val: t, text: t }; })
	), selectedTitle || "");
}

function spPopulateColumns(matchColId, mapBodyId, mapColClass, cols, selectedVal) {
	const opts = [{ val: "", text: "" }].concat(
		cols.map(function(c) { return { val: c.internalName, text: c.displayName }; })
	);
	const matchEl = document.getElementById(matchColId);
	if (matchEl) spFillSelect(matchEl, opts, selectedVal || "");
	document.querySelectorAll("#" + mapBodyId + " ." + mapColClass).forEach(function(sel) {
		spFillSelect(sel, opts, sel.value);
	});
}

function spPopulateFields(matchFieldId, mapBodyId, mapFieldClass, fields, selectedVal) {
	const opts = [{ val: "", text: "" }].concat(
		fields.map(function(f) { return { val: f.name, text: f.name }; })
	);
	const matchEl = document.getElementById(matchFieldId);
	if (matchEl) spFillSelect(matchEl, opts, selectedVal || "");
	document.querySelectorAll("#" + mapBodyId + " ." + mapFieldClass).forEach(function(sel) {
		spFillSelect(sel, opts, sel.value);
	});
}

function spPopulateDrawerColumns(cols, selectedVal) {
	spPopulateColumns("wfd-sp-match-col", "wfd-sp-col-map-body", "wfd-sp-col-sel", cols, selectedVal);
}

function spPopulateDrawerFields(fields, selectedVal) {
	spPopulateFields("wfd-sp-match-field", "wfd-sp-col-map-body", "wfd-sp-field-sel", fields, selectedVal);
}

function spAddMapRow(tbody, colClass, fieldClass, cols, fields, spVal, smapVal) {
	const colOpts = [{ val: "", text: "" }].concat(
		(Array.isArray(cols) && cols.length && cols[0].internalName !== undefined
			? cols.map(function(c) { return { val: c.internalName, text: c.displayName }; })
			: cols.map(function(c) { return { val: c.val, text: c.text }; }))
	);
	const fieldOpts = [{ val: "", text: "" }].concat(
		(Array.isArray(fields) && fields.length && fields[0].name !== undefined
			? fields.map(function(f) { return { val: f.name, text: f.name }; })
			: fields.map(function(f) { return { val: f.val, text: f.text }; }))
	);

	const colSel = document.createElement("select");
	colSel.className = "form-select form-select-sm " + colClass;
	spFillSelect(colSel, colOpts, spVal);

	const fieldSel = document.createElement("select");
	fieldSel.className = "form-select form-select-sm " + fieldClass;
	spFillSelect(fieldSel, fieldOpts, smapVal);

	const delBtn = document.createElement("button");
	delBtn.type = "button";
	delBtn.className = "btn btn-sm btn-danger";
	delBtn.textContent = "×";
	delBtn.addEventListener("click", function() { delBtn.closest("tr").remove(); });

	const tr = document.createElement("tr");
	[colSel, fieldSel, delBtn].forEach(function(el) {
		const td = document.createElement("td");
		td.appendChild(el);
		tr.appendChild(td);
	});
	tbody.appendChild(tr);
}

function spAddDrawerMapRow(cols, fields, spVal, smapVal) {
	spAddMapRow(document.getElementById("wfd-sp-col-map-body"),
		"wfd-sp-col-sel", "wfd-sp-field-sel", cols, fields, spVal, smapVal);
}

function fetchSurveys() {
	if (gSurveys !== null) return Promise.resolve(gSurveys);
	return fetch("/surveyKPI/workflow/edit/surveys", { credentials: "include", cache: "no-store" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gSurveys = d; return d; });
}

let gSpLists   = null;   // cached SP list titles
let gSpColumns = null;   // cached SP column defs for currently selected list
let gSpFields  = null;   // cached survey field names for the current SP drawer/modal

function fetchSpLists() {
	if (gSpLists !== null) return Promise.resolve(gSpLists);
	return fetch("/surveyKPI/sharepoint/lists", { credentials: "include" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gSpLists = d || []; return gSpLists; });
}

function fetchSpColumns(listTitle) {
	if (!listTitle) return Promise.resolve([]);
	return fetch("/surveyKPI/server/sharepoint/lists/" + encodeURIComponent(listTitle) + "/fields",
		{ credentials: "include" })
		.then(function(r) { return r.ok ? r.json() : []; })
		.then(function(d) { gSpColumns = Array.isArray(d) ? d : []; return gSpColumns; });
}

function fetchSurveyFields(sId) {
	if (!sId) return Promise.resolve([]);
	return fetch("/surveyKPI/questionList/" + sId + "/none", { credentials: "include" })
		.then(function(r) { return r.ok ? r.json() : []; })
		.then(function(d) { return d || []; });
}

function fetchUsers() {
	if (gUsers !== null) return Promise.resolve(gUsers);
	return fetch("/surveyKPI/userList", { credentials: "include" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gUsers = d; return d; });
}

function fetchRoles() {
	if (gRoles !== null) return Promise.resolve(gRoles);
	return fetch("/surveyKPI/role/roles/names", { credentials: "include", cache: "no-store" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gRoles = d || []; return gRoles; });
}

function fillRoleSelect(el, roles, selectedId) {
	el.innerHTML = roles.map(function(r) {
		const sel = String(r.id) === String(selectedId) ? " selected" : "";
		return `<option value="${r.id}"${sel}>${esc(r.name)}</option>`;
	}).join("");
}

function openAddDialog() {
	gDrawerCreateMode = true;
	gEditItem         = null;
	gEditNotifs       = [];
	gEditTGs          = [];
	gEditStartIds     = [];
	// A scheduled (periodic) trigger already owns its email step; edit that node
	// to set recipients rather than adding further steps from the trigger.
	if (gSelectedNode && gSelectedNode.dataset.type === "periodic") {
		alert(localise.set["t_sched_edit_email"]);
		return;
	}
	gCreateType       = gSelectedNode ? "task" : "form";
	renderDrawerContent(gCreateType);
	document.getElementById("wf-drawer").classList.add("open");
}

function executeCreate() {
	addHourglass();
	let url, payload;
	const type = gCreateType;
	const knownIds = new Set(Object.keys(gPositions));

	if (type === "form") {
		const sel = document.getElementById("wfd-form-survey");
		const sIdent = sel ? sel.options[sel.selectedIndex] && sel.options[sel.selectedIndex].value : null;
		if (!sIdent) { removeHourglass(); alert(localise.set["t_select_survey"]); return; }
		url     = "/surveyKPI/workflow/edit/form";
		payload = { sIdent: sIdent };
	} else if (type === "scheduled") {
		const repSel = document.getElementById("wfd-sched-report");
		const repVal = repSel ? repSel.value : "";
		if (!repVal) { removeHourglass(); alert(localise.set["t_select_report"]); return; }
		const repName = repSel ? (repSel.options[repSel.selectedIndex] || {}).text || "" : "";
		const isOps = (repVal === "ops_summary");
		const period = (document.getElementById("wfd-sched-period") || {}).value || "daily";
		url     = "/surveyKPI/workflow/edit/scheduled";
		payload = {
			projectId:        (typeof globals !== "undefined" && globals.gCurrentProject) || 0,
			label:            (document.getElementById("wfd-sched-label") || {}).value || "",
			rId:              isOps ? 0 : (parseInt(repVal, 10) || 0),
			reportType:       isOps ? "ops_summary" : "",
			reportName:       repName,
			periodicPeriod:   period,
			periodicTime:     (document.getElementById("wfd-sched-time")     || {}).value || "09:00",
			periodicWeekDay:  parseInt((document.getElementById("wfd-sched-weekday")  || {}).value || "0", 10),
			periodicMonthDay: parseInt((document.getElementById("wfd-sched-monthday") || {}).value || "1", 10),
			periodicMonth:    parseInt((document.getElementById("wfd-sched-month")    || {}).value || "1", 10),
			tz:               (typeof globals !== "undefined" && globals.gTimezone) || "UTC"
		};
	} else if (type === "task" || type === "emailtask") {
		const sourceSurveyId = gTriggerSurveyId || findAncestorSurveyId(gSelectedNode.dataset.id);
		const name = (document.getElementById("wfd-name") || {}).value || "";
		const filter = ((document.querySelector(".wf-cond-input") || {}).value || "").trim();
		if (!name) { removeHourglass(); alert(localise.set["t_enter_label"]); return; }
		const taskSurveyEl = document.getElementById("wfd-task-survey");
		const targetSurveyId = taskSurveyEl ? (parseInt(taskSurveyEl.value, 10) || 0) : 0;
		if (!targetSurveyId) { removeHourglass(); alert(localise.set["t_select_task_survey"]); return; }
		url     = "/surveyKPI/workflow/edit/taskgroup";
		payload = {
			sourceSurveyId: sourceSurveyId,
			targetSurveyId: targetSurveyId,
			name:           name,
			filter:         filter || null,
			wfPrevNodeId:   gSelectedNode ? gSelectedNode.dataset.id : null
		};
		if (type === "emailtask") {
			// emailtask is a task group whose assignee is an email address (remote user)
			payload.remoteUser = (document.getElementById("wfd-task-email-to") || {}).value || null;
		} else {
			const roleBtn = document.getElementById("wfd-task-assign-role");
			const userBtn = document.getElementById("wfd-task-assign-user");
			if (roleBtn && roleBtn.classList.contains("active")) {
				const roleId = parseInt((document.getElementById("wfd-task-role-select") || {}).value || "0", 10);
				if (roleId > 0) payload.roleId = roleId;
			} else if (userBtn && userBtn.classList.contains("active")) {
				const userId = parseInt((document.getElementById("wfd-task-user-select") || {}).value || "0", 10);
				if (userId > 0) payload.userId = userId;
			}
		}
	} else {
		const name   = (document.getElementById("wfd-name") || {}).value || "";
		const filter = ((document.querySelector(".wf-cond-input") || {}).value || "").trim();
		if (!name) { removeHourglass(); alert(localise.set["t_enter_label"]); return; }
		const isBundle  = (document.getElementById("wfd-bundle") || {}).checked || false;
		const enabled   = (document.getElementById("wfd-enabled") || { checked: true }).checked;
		const effectiveSurveyId = gTriggerSurveyId || findAncestorSurveyId(gSelectedNode.dataset.id);
		url     = "/surveyKPI/workflow/edit/notification";
		payload = {
			srcSurveyId:  effectiveSurveyId,
			target:       type === "case" ? "escalate" : type,
			name:         name,
			filter:       filter || null,
			enabled:      enabled,
			bundle:       isBundle,
			wfPrevNodeId: gSelectedNode ? gSelectedNode.dataset.id : null
		};
		if (type === "case" || type === "reference") {
			const roleBtn = document.getElementById("wfd-case-assign-role");
			if (roleBtn && roleBtn.classList.contains("active")) {
				const roleId = parseInt((document.getElementById("wfd-case-role-select") || {}).value || "0", 10);
				if (roleId > 0) payload.remoteUser = "_role:" + roleId;
			} else {
				payload.remoteUser = (document.getElementById("wfd-case-user-select") || {}).value || null;
			}
			payload.caseSurveyIdent = (document.getElementById("wfd-case-survey") || {}).value || null;
		}
		if (type === "email") {
			payload.emailTo      = (document.getElementById("wfd-email-to")      || {}).value || null;
			payload.emailSubject = (document.getElementById("wfd-email-subj")    || {}).value || null;
			payload.emailContent = (document.getElementById("wfd-email-content") || {}).value || null;
		}
		if (type === "sms") {
			payload.smsTo      = (document.getElementById("wfd-sms-to")      || {}).value || null;
			payload.smsMessage = (document.getElementById("wfd-sms-content") || {}).value || null;
		}
		if (type === "sharepoint_list") {
			const spOpEl = document.querySelector("input[name='wfd-sp-op']:checked");
			payload.spListTitle   = (document.getElementById("wfd-sp-list")         || {}).value || null;
			payload.spOperation   = spOpEl ? spOpEl.value : "insert";
			if (payload.spOperation === "update") {
				payload.spMatchColumn = (document.getElementById("wfd-sp-match-col")   || {}).value || null;
				payload.spMatchField  = (document.getElementById("wfd-sp-match-field") || {}).value || null;
			}
			const spMap = [];
			document.querySelectorAll("#wfd-sp-col-map-body tr").forEach(function(tr) {
				const col   = (tr.querySelector(".wfd-sp-col-sel")   || {}).value;
				const field = (tr.querySelector(".wfd-sp-field-sel") || {}).value;
				if (col && field) spMap.push({ sp_column: col, smap_field: field });
			});
			payload.spColumnMap = spMap.length ? spMap : null;
		}
	}

	fetch(url, {
		method:      "POST",
		credentials: "include",
		headers:     { "Content-Type": "application/json" },
		body:        JSON.stringify(payload)
	})
	.then(function(resp) {
		if (!resp.ok) throw new Error(resp.statusText);
		closeEditDrawer();
		loadWorkflow(function() { positionNewFormItems(knownIds); });
	})
	.catch(function(err) { console.error("executeCreate error:", err); })
	.finally(function() { removeHourglass(); });
}

// ============================================================
// Utility
// ============================================================

function esc(s) { return htmlEncode(s) || ""; }

// ============================================================
// Bootstrap
// ============================================================

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem("user_locale") || navigator.language;
	} catch(e) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function() {
	window.localise = localise;

	$(document).ready(function() {
		localise.setlang();
		setupUserProfile();
		getLoggedInUser(loadWorkflow, false, false, undefined);

		// Navbar actions
		$("#m_refresh").on("click",      function(e) { e.preventDefault(); loadWorkflow(); });
		$("#m_reset_layout").on("click", function(e) { e.preventDefault(); resetLayout(); });

		// Highlight dropdown
		$(document).on("click", "[data-highlight]", function(e) {
			e.preventDefault();
			gHighlight = $(this).data("highlight");
			$("[data-highlight]").removeClass("active");
			$(this).addClass("active");
			applyHighlight();
		});

		// Edit drawer close / save / delete
		document.getElementById("wf-drawer-close").addEventListener("click",  closeEditDrawer);
		document.getElementById("wf-drawer-save").addEventListener("click",   saveDrawer);
		document.getElementById("wf-drawer-delete").addEventListener("click", deleteFromDrawer);

		// Deselect node when clicking anywhere on the canvas that isn't a node card
		document.getElementById("workflow-canvas").addEventListener("click", function(e) {
			if (!e.target.closest("#wf-nodes [data-id]")) selectNode(null);
		});

		// Add Step button — opens drawer in create mode
		document.getElementById("wf-add-btn").addEventListener("click", openAddDialog);
	});
});
