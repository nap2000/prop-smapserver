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

define(['jquery','localise', 'common', 'globals', 
        'bootbox', 
        'moment',
        'datetimepicker'], function($, lang, common, globals, bootbox, moment) {
	
var gUsers,
	gGroups,
	gOrganisationList,
	gControlCount,			// Number of users that have been set - used to enable / disable control buttons
	gControlProjectCount,	// Number of projects that have been set - used to enable / disable control buttons
	gControlOrganisationCount,
	gCurrentProjectIndex,	// Set while editing a projects details
	gCurrentRoleIndex,	// Set while editing a user role details
	gCurrentOrganisationIndex,
	gCurrentUserIndex,		// Set while editing a users details
	gOrgId;

$(document).ready(function() {

	localise.setlang();		// Localise HTML

	getLoggedInUser(userKnown, false, false, getOrganisations);
	
	getAvailableTimeZones($('#o_tz'), showTimeZones);
    
	/* 
	 * Set focus to first element on opening modals
	 */
	$('.modal').on('shown.bs.modal', function() {
		$(this).find('input[type=text],textarea,select').filter(':visible:first').focus();
	});
    
	/*
	 * Add date time picker to usage date
	 *
	moment.locale();
	$('#usageDate').datetimepicker({
		useCurrent: false,
		format: "MM/YYYY",
		viewMode: "months",
		locale: gUserLocale || 'en'
	}).data("DateTimePicker").date(moment());
*/


	enableUserProfileBS();	// Allow user to reset their own profile
	
});



});
	
