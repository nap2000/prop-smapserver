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
 * Timeline of a case record: the events of its history grouped by day, and the files of the case.
 * The console supplies the details of each event and the buttons that act on them.
 */

"use strict";

import $ from "jquery";
import localise from "localise";
import { htmlEncode, getFromLocalStorage, setInLocalStorage } from "common";

export { showTimeline };

/*
 * Each event belongs to one kind, the kinds are what the filter chips select
 */
var KINDS = {
	created: 'forms',
	changes: 'forms',
	deleted: 'forms',
	restored: 'forms',
	new_case: 'forms',
	case_closed: 'forms',
	case_reopened: 'forms',
	inbound_msg: 'messages',
	outbound_msg: 'messages',
	notification: 'messages',
	email_reply: 'messages',
	task: 'tasks',
	assigned: 'assignments',
	alert: 'alerts',
	conflict: 'conflicts'
};

var CHIPS = [
	{ kind: 'forms', label: 'c_forms', icon: 'fa-inbox' },
	{ kind: 'messages', label: 'tl_messages', icon: 'fa-envelope' },
	{ kind: 'tasks', label: 't_tasks', icon: 'fa-tasks' },
	{ kind: 'assignments', label: 't_assignments', icon: 'fa-user' },
	{ kind: 'alerts', label: 'c_alerts', icon: 'fa-bell' },
	{ kind: 'conflicts', label: 'c_conflicts', icon: 'fa-code-branch' },
	{ kind: 'files', label: 'tl_files', icon: 'fa-paperclip' }
];

var STORE_HIDDEN = 'tl_hidden';
var STORE_ORDER = 'tl_oldest_first';

var gLast;		// The last data shown, so a filter change can show it again
var gOpts = {};

/*
 * Show the timeline
 * data: the record's events, newest first, as returned for the history
 * record: the case record
 * columns: the columns of the record's form
 * opts.details(event, index): html of the event's details, or undefined
 * opts.action(event, index): html of a button that acts on the event, or undefined
 * opts.bind($elem): attach the handlers of the details and buttons
 */
function showTimeline(data, record, columns, opts) {
	gLast = { data: data || [], record: record, columns: columns || [] };
	gOpts = opts || {};
	render();
}

function render() {
	var hidden = getHidden(),
		oldestFirst = getFromLocalStorage(STORE_ORDER) === 'yes',
		h = [],
		idx = -1,
		i,
		events = [],
		day,
		lastDay;

	h[++idx] = getControls(hidden, oldestFirst);

	if(!hidden.files) {
		h[++idx] = getFiles(gLast.data, gLast.record, gLast.columns);
	}

	for(i = 0; i < gLast.data.length; i++) {
		var kind = KINDS[gLast.data[i].event];
		if(kind && !hidden[kind]) {
			events.push({ e: gLast.data[i], i: i });
		}
	}
	if(oldestFirst) {
		events.reverse();
	}

	if(events.length === 0) {
		h[++idx] = '<p class="text-muted text-start">' + htmlEncode(localise.set["tl_none"]) + '</p>';
	}

	for(i = 0; i < events.length; i++) {
		day = (events[i].e.eventTime || '').substring(0, 10);
		if(day !== lastDay) {
			if(lastDay !== undefined) {
				h[++idx] = '</ul>';
			}
			h[++idx] = '<h6 class="text-start mt-3 mb-2 fw-bold">' + htmlEncode(day) + '</h6>';
			h[++idx] = '<ul class="list-unstyled text-start border-start border-2 ps-3 ms-2">';
			lastDay = day;
		}
		h[++idx] = getItem(events[i].e, events[i].i);
	}
	if(lastDay !== undefined) {
		h[++idx] = '</ul>';
	}

	var $elem = $('#timeline');
	$elem.empty().html(h.join(''));

	$('.tl_chip', $elem).on('click', function() {
		var kind = $(this).data('kind'),
			hidden = getHidden();
		hidden[kind] = !hidden[kind];
		setInLocalStorage(STORE_HIDDEN, JSON.stringify(hidden));
		render();
	});
	$('.tl_order', $elem).on('click', function() {
		setInLocalStorage(STORE_ORDER, getFromLocalStorage(STORE_ORDER) === 'yes' ? 'no' : 'yes');
		render();
	});
	if(gOpts.bind) {
		gOpts.bind($elem);
	}
}

