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

		getLoggedInUser(undefined, false, false, undefined);

		getAvailableTimeZones($('#o_tz'), showTimeZones);

		/*
		 * Set focus to first element on opening modals
		 */
		$('.modal').on('shown.bs.modal', function() {
			$(this).find('input[type=text],textarea,select').filter(':visible:first').focus();
		});

		/*
		 * Add date time picker to usage date
		 */
		moment.locale();
		$('#usageDate').datetimepicker({
			useCurrent: false,
			format: "MM/YYYY",
			viewMode: "months",
			locale: gUserLocale || 'en'
		}).data("DateTimePicker").date(moment());

		// Workaround for bug in view mode of bootstrap date time picker
        $('#usageDate').on('dp.hide', function(event){
            setTimeout(function(){
                $('#usageDate').data('DateTimePicker').viewMode('months');
            },1);
        });


        $('#usageDate').on("dp.change", function () {
        	getBillDetails();
		});

        getBillDetails();
		enableUserProfileBS();	// Allow user to reset their own profile

	});

	function getBillDetails() {
        var usageMsec = $('#usageDate').data("DateTimePicker").date(),
            d = new Date(usageMsec),
			url,
            month = d.getMonth() + 1,
            year = d.getFullYear(),

		url = "/surveyKPI/billing?org=0&year=" + year + "&month=" + month;
        addHourglass();
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function (data) {
                removeHourglass();
				if(data) {
					populateServerTable(data);
				}
            },
            error: function (xhr, textStatus, err) {
                removeHourglass();
                if (xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    alert(localise.set["c_error"] + ": " + err);
                }
            }
        });
    }

    function populateServerTable(data) {
		var $elem = $('#billing_table'),
			h = [],
			idx = -1,
            lineItems = data.line,
			grandTotal  = 0.0;

		for(i = 0; i < lineItems.length; i++) {
			var line = lineItems[i];
            h[++idx] = addBillingRow(localise.set[line["name"]], line["quantity"], line["free"], line["unitCost"], line["amount"], false);
            grandTotal += line["amount"];
		}
        h[++idx] = addBillingRow('<b>' + localise.set["c_total"] + '</b>', '', '', '', grandTotal, true);
        $elem.empty().append(h.join(''));
	}

	function addBillingRow(name, usage, free, unit, total, grand) {
		var h = [],
			idx = -1;

        h[++idx] = '<tr>';
        h[++idx] = '<td>';			// Server
        h[++idx] = name;
        h[++idx] = '</td>';

        h[++idx] = '<td>';			// Usage
        h[++idx] = usage;
        h[++idx] = '</td>';

        h[++idx] = '<td>';			// Free Usage
        h[++idx] = free;
        h[++idx] = '</td>';

        h[++idx] = '<td>';			// Unit Cost
        h[++idx] = unit;
        h[++idx] = '</td>';

        h[++idx] = '<td>';			// Total
        if(grand) {
            h[++idx] = '<b>';
        }
        h[++idx] = '$' + parseFloat(total).toFixed(2);
        if(grand) {
            h[++idx] = '</b>';
        }
        h[++idx] = '</td>';
        h[++idx] = '</tr>';

        return h.join('');
	}


});
	
