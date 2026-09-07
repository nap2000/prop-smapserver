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

import $ from "jquery";
import localise from "localise";
import globals from "globals";
import { getLoggedInUser, setupUserProfile } from "common";

/*
 * Managing AI access: which applications have been allowed to act as you, taking that back, and
 * minting a token for something with no browser to authorise with.
 *
 * Everything a client told us about itself - its name above all - is written by whoever registered
 * it, and registration is open. So nothing from the server is ever put into the page as markup;
 * every value goes in through .text(), which cannot become an element.
 */

var SCOPES = [
	{ id: 'smap:read', label: 'Read your surveys, data, tasks and reports' },
	{ id: 'smap:write', label: 'Change surveys, data, tasks and cases' },
	{ id: 'smap:admin', label: 'Manage users, projects and organisation details' },
	{ id: 'smap:access', label: 'Change who can access what' },
	{ id: 'smap:server', label: 'Change server settings' },
	{ id: 'smap:privacy', label: 'Export personal data for subject access requests' }
];

$(document).ready(function() {

	setupUserProfile();
	localise.setlang();

	getLoggedInUser(userKnown, false, false, undefined);

	$('#mcp_token_create').on('click', function() {
		createToken();
	});

	$(document).on('click', '.mcp_withdraw', function() {
		withdraw($(this).data('client'), $(this).data('user'));
	});
});

function userKnown() {

	if(!globals.gIsMcp) {
		$('#mcp_apps_card').addClass('d-none');
		$('#mcp_token_card').addClass('d-none');
		$('#mcp_access_denied').removeClass('d-none');
		return;
	}

	/*
	 * A security manager, organisation administrator or server owner sees everyone in their
	 * organisation, so the table gains a column naming whose access each row is
	 */
	if(globals.gIsSecurityAdministrator || globals.gIsOrgAdministrator || globals.gIsServerOwner) {
		$('.mcp_user_col').removeClass('d-none');
	}

	addScopeChoices();
	loadGrants();
}

function addScopeChoices() {

	var $target = $('#mcp_scope_choices'),
		h = [],
		idx = -1;

	h[++idx] = '<label class="form-label">';
	h[++idx] = localise.set["mcp_permissions"] || 'Permissions';
	h[++idx] = '</label>';

	for(var i = 0; i < SCOPES.length; i++) {
		var domId = 'mcp_scope_' + SCOPES[i].id.replace(':', '_');
		h[++idx] = '<div class="form-check"><input class="form-check-input mcp_scope" type="checkbox" id="';
		h[++idx] = domId;
		h[++idx] = '" value="';
		h[++idx] = SCOPES[i].id;
		h[++idx] = '"';
		h[++idx] = i === 0 ? ' checked' : '';		// Read only by default, add more deliberately
		h[++idx] = '><label class="form-check-label" for="';
		h[++idx] = domId;
		h[++idx] = '">';
		h[++idx] = SCOPES[i].label;
		h[++idx] = '</label></div>';
	}
	$target.html(h.join(''));
}

function loadGrants() {

	$.ajax({
		url: '/surveyKPI/mcpaccess/grants',
		cache: false,
		success: function(data) {
			showGrants(data);
		},
		error: function(xhr) {
			if(xhr.status === 404) {
				// MCP is switched off for the server
				$('#mcp_apps_card').addClass('d-none');
				$('#mcp_token_card').addClass('d-none');
				$('#mcp_access_denied').removeClass('d-none');
			}
		}
	});
}

function showGrants(grants) {

	var $body = $('#mcp_grants').empty(),
		showUser = !$('.mcp_user_col').hasClass('d-none');

	if(!grants || grants.length === 0) {
		$('#mcp_no_grants').removeClass('d-none');
		return;
	}
	$('#mcp_no_grants').addClass('d-none');

	$.each(grants, function(i, g) {

		var $row = $('<tr>');

		/*
		 * The name and the id both come from the client. Appended as text, and the id shown
		 * underneath, because the name proves nothing and the id is the part that identifies it.
		 */
		var $app = $('<td>').text(g.client_name || g.client_id);
		if(g.client_name) {
			$app.append($('<div class="small text-muted">').text(g.client_id));
		}
		if(g.self_registered) {
			$app.append($('<div class="small text-warning">')
					.text(localise.set["mcp_self_registered"] || 'registered itself'));
		}
		$row.append($app);

		if(showUser) {
			$row.append($('<td>').text(g.user || ''));
		}
		$row.append($('<td>').text(describeScopes(g.scopes)));
		$row.append($('<td>').text(shortDate(g.first_issued)));
		$row.append($('<td>').text(shortDate(g.last_used)));

		var $button = $('<button type="button" class="btn btn-sm btn-outline-danger mcp_withdraw">')
				.text(localise.set["mcp_withdraw"] || 'Withdraw')
				.attr('data-client', g.client_id)
				.attr('data-user', g.user || '');
		$row.append($('<td class="text-end">').append($button));

		$body.append($row);
	});
}

function describeScopes(scopes) {
	if(!scopes) {
		return '';
	}
	// Shown without the smap: prefix, which is machinery rather than meaning
	return scopes.split(' ').map(function(s) {
		return s.replace('smap:', '');
	}).join(', ');
}

function shortDate(value) {
	if(!value) {
		return localise.set["mcp_never"] || 'never';
	}
	return value.substring(0, 16).replace('T', ' ');
}

function withdraw(clientId, user) {

	if(!window.confirm(localise.set["mcp_withdraw_confirm"] || 'Withdraw access for this application?')) {
		return;
	}

	var url = '/surveyKPI/mcpaccess/grants?client_id=' + encodeURIComponent(clientId);
	if(user && globals.gLoggedInUser && user !== globals.gLoggedInUser.ident) {
		url += '&user=' + encodeURIComponent(user);
	}

	$.ajax({
		url: url,
		type: 'DELETE',
		success: function() {
			loadGrants();
		},
		error: function(xhr) {
			window.alert(xhr.responseText || xhr.status);
		}
	});
}

function createToken() {

	var scopes = [];
	$('.mcp_scope:checked').each(function() {
		scopes.push($(this).val());
	});
	if(scopes.length === 0) {
		scopes.push('smap:read');
	}

	$.ajax({
		url: '/surveyKPI/mcpaccess/tokens',
		type: 'POST',
		data: {
			name: $('#mcp_token_name').val(),
			scope: scopes.join(' '),
			days: $('#mcp_token_days').val() || ''
		},
		success: function(data) {
			// Shown once. There is deliberately no way to read it back
			$('#mcp_token_value').text(data.token);
			$('#mcp_token_result').removeClass('d-none');
			$('#mcp_token_name').val('');
			$('#mcp_token_days').val('');
		},
		error: function(xhr) {
			window.alert(xhr.responseText || xhr.status);
		}
	});
}