function getHidden() {
	var hidden = {};
	try {
		var v = getFromLocalStorage(STORE_HIDDEN);
		if(v) {
			hidden = JSON.parse(v) || {};
		}
	} catch(err) {
		hidden = {};
	}
	return hidden;
}

/*
 * Filter chips and the order button
 */
function getControls(hidden, oldestFirst) {
	var h = [],
		idx = -1,
		i;

	h[++idx] = '<div class="d-flex flex-wrap gap-2 mb-3 align-items-center">';
	for(i = 0; i < CHIPS.length; i++) {
		var on = !hidden[CHIPS[i].kind];
		h[++idx] = '<button type="button" class="btn btn-sm rounded-pill tl_chip ';
		h[++idx] = on ? 'btn-primary' : 'btn-outline-secondary';
		h[++idx] = '" data-kind="' + CHIPS[i].kind + '" aria-pressed="' + (on ? 'true' : 'false') + '">';
		h[++idx] = '<i class="fas ' + CHIPS[i].icon + ' me-1" aria-hidden="true"></i>';
		h[++idx] = htmlEncode(localise.set[CHIPS[i].label]);
		h[++idx] = '</button>';
	}
	h[++idx] = '<button type="button" class="btn btn-sm btn-link ms-auto tl_order">';
	h[++idx] = '<i class="fas ' + (oldestFirst ? 'fa-sort-amount-up' : 'fa-sort-amount-down') + ' me-1" aria-hidden="true"></i>';
	h[++idx] = htmlEncode(localise.set[oldestFirst ? 'tl_oldest' : 'tl_newest']);
	h[++idx] = '</button>';
	h[++idx] = '</div>';

	return h.join('');
}

/*
 * One event
 */
function getItem(e, i) {
	var h = [],
		idx = -1,
		details = gOpts.details ? gOpts.details(e, i) : undefined,
		action = gOpts.action ? gOpts.action(e, i) : undefined,
		id = 'tl_d_' + i;

	h[++idx] = '<li class="mb-3">';
	h[++idx] = '<div class="d-flex align-items-start gap-2">';
	h[++idx] = '<span class="text-info" style="min-width:1.5em;">' + getIcon(e) + '</span>';
	h[++idx] = '<span class="text-muted small" style="min-width:4em;">' + htmlEncode((e.eventTime || '').substring(11, 16)) + '</span>';
	h[++idx] = '<div class="flex-grow-1">';

	h[++idx] = '<div>';
	h[++idx] = '<span class="fw-bold">' + htmlEncode(getEventName(e)) + '</span>';
	var summary = getSummary(e);
	if(summary) {
		h[++idx] = ' - ' + htmlEncode(summary);
	}
	h[++idx] = '</div>';

	// Who, what acted for them, and with which form
	h[++idx] = '<div class="small text-muted">';
	var who = [];
	if(e.userName) {
		who.push(htmlEncode(e.userName));
	}
	if(e.agent) {
		who.push(htmlEncode(localise.set["mcp_via"] + ' ' + e.agent));
	}
	if(e.surveyName) {
		who.push(htmlEncode(e.surveyName));
	}
	h[++idx] = who.join(' &middot; ');
	if(details) {
		h[++idx] = ' <a href="#' + id + '" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="' + id + '">';
		h[++idx] = htmlEncode(localise.set["c_details"]);
		h[++idx] = '</a>';
	}
	h[++idx] = '</div>';

	if(details) {
		h[++idx] = '<div class="collapse change_card mt-2" id="' + id + '">' + details + '</div>';
	}

	h[++idx] = '</div>';
	if(action) {
		h[++idx] = '<div>' + action + '</div>';
	}
	h[++idx] = '</div>';
	h[++idx] = '</li>';

	return h.join('');
}

function getIcon(e) {
	var icon;
	switch(e.event) {
		case 'task': icon = 'fas fa-tasks'; break;
		case 'inbound_msg': icon = 'fas fa-phone'; break;
		case 'outbound_msg': icon = 'fas fa-comment'; break;
		case 'notification':
			if(e.notification && (e.notification.target === 'sms' || e.notification.target === 'conversation')) {
				icon = e.notification.msgChannel === 'whatsapp' ? 'fab fa-whatsapp' : 'fas fa-sms';
			} else {
				icon = 'fas fa-envelope';
			}
			break;
		case 'email_reply': icon = 'fas fa-reply'; break;
		case 'conflict': icon = 'fas fa-code-branch text-warning'; break;
		case 'alert': icon = 'fas fa-bell text-warning'; break;
		case 'assigned': icon = 'fas fa-user'; break;
		case 'case_closed': icon = 'fas fa-folder'; break;
		case 'case_reopened': icon = 'fas fa-folder-open text-warning'; break;
		case 'new_case': icon = 'fas fa-plus'; break;
		case 'deleted': icon = 'fas fa-trash'; break;
		case 'restored': icon = 'fas fa-trash-restore'; break;
		default: icon = 'fas fa-inbox';
	}
	return '<i class="fa-lg ' + icon + '" aria-hidden="true"></i>';
}

