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
let gEditItem   = null;   // WorkflowItem currently open in drawer
let gEditNotifs = [];     // WorkflowEditNotif[] from server
let gEditTGs    = [];     // WorkflowEditTG[]   from server
let gSurveys    = null;   // cached survey list (null until first fetch)
let gAddType    = "task"; // currently selected type in Add Step modal

// Fixed colours per node type (used when highlight = "type")
const TYPE_COLOURS = {
	form:     "#4a90d9",
	task:     "#27ae60",
	"case":   "#e67e22",
	decision: "#f39c12",
	periodic: "#8e44ad",
	reminder: "#16a085",
	email:    "#e74c3c",
	sms:      "#c0392b"
};

// Palette for dynamic dimensions (project, bundle)
const PALETTE = [
	"#1f78b4","#33a02c","#e31a1c","#ff7f00","#6a3d9a",
	"#b15928","#a6cee3","#b2df8a","#fb9a99","#fdbf6f",
	"#cab2d6","#ffff99"
];

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

// Types that get an edit button on their card
const EDITABLE_TYPES = ["task", "case", "email", "sms"];

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
		decision: l["c_decision"] || "Decision"
	};
	return labels[type] || type;
}

/*
 * Build a node card element positioned at (x, y).
 */
function nodeCard(x, y, item) {
	const icon       = TYPE_ICONS[item.type] || "fas fa-circle";
	const label      = typeLabel(item.type);
	const isDecision = item.role === "decision";
	const isEditable = EDITABLE_TYPES.includes(item.type);

	const div = document.createElement("div");
	div.dataset.id       = item.id;
	div.dataset.role     = item.role     || "";
	div.dataset.type     = item.type     || "";
	div.dataset.project  = item.project  || "";
	div.dataset.bundle   = item.bundle   || "";
	div.dataset.assignee = item.assignee || "";
	div.dataset.fwdIds   = JSON.stringify(item.fwdIds || []);
	div.dataset.tgIds    = JSON.stringify(item.tgIds  || []);

	div.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${CARD_W}px;`
		+ `background:#fff;border-radius:6px;cursor:${isDecision ? "pointer" : "grab"};user-select:none;`
		+ `box-shadow:0 2px 8px rgba(0,0,0,0.12);`
		+ `border:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};overflow:hidden;font-family:sans-serif;`;

	const header = document.createElement("div");
	header.style.cssText = `background:${isDecision ? "#fff3cd" : "#f8f9fa"};`
		+ `border-bottom:1px solid ${isDecision ? "#fd7e14" : "#dee2e6"};`
		+ `height:32px;display:flex;align-items:center;padding:0 8px;gap:7px;`;
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

	const fwdIds = JSON.parse(cardEl.dataset.fwdIds || "[]");
	const tgIds  = JSON.parse(cardEl.dataset.tgIds  || "[]");
	const type   = cardEl.dataset.type;

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
	gEditItem   = null;
	gEditNotifs = [];
	gEditTGs    = [];
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

	if (type === "task" || type === "case") {
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

	// Build per-connection condition rows (amber section)
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

	// Advanced link
	const hasNotifs = gEditNotifs.length > 0;
	const advUrl = hasNotifs
		? "/app/fieldManager/notifications.html"
		: "/app/tasks/taskManagement.html";
	document.getElementById("wf-drawer-advanced").href = advUrl;

	// Delete button label with count
	const totalRecords = gEditNotifs.length + gEditTGs.length;
	const deleteBtn = document.getElementById("wf-drawer-delete");
	deleteBtn.title = `Delete ${totalRecords} record(s) that back this step`;
}

/*
 * Collect current drawer values and save to server.
 */
function saveDrawer() {
	if (!gEditItem) return;

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
				smsMessage:   smsMessage
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
		const updatedTGs = gEditTGs.map(function(tg) {
			return Object.assign({}, tg, {
				name:   name,
				filter: filtersByTgId[String(tg.tgId)] !== undefined
				            ? filtersByTgId[String(tg.tgId)] : (tg.filter || "")
			});
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

	addHourglass();
	Promise.all([...fwdDeletes, ...tgDeletes])
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

function fetchSurveys() {
	if (gSurveys !== null) return Promise.resolve(gSurveys);
	return fetch("/surveyKPI/workflow/edit/surveys", { credentials: "include" })
		.then(function(r) { return r.json(); })
		.then(function(d) { gSurveys = d; return d; });
}

function openAddDialog() {
	gAddType = "task";

	// Reset modal fields
	document.getElementById("wf-add-name").value    = "";
	document.getElementById("wf-add-assignee").value = "";
	document.getElementById("wf-add-filter").value   = "";
	["email", "subject", "content"].forEach(function(s) {
		const el = document.getElementById("wf-add-email-" + s);
		if (el) el.value = "";
	});
	["to", "content"].forEach(function(s) {
		const el = document.getElementById("wf-add-sms-" + s);
		if (el) el.value = "";
	});

	// Set type buttons
	document.querySelectorAll(".wf-type-btn").forEach(function(btn) {
		btn.classList.toggle("active", btn.dataset.type === "task");
	});
	updateAddDialogFields("task");

	// Populate source survey dropdown
	const sourceEl = document.getElementById("wf-add-source");
	sourceEl.innerHTML = "<option value=''>Loading…</option>";

	fetchSurveys().then(function(surveys) {
		sourceEl.innerHTML = surveys.map(function(s) {
			return `<option value="${s.sId}" data-pid="${s.projectId}">${esc(s.projectName)} / ${esc(s.name)}</option>`;
		}).join("");
		if (surveys.length === 0) {
			sourceEl.innerHTML = "<option value=''>No surveys available</option>";
		}
	});

	new bootstrap.Modal(document.getElementById("wf-add-modal")).show();
}

function updateAddDialogFields(type) {
	gAddType = type;
	const isAssign = (type === "task" || type === "escalate");
	const isEmail  = (type === "email");
	const isSms    = (type === "sms");
	document.getElementById("wf-add-assignee-row").style.display = isAssign ? "" : "none";
	document.getElementById("wf-add-email-rows").style.display   = isEmail  ? "" : "none";
	document.getElementById("wf-add-sms-rows").style.display     = isSms    ? "" : "none";
}

function submitAddStep() {
	const sourceEl  = document.getElementById("wf-add-source");
	const srcSurveyId = parseInt(sourceEl.value, 10) || 0;
	const projectId   = parseInt((sourceEl.selectedOptions[0] || {}).dataset.pid || "0", 10);
	const name        = document.getElementById("wf-add-name").value.trim();
	const filter      = document.getElementById("wf-add-filter").value.trim();

	if (!srcSurveyId) { alert("Please select a trigger survey."); return; }
	if (!name)         { alert("Please enter a label for this step."); return; }

	const payload = {
		srcSurveyId: srcSurveyId,
		projectId:   projectId,
		target:      gAddType,
		name:        name,
		filter:      filter || null,
		enabled:     true
	};

	if (gAddType === "task" || gAddType === "escalate") {
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

	// Close modal first
	bootstrap.Modal.getInstance(document.getElementById("wf-add-modal")).hide();

	addHourglass();
	fetch("/surveyKPI/workflow/edit/notification", {
		method:      "POST",
		credentials: "include",
		headers:     { "Content-Type": "application/json" },
		body:        JSON.stringify(payload)
	})
	.then(function() { loadWorkflow(); })
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
