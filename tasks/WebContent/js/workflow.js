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
let gAddType    = "task"; // currently selected type in Add Step modal

// Add-step trigger state
let gSelectedNode    = null; // card element selected as trigger for new step
let gTriggerSurveyId = 0;   // survey ID parsed from selected node

// Fixed colours per node type (used when highlight = "type")
const TYPE_COLOURS = {
	form:             "#4a90d9",
	task:             "#27ae60",
	"case":           "#e67e22",
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
	"case":          "fas fa-file-alt",
	periodic:        "fas fa-clock",
	reminder:        "fas fa-bell",
	email:           "fas fa-envelope",
	sms:             "fas fa-comment-alt",
	decision:        "fas fa-filter",
	sharepoint_list: "fas fa-table"
};

// Types that get an edit button on their card
const EDITABLE_TYPES = ["task", "case", "email", "sms", "sharepoint_list"];

// Localised label per workitem type
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
		decision:        l["c_decision"] || "Decision",
		sharepoint_list: l["c_sharepoint_list"] || "SharePoint List"
	};
	return labels[type] || type;
}

/*
 * Parse the survey ID out of a composite node ID.
 * Node ID formats: "form:s:123", "task:s:456:a:user@x.com", "case:s:789:a:..."
 */
function surveyIdFromNodeId(nodeId) {
	return parseInt((nodeId || "").split(":")[2], 10) || 0;
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
		badge.title     = "Add step from this node";
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
	div.dataset.fwdIds    = JSON.stringify(item.fwdIds    || []);
	div.dataset.tgIds     = JSON.stringify(item.tgIds     || []);
	div.dataset.startIds  = JSON.stringify(item.startIds  || []);

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
		+ `<span style="font-size:12px;color:${isDecision ? "#854d0e" : "#6c757d"};font-weight:600;">${label}</span>`;

	// Edit button for editable node types and decision nodes
	if (isEditable || isDecision) {
		const editBtn = document.createElement("button");
		editBtn.className = "wf-node-edit-btn";
		editBtn.title = "Edit";
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

	const hasAssignee = (item.type === "task" || item.type === "case") && item.assignee;

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
	const labels = { type: "Type", project: "Project", bundle: "Bundle" };
	let html = `<div style="font-weight:700;margin-bottom:8px;color:#495057;">${labels[gHighlight] || gHighlight}</div>`;
	const entries = Object.entries(colourMap);
	if (entries.length === 0) {
		html += `<div style="color:#6c757d;font-style:italic;">No data</div>`;
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

function loadWorkflow() {
	addHourglass();
	fetch("/surveyKPI/workflow/items", { credentials: "include", cache: "no-store" })
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

// ============================================================
// Edit drawer
// ============================================================

/*
 * Open the edit drawer for the given node card element.
 * Fetches notification / task-group detail from the server.
 */
function openEditDrawer(cardEl) {
	gEditItem   = cardEl;
	gEditNotifs = [];
	gEditTGs    = [];

	const fwdIds   = JSON.parse(cardEl.dataset.fwdIds   || "[]");
	const tgIds    = JSON.parse(cardEl.dataset.tgIds    || "[]");
	const startIds = JSON.parse(cardEl.dataset.startIds || "[]");
	const type     = cardEl.dataset.type;
	gEditStartIds  = startIds;

	const promises = [];
	if (fwdIds.length > 0) {
		promises.push(
			fetch(`/surveyKPI/workflow/edit/notifications?ids=${fwdIds.join(",")}`, { credentials: "include" })
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
	gEditItem     = null;
	gEditNotifs   = [];
	gEditTGs      = [];
	gEditStartIds = [];
}

/*
 * Render the drawer body and condition list for the given node type.
 * Shared properties come from the first record; per-connection filters
 * are listed individually in the amber Conditions section.
 */
function renderDrawerContent(type) {
	const icon   = TYPE_ICONS[type] || "fas fa-circle";
	const label  = typeLabel(type);
	const colour = TYPE_COLOURS[type] || "#6c757d";

	document.getElementById("wf-drawer-icon").className = icon;
	document.getElementById("wf-drawer-icon").style.color = colour;
	document.getElementById("wf-drawer-title").textContent = label;

	// Form start nodes: read-only, delete only
	if (type === "form") {
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

	// Label field (notification name)
	bodyHtml += `<div class="wf-field">
		<label>Label</label>
		<input id="wfd-name" type="text" value="${esc(name)}">
	</div>`;

	if (type === "task") {
		const targetSurveyId = firstTG ? firstTG.targetSurveyId : 0;
		bodyHtml += `<div class="wf-field">
			<label>Task survey</label>
			<select id="wfd-task-survey" data-current="${targetSurveyId}">
				<option value="">Loading…</option>
			</select>
		</div>`;
	}

	if (type === "case") {
		bodyHtml += `<div class="wf-field">
			<label>Assign to</label>
			<input id="wfd-assignee" type="text" value="${esc(remoteUser)}"
			       placeholder="_submitter, _data, or email address">
		</div>`;
	}

	if (type === "email") {
		const emailTo      = (firstNotif && firstNotif.emailTo)      || "";
		const emailSubject = (firstNotif && firstNotif.emailSubject)  || "";
		const emailContent = (firstNotif && firstNotif.emailContent)  || "";
		bodyHtml += `
		<div class="wf-field"><label>To (emails)</label>
			<input id="wfd-email-to" type="text" value="${esc(emailTo)}" placeholder="comma-separated">
		</div>
		<div class="wf-field"><label>Subject</label>
			<input id="wfd-email-subj" type="text" value="${esc(emailSubject)}">
		</div>
		<div class="wf-field"><label>Message</label>
			<textarea id="wfd-email-content">${esc(emailContent)}</textarea>
		</div>`;
	}

	if (type === "sms") {
		const smsTo      = (firstNotif && firstNotif.smsTo)      || "";
		const smsMessage = (firstNotif && firstNotif.smsMessage) || "";
		bodyHtml += `
		<div class="wf-field"><label>To (phone)</label>
			<input id="wfd-sms-to" type="text" value="${esc(smsTo)}">
		</div>
		<div class="wf-field"><label>Message</label>
			<textarea id="wfd-sms-content">${esc(smsMessage)}</textarea>
		</div>`;
	}

	if (type === "sharepoint_list") {
		const spOp = (firstNotif && firstNotif.spOperation) || "insert";
		bodyHtml += `
		<div class="wf-field">
			<label>List</label>
			<select id="wfd-sp-list"><option value="">Loading…</option></select>
		</div>
		<div class="wf-field">
			<label>Operation</label>
			<div>
				<div class="form-check form-check-inline">
					<input class="form-check-input" type="radio" name="wfd-sp-op" id="wfd-sp-op-insert" value="insert" ${spOp !== "update" ? "checked" : ""}>
					<label class="form-check-label" for="wfd-sp-op-insert">Insert</label>
				</div>
				<div class="form-check form-check-inline">
					<input class="form-check-input" type="radio" name="wfd-sp-op" id="wfd-sp-op-update" value="update" ${spOp === "update" ? "checked" : ""}>
					<label class="form-check-label" for="wfd-sp-op-update">Update or Insert</label>
				</div>
			</div>
		</div>
		<div id="wfd-sp-match-section" style="${spOp === "update" ? "" : "display:none;"}">
			<div class="wf-field">
				<label>Match SP column</label>
				<select id="wfd-sp-match-col"><option value="">Loading…</option></select>
			</div>
			<div class="wf-field">
				<label>Match survey field</label>
				<select id="wfd-sp-match-field"><option value="">Loading…</option></select>
			</div>
		</div>
		<div class="wf-field">
			<label>Column map</label>
			<table class="table table-sm table-bordered" style="font-size:12px;">
				<thead><tr>
					<th>SP column</th><th>Survey field</th><th></th>
				</tr></thead>
				<tbody id="wfd-sp-col-map-body"></tbody>
			</table>
			<button type="button" id="wfd-sp-add-row" class="btn btn-sm btn-secondary">+ Add row</button>
		</div>`;
		document.getElementById("wf-drawer-body").innerHTML = bodyHtml;

		// Load lists, columns, and survey fields in parallel then wire up
		const savedNotif = firstNotif || {};
		const srcSurveyId = savedNotif.srcSurveyId || 0;
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
		buildConditionRows();
		return;   // body already set — skip the generic innerHTML assignment below
	}

	// Enabled toggle (not shown for task groups — use Advanced)
	if (gEditNotifs.length > 0) {
		bodyHtml += `<div class="wf-field wf-field-inline">
			<label>Enabled</label>
			<input id="wfd-enabled" type="checkbox" ${enabled ? "checked" : ""}>
		</div>`;
	} else {
		bodyHtml += `<div style="font-size:11px;color:#6c757d;margin-top:4px;">
			To change assignee use <strong>Advanced</strong> below.
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
				taskSurveyEl.innerHTML = "<option value=''>No surveys available</option>";
			}
		});
	}

	buildConditionRows();
}

function buildConditionRows() {
	const allRecords = [
		...gEditNotifs.map(function(n) {
			return { id: n.id, tgId: 0, srcName: n.srcSurveyName || "Source", filter: n.filter || "" };
		}),
		...gEditTGs.map(function(tg) {
			return { id: 0, tgId: tg.tgId, srcName: tg.sourceSurveyName || "Source", filter: tg.filter || "" };
		})
	];

	const condList = document.getElementById("wf-conditions-list");
	if (allRecords.length === 0) {
		condList.innerHTML = `<div style="font-size:11px;color:#6c757d;font-style:italic;">No conditions</div>`;
	} else {
		condList.innerHTML = allRecords.map(function(rec) {
			const attr = rec.tgId ? `data-tgid="${rec.tgId}"` : `data-fwdid="${rec.id}"`;
			const fromLabel = allRecords.length > 1 ? `From: ${esc(rec.srcName)}` : "Condition";
			return `<div class="wf-cond-row">
				<span class="wf-cond-from">${fromLabel}</span>
				<input class="wf-cond-input" ${attr} type="text"
				       value="${esc(rec.filter)}" placeholder="No condition (always run)">
			</div>`;
		}).join("");
	}

	// Advanced link (not shown for SP — no advanced page)
	const type = gEditItem ? gEditItem.dataset.type : "";
	if (type !== "sharepoint_list") {
		const hasNotifs = gEditNotifs.length > 0;
		document.getElementById("wf-drawer-advanced").href = hasNotifs
			? "/app/fieldManager/notifications.html"
			: "/app/tasks/taskManagement.html";
	}

	// Delete button label with count
	const totalRecords = gEditNotifs.length + gEditTGs.length;
	document.getElementById("wf-drawer-delete").title =
		`Delete ${totalRecords} record(s) that back this step`;
}

/*
 * Collect current drawer values and save to server.
 */
function saveDrawer() {
	if (!gEditItem || gEditItem.dataset.type === "form") return;

	const name    = (document.getElementById("wfd-name")     || {}).value || "";
	const enabled = (document.getElementById("wfd-enabled")  || { checked: true }).checked;
	const assignee = (document.getElementById("wfd-assignee") || {}).value || "";

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
		const updatedNotifs = gEditNotifs.map(function(n) {
			return Object.assign({}, n, {
				name:         name,
				enabled:      enabled,
				remoteUser:   assignee,
				filter:       filtersByFwdId[String(n.id)] !== undefined
				                  ? filtersByFwdId[String(n.id)] : (n.filter || ""),
				emailTo:      emailTo,
				emailSubject: emailSubject,
				emailContent: emailContent,
				smsTo:        smsTo,
				smsMessage:   smsMessage,
				spListTitle:   spListTitle,
				spOperation:   spOperation,
				spMatchColumn: spMatchColumn,
				spMatchField:  spMatchField,
				spColumnMap:   spColumnMap
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
				            ? filtersByTgId[String(tg.tgId)] : (tg.filter || "")
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
 * Show the delete confirm modal, then delete all backing records on confirm.
 */
function deleteFromDrawer() {
	if (!gEditItem) return;
	const totalRecords = gEditNotifs.length + gEditTGs.length;
	const nodeType = gEditItem.dataset.type;
	const nodeName = (gEditItem.querySelector("div > div") || {}).textContent || nodeType;

	const msg = `This will permanently delete ${totalRecords} notification(s) `
		+ `that back the "${nodeName}" step. This cannot be undone.`;
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
// Add Step
// ============================================================

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

function spPopulateModalColumns(cols, selectedVal) {
	spPopulateColumns("wf-add-sp-match-col", "wf-add-sp-col-map-body", "wf-add-sp-col-sel", cols, selectedVal);
}

function spPopulateModalFields(fields, selectedVal) {
	spPopulateFields("wf-add-sp-match-field", "wf-add-sp-col-map-body", "wf-add-sp-field-sel", fields, selectedVal);
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

function spAddModalMapRow(cols, fields, spVal, smapVal) {
	spAddMapRow(document.getElementById("wf-add-sp-col-map-body"),
		"wf-add-sp-col-sel", "wf-add-sp-field-sel", cols, fields, spVal, smapVal);
}

function fetchSurveys() {
	if (gSurveys !== null) return Promise.resolve(gSurveys);
	return fetch("/surveyKPI/workflow/edit/surveys", { credentials: "include" })
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
		.then(function(r) { return r.json(); })
		.then(function(d) { return d || []; });
}

function fetchUsers() {
	if (gUsers !== null) return Promise.resolve(gUsers);
	return fetch("/surveyKPI/userList", { credentials: "include" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gUsers = d; return d; });
}

function openAddDialog() {
	gAddType = "form";

	// Show trigger name (only relevant for non-form types)
	const triggerNameEl = document.getElementById("wf-add-trigger-name");
	if (triggerNameEl) {
		triggerNameEl.textContent = gSelectedNode
			? (gSelectedNode.dataset.name || gSelectedNode.dataset.id)
			: "(select a node on the canvas first)";
	}

	// Reset modal fields
	document.getElementById("wf-add-name").value        = "";
	document.getElementById("wf-add-assignee").value    = "";
	document.getElementById("wf-add-task-email").value  = "";
	document.getElementById("wf-add-filter").value      = "";
	document.getElementById("wf-add-bundle").checked    = false;
	document.getElementById("wf-add-sp-list").value     = "";
	document.getElementById("wf-add-sp-op-insert").checked = true;
	document.getElementById("wf-add-sp-match-section").style.display = "none";
	document.getElementById("wf-add-sp-col-map-body").innerHTML = "";
	document.getElementById("wf-add-assignee-select").value = "-1";
	["email", "subject", "content"].forEach(function(s) {
		const el = document.getElementById("wf-add-email-" + s);
		if (el) el.value = "";
	});
	["to", "content"].forEach(function(s) {
		const el = document.getElementById("wf-add-sms-" + s);
		if (el) el.value = "";
	});

	// Show only relevant type buttons based on whether a trigger node is selected
	const hasSelected = !!gSelectedNode;
	document.querySelectorAll(".wf-type-btn").forEach(function(btn) {
		const isForm = btn.dataset.type === "form";
		btn.style.display = (isForm === !hasSelected) ? "" : "none";
	});

	// Default to appropriate type
	const defaultType = hasSelected ? "task" : "form";
	document.querySelectorAll(".wf-type-btn").forEach(function(btn) {
		btn.classList.toggle("active", btn.dataset.type === defaultType);
	});
	updateAddDialogFields(defaultType);

	// Populate target survey dropdown
	const targetEl = document.getElementById("wf-add-target");
	if (targetEl) {
		targetEl.innerHTML = "<option value=''>Loading…</option>";
		fetchSurveys().then(function(surveys) {
			targetEl.innerHTML = surveys.map(function(s) {
				return `<option value="${s.sId}" data-ident="${esc(s.ident)}" data-pid="${s.projectId}">${esc(s.projectName)} / ${esc(s.name)}</option>`;
			}).join("");
			if (surveys.length === 0) {
				targetEl.innerHTML = "<option value=''>No surveys available</option>";
			}
		});
	}

	// Populate user assignee select
	const assignSelEl = document.getElementById("wf-add-assignee-select");
	if (assignSelEl) {
		fetchUsers().then(function(users) {
			// Keep the fixed options (-1, -2) and replace any user options after them
			while (assignSelEl.options.length > 2) assignSelEl.remove(2);
			users.forEach(function(u) {
				const opt = document.createElement("option");
				opt.value       = u.id;
				opt.textContent = u.name;
				assignSelEl.appendChild(opt);
			});
		});
	}

	new bootstrap.Modal(document.getElementById("wf-add-modal")).show();
}

function updateAddDialogFields(type) {
	gAddType = type;
	const isForm        = (type === "form");
	const isTask        = (type === "task");
	const isTaskGroup   = (type === "task" || type === "emailtask");
	const isEmailTask   = (type === "emailtask");
	const isEscalate    = (type === "escalate");
	const isEmail       = (type === "email");
	const isSms         = (type === "sms");
	const isSP          = (type === "sharepoint_list");
	document.getElementById("wf-add-trigger-row").style.display         = isForm                        ? "none" : "";
	document.getElementById("wf-add-name-row").style.display            = isForm                        ? "none" : "";
	document.getElementById("wf-add-filter-row").style.display          = isForm                        ? "none" : "";
	document.getElementById("wf-add-assignee-select-row").style.display = isTask                        ? "" : "none";
	document.getElementById("wf-add-assignee-row").style.display        = isEscalate                    ? "" : "none";
	document.getElementById("wf-add-task-email-row").style.display      = isEmailTask                   ? "" : "none";
	document.getElementById("wf-add-email-rows").style.display          = isEmail                       ? "" : "none";
	document.getElementById("wf-add-sms-rows").style.display            = isSms                         ? "" : "none";
	document.getElementById("wf-add-target-row").style.display          = (isForm || isTaskGroup)        ? "" : "none";
	document.getElementById("wf-add-bundle-row").style.display          = (isForm || isTaskGroup || isSP) ? "none" : "";
	document.getElementById("wf-add-sp-rows").style.display             = isSP                           ? "" : "none";
	const targetLabel = document.getElementById("wf-add-target-label");
	if (targetLabel) targetLabel.textContent = isForm ? "Form survey" : "Task survey";

	if (isSP) {
		const srcSurveyId = gTriggerSurveyId || 0;
		addHourglass();
		Promise.all([fetchSpLists(), fetchSurveyFields(srcSurveyId)])
			.then(function(results) {
				gSpFields = results[1];
				spPopulateModalColumns([], null);
				spPopulateModalFields(gSpFields, null);
				const listEl = document.getElementById("wf-add-sp-list");
				listEl.innerHTML = '<option value="">-- select --</option>'
					+ results[0].map(function(t) {
						return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
					}).join("");
			})
			.finally(function() { removeHourglass(); });

		// Wire list change → reload columns (once, replacing previous handler)
		const listEl = document.getElementById("wf-add-sp-list");
		listEl.onchange = function() {
			const title = this.value;
			if (!title) return;
			gSpColumns = null;
			addHourglass();
			fetchSpColumns(title)
				.then(function(cols) { spPopulateModalColumns(cols, null); })
				.finally(function() { removeHourglass(); });
		};

		// Wire operation radio → show/hide match section
		document.querySelectorAll("input[name='wf-add-sp-op']").forEach(function(r) {
			r.onchange = function() {
				document.getElementById("wf-add-sp-match-section").style.display =
					this.value === "update" ? "" : "none";
			};
		});

		// Wire add-row button
		document.getElementById("wf-add-sp-add-row").onclick = function() {
			spAddModalMapRow(gSpColumns || [], gSpFields || [], "", "");
		};
	}
}

function submitAddStep() {
	addHourglass();

	let url, payload;

	if (gAddType === "form") {
		const targetEl   = document.getElementById("wf-add-target");
		const selectedOpt = targetEl && targetEl.options[targetEl.selectedIndex];
		const sIdent = selectedOpt ? selectedOpt.dataset.ident : null;
		if (!sIdent) {
			removeHourglass();
			alert("Please select a survey.");
			return;
		}
		url     = "/surveyKPI/workflow/edit/form";
		payload = { sIdent: sIdent };
	} else if (gAddType === "task" || gAddType === "emailtask") {
		const srcSurveyId = gTriggerSurveyId;
		if (!srcSurveyId) { removeHourglass(); alert("No trigger node selected."); return; }
		const name   = document.getElementById("wf-add-name").value.trim();
		const filter = document.getElementById("wf-add-filter").value.trim();
		if (!name) { removeHourglass(); alert("Please enter a label for this step."); return; }
		const targetSurveyId = parseInt(document.getElementById("wf-add-target").value, 10) || 0;
		if (!targetSurveyId) {
			removeHourglass();
			alert("Please select a task survey.");
			return;
		}
		url     = "/surveyKPI/workflow/edit/taskgroup";
		payload = {
			sourceSurveyId: srcSurveyId,
			targetSurveyId: targetSurveyId,
			name:           name,
			filter:         filter || null
		};
		if (gAddType === "emailtask") {
			payload.remoteUser = document.getElementById("wf-add-task-email").value.trim() || null;
		} else {
			// task — read from select: -1=unassigned, -2=from data, else user ID
			const selVal = parseInt(document.getElementById("wf-add-assignee-select").value, 10);
			if (selVal === -2) {
				payload.remoteUser = "_data";
			} else if (selVal > 0) {
				payload.userId = selVal;
			}
			// -1 (unassigned) → neither field set
		}
	} else {
		const srcSurveyId = gTriggerSurveyId;
		if (!srcSurveyId) { removeHourglass(); alert("No trigger node selected."); return; }
		const name   = document.getElementById("wf-add-name").value.trim();
		const filter = document.getElementById("wf-add-filter").value.trim();
		if (!name) { removeHourglass(); alert("Please enter a label for this step."); return; }
		const isBundle = document.getElementById("wf-add-bundle").checked;
		url     = "/surveyKPI/workflow/edit/notification";
		payload = {
			srcSurveyId: srcSurveyId,
			target:      gAddType,
			name:        name,
			filter:      filter || null,
			enabled:     true,
			bundle:      isBundle
		};
		if (gAddType === "escalate") {
			payload.remoteUser = document.getElementById("wf-add-assignee").value.trim() || null;
		}
		if (gAddType === "email") {
			payload.emailTo      = document.getElementById("wf-add-email-to").value.trim()      || null;
			payload.emailSubject = document.getElementById("wf-add-email-subj").value.trim()    || null;
			payload.emailContent = document.getElementById("wf-add-email-content").value.trim() || null;
		}
		if (gAddType === "sms") {
			payload.smsTo      = document.getElementById("wf-add-sms-to").value.trim()      || null;
			payload.smsMessage = document.getElementById("wf-add-sms-content").value.trim() || null;
		}
		if (gAddType === "sharepoint_list") {
			const spOpEl = document.querySelector("input[name='wf-add-sp-op']:checked");
			payload.spListTitle = document.getElementById("wf-add-sp-list").value.trim() || null;
			payload.spOperation = spOpEl ? spOpEl.value : "insert";
			if (payload.spOperation === "update") {
				payload.spMatchColumn = document.getElementById("wf-add-sp-match-col").value  || null;
				payload.spMatchField  = document.getElementById("wf-add-sp-match-field").value || null;
			}
			const spMap = [];
			document.querySelectorAll("#wf-add-sp-col-map-body tr").forEach(function(tr) {
				const col   = (tr.querySelector(".wf-add-sp-col-sel")   || {}).value;
				const field = (tr.querySelector(".wf-add-sp-field-sel") || {}).value;
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
		bootstrap.Modal.getInstance(document.getElementById("wf-add-modal")).hide();
		loadWorkflow();
	})
	.catch(function(err) { console.error("submitAddStep error:", err); })
	.finally(function() { removeHourglass(); });
}

// ============================================================
// Utility
// ============================================================

function esc(s) {
	if (!s) return "";
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

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

		// Add Step button + modal
		document.getElementById("wf-add-btn").addEventListener("click", openAddDialog);
		document.getElementById("wf-add-submit").addEventListener("click", submitAddStep);

		// Type selector in Add Step modal
		document.getElementById("wf-add-type-btns").addEventListener("click", function(e) {
			const btn = e.target.closest(".wf-type-btn");
			if (!btn) return;
			document.querySelectorAll(".wf-type-btn").forEach(function(b) { b.classList.remove("active"); });
			btn.classList.add("active");
			updateAddDialogFields(btn.dataset.type);
		});
	});
});