function getEventName(e) {
	if(e.event === 'assigned') {
		return localise.set["t_assign"];
	} else if(e.event === 'new_case') {
		return localise.set["t_new_case"];
	}
	return localise.set[e.event] || e.event;
}

/*
 * One line saying what happened, plain text
 */
function getSummary(e) {
	var i, names = [], s;

	if(e.event === 'changes' && e.changes) {
		for(i = 0; i < e.changes.length; i++) {
			names.push(e.changes[i].displayName || e.changes[i].col);
		}
		s = names.slice(0, 3).join(', ');
		if(names.length > 3) {
			s += ' ' + localise.set["tl_more"].replace('%s1', names.length - 3);
		}
		return s;
	} else if(e.event === 'task' && e.task) {
		var current = getTaskCurrent(e.task);
		s = current.name || '';
		if(current.assigned) {
			s += (s ? ', ' : '') + current.assigned;
		}
		if(e.status) {
			// A task past its finish is reported as late, which has its own label
			s += (s ? ', ' : '') + (e.status === 'late' ? localise.set["c_late"] : (localise.set[e.status] || e.status));
		}
		return s;
	} else if(e.event === 'notification' && e.notification) {
		var n = e.notification;
		s = n.emails ? n.emails.join(', ') : '';
		if(n.subject) {
			s += (s ? ': ' : '') + n.subject;
		}
		return s;
	} else if(e.event === 'email_reply' && e.emailReply) {
		return (e.emailReply.fromAddress || '') + (e.emailReply.subject ? ': ' + e.emailReply.subject : '');
	} else if(e.event === 'conflict' && e.conflict) {
		var count = e.conflict.items ? e.conflict.items.length : 0;
		return count + ' ' + (count === 1 ? localise.set["cf_answer"] : localise.set["cf_answers"])
			+ (e.status ? ', ' + (localise.set[e.status] || e.status) : '');
	}
	return e.description;
}

function getTaskCurrent(task) {
	var current = {},
		i,
		events = task.taskEvents;
	if(events) {
		for(i = events.length - 1; i >= 0; i--) {
			if(!current.name && events[i].name) {
				current.name = events[i].name.indexOf(':') > 0 ? events[i].name.substring(0, events[i].name.indexOf(':')) : events[i].name;
			}
			if(!current.assigned && events[i].assigned) {
				current.assigned = events[i].assigned;
			}
		}
	}
	return current;
}

/*
 * The files of the case: the record's own file answers, files an update replaced, and files
 * sent or received in email
 */
function getFiles(data, record, columns) {
	var files = [],
		seen = {},
		h = [],
		idx = -1,
		i, j, e, c, f;

	function add(value, label, state, when, who) {
		var key = fileKey(value);
		if(key && !seen[key]) {
			seen[key] = true;
			files.push({ value: value, label: label, state: state, when: when, who: who });
		}
	}

	// Who added a file: the change that set it, otherwise the record's creation
	function origin(value) {
		var key = fileKey(value), k, m, created;
		for(k = 0; k < data.length; k++) {
			if(data[k].event === 'changes' && data[k].changes) {
				for(m = 0; m < data[k].changes.length; m++) {
					if(isAttachment(data[k].changes[m].type) && fileKey(data[k].changes[m].newVal) === key) {
						return data[k];
					}
				}
			} else if(data[k].event === 'created') {
				created = data[k];
			}
		}
		return created;
	}

	// Current answers first
	if(record) {
		for(i = 0; i < columns.length; i++) {
			c = columns[i];
			if(isAttachment(c.type)) {
				var v = record[c.column_name];
				if(v) {
					e = origin(v);
					add(v, c.displayName || c.column_name, 'tl_current', e ? e.eventTime : '', e ? e.userName : '');
				}
			}
		}
	}

	for(i = 0; i < data.length; i++) {
		e = data[i];
		if(e.event === 'changes' && e.changes) {
			for(j = 0; j < e.changes.length; j++) {
				c = e.changes[j];
				if(isAttachment(c.type)) {
					add(c.oldVal, c.displayName || c.col, 'tl_replaced', e.eventTime, e.userName);
					add(c.newVal, c.displayName || c.col, 'tl_replaced', e.eventTime, e.userName);
				}
			}
		} else if(e.event === 'email_reply' && e.emailReply && e.emailReply.attachments) {
			for(j = 0; j < e.emailReply.attachments.length; j++) {
				add(e.emailReply.attachments[j], e.emailReply.fromAddress, 'tl_received', e.eventTime, '');
			}
		} else if(e.event === 'notification' && e.notification && e.notification.attachments) {
			for(j = 0; j < e.notification.attachments.length; j++) {
				add(e.notification.attachments[j], e.notification.emails ? e.notification.emails.join(', ') : '', 'tl_sent', e.eventTime, e.userName);
			}
		}
	}

	h[++idx] = '<div class="text-start mb-3">';
	h[++idx] = '<h6 class="fw-bold"><i class="fas fa-paperclip me-1" aria-hidden="true"></i>' + htmlEncode(localise.set["tl_files"]) + '</h6>';
	if(files.length === 0) {
		h[++idx] = '<p class="text-muted small">' + htmlEncode(localise.set["tl_no_files"]) + '</p>';
	} else {
		h[++idx] = '<div class="table-responsive"><table class="table table-sm small">';
		h[++idx] = '<thead><tr>';
		h[++idx] = '<th>' + htmlEncode(localise.set["c_file"]) + '</th>';
		h[++idx] = '<th>' + htmlEncode(localise.set["tl_source"]) + '</th>';
		h[++idx] = '<th>' + htmlEncode(localise.set["c_status"]) + '</th>';
		h[++idx] = '<th>' + htmlEncode(localise.set["c_date"]) + '</th>';
		h[++idx] = '<th>' + htmlEncode(localise.set["c_user"]) + '</th>';
		h[++idx] = '</tr></thead><tbody>';
		for(i = 0; i < files.length; i++) {
			f = files[i];
			h[++idx] = '<tr>';
			h[++idx] = '<td>' + fileLink(f.value, true) + '</td>';
			h[++idx] = '<td>' + htmlEncode(f.label) + '</td>';
			h[++idx] = '<td>' + htmlEncode(localise.set[f.state]) + '</td>';
			h[++idx] = '<td>' + htmlEncode(f.when) + '</td>';
			h[++idx] = '<td>' + htmlEncode(f.who) + '</td>';
			h[++idx] = '</tr>';
		}
		h[++idx] = '</tbody></table></div>';
	}
	h[++idx] = '</div>';

	return h.join('');
}

/*
 * The address of a file: an absolute http(s) address as given, or a server path, which is
 * served under /app/ so the session authenticates it.  Anything else is not a file.
 */
function fileUrl(value) {
	if(typeof value !== 'string' || value.length === 0) {
		return undefined;
	}
	if(/^https?:\/\//i.test(value)) {
		return value;
	}
	var p = value.charAt(0) === '/' ? value.substring(1) : value;
	if(p.indexOf('app/attachments/') === 0) {
		return '/' + p;
	} else if(p.indexOf('attachments/') === 0) {
		return '/app/' + p;
	}
	return undefined;
}

// The same file reached by different addresses has one key
function fileKey(value) {
	var url = fileUrl(value);
	if(!url) {
		return undefined;
	}
	var i = url.indexOf('attachments/');
	return i >= 0 ? url.substring(i) : url;
}

function fileLink(value, thumb) {
	var url = fileUrl(value);
	if(!url) {
		return htmlEncode(value);
	}
	var name = url.substring(url.lastIndexOf('/') + 1),
		ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase(),
		h = '<a href="' + htmlEncode(url) + '" target="_blank" rel="noopener">';
	if(thumb && (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'gif' || ext === 'webp')) {
		var thumbUrl = url.substring(0, url.lastIndexOf('/') + 1) + 'thumbs/' + name + '.jpg';
		h += '<img src="' + htmlEncode(thumbUrl) + '" alt="" style="width:40px;height:40px;object-fit:cover;" class="me-2">';
	}
	h += htmlEncode(name) + '</a>';
	return h;
}

function isAttachment(type) {
	return type === 'image' || type === 'audio' || type === 'video' || type === 'file' || type === 'binary';
}
