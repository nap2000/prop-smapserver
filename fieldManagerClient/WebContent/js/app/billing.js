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

    var gLevel,
        gOrganisationList;

	$(document).ready(function() {

		setupUserProfile();
		localise.setlang();		// Localise HTML

		getLoggedInUser(userKnown, false, false, undefined);

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
        $('#organisation').change(function(){
           getBillDetails();
        });

        $('#org_bill_rpt').click(function (e) {
            var usageMsec = $('#usageDate').data("DateTimePicker").date(),
                d = new Date(usageMsec),
                url,
                month = d.getMonth() + 1,
                year = d.getFullYear();

            url = "/surveyKPI/billing/organisations/xlsx?year=" + year + "&month=" + month;
            downloadFile(url);

        });

        // Set up the tabs
        $('#billTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');

            $("#billPanel").show();
            $('#ratesPanel').hide();

        });
        $('#ratesTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');

            $("#billPanel").hide();
            $('#ratesPanel').show();
        });

        $('#billLevel').change(function () {
            levelChanged();
        });

		enableUserProfileBS();	// Allow user to reset their own profile

	});

	function userKnown() {
        var h = [],
            idx = -1,
            level;

	    if(globals.gIsOrgAdministrator || globals.gIsEnterpriseAdministrator || globals.gIsServerOwner) {
            if(globals.gIsServerOwner) {
                h[++idx] = '<option value="owner">';
                h[++idx] = localise.set["u_server_owner"];
                h[++idx] = '</option>';
                level = "owner";
            }
            if(globals.gIsEnterpriseAdministrator) {
                h[++idx] = '<option value="ent">';
                h[++idx] = localise.set["u_ent_admin"];
                h[++idx] = '</option>';
                if(!level) {
                    level = "ent";
                }
            }
            if(globals.gIsOrgAdministrator) {
                h[++idx] = '<option value="org">';
                h[++idx] = localise.set["u_org_admin"];
                h[++idx] = '</option>';
                if(!level) {
                    level = "org";
                }
            }
            $('#billLevel').html(h.join(''));
            $('#billLevel').val(level);
            gLevel = level;
	        $(".showHierarchy").show();
        } else {
	        gLevel = "ind_org";
        }
        levelChanged(true);
	    if(gLevel !== "org") {
            getBillDetails();
        }
    }

    function levelChanged(dontGetBillDetails) {
	    gLevel =  $('#billLevel').val();
        $(".showOrganisation,.showManager").hide();
	    if(gLevel === "org") {
	        $(".showOrganisation").show();
            if(!gOrganisationList) {
                getOrganisations();
            }
        }
        if(globals.gIsServerOwner ||
                (globals.gIsEnterpriseAdministrator && gLevel !== "owner") ||
                (globals.gIsOrgAdministrator && gLevel === "org")
                ) {
            $(".showManager").show();
        }
        if(!dontGetBillDetails) {
	        getBillDetails();
        }

    }

	function getBillDetails() {
        var usageMsec = $('#usageDate').data("DateTimePicker").date(),
            d = new Date(usageMsec),
			url,
            month = d.getMonth() + 1,
            year = d.getFullYear(),
            url,
            orgIdx;

		getRates();

        url = "/surveyKPI/billing?year=" + year + "&month=" + month;
        if(gLevel === "org" || gLevel === "org_ind") {
            orgIdx = $('#organisation').val();
            url += "&org=" + gOrganisationList[orgIdx].id;
        }

        addHourglass();
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function (data) {
                removeHourglass();
				if(data) {
					populateBillTable(data);
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

    function getRates() {

		var billLevel = $('#billLevel option:selected').val(),
			url,
			msg,
			levelName,
			higherName;

	    url = "/surveyKPI/billing/rates";
	    if(gLevel === "org" || gLevel === "ind_org") {
		    orgIdx = $('#organisation').val();
		    url += "?org=" + gOrganisationList[orgIdx].id;
	    }

	    addHourglass();
	    $.ajax({
		    url: url,
		    dataType: 'json',
		    cache: false,
		    success: function (data) {
			    removeHourglass();
			    if(data.length > 0) {
				    populateRatesTable(data);
				    $('.hasrates').show();
				    $('.norates').hide();
			    } else {
				    if(gLevel === "org" || gLevel === "ind_org") {
					    levelName = localise.set["c_org"];
					    higherName = localise.set["c_ent"];
				    } else if(gLevel === "ent") {
					    levelName = localise.set["c_ent"];
					    higherName = localise.set["c_server"];
				    }

				    msg = localise.set["bill_norates"].replace("%s1", levelName).replace("%s2", higherName);
				    $('#noratesmsg').html(msg);
				    $('.hasrates').hide();
				    $('.norates').show();
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

	function populateRatesTable(data) {
		var $elem = $('#rates_table'),
			h = [],
			idx = -1;

		alert("Got some rates: " + data.length);
	}


	function populateBillTable(data) {
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

	function getOrganisations() {

        addHourglass();
        $.ajax({
            type: 'GET',
            cache: false,
            url: "/surveyKPI/organisationList",
            success: function(data, status) {
                removeHourglass();
                gOrganisationList = data;
                if(data && data.length > 0) {
                    var h = [],
                        idx = -1,
                        i;

                    for(i = 0; i < data.length; i++) {
                        h[++idx] = '<option value="';
                        h[++idx] = i;
                        h[++idx] = '"';
                        if(i == 0 ) {
                            h[++idx] = ' selected="seelcted"'
                        }
                        h[++idx] = '>';
                        h[++idx] = data[i].name;
                        h[++idx] = '</option>';
                    }
                    $('.organisation_select').html(h.join(''));
                }
                getBillDetails();
            }, error: function(xhr, textStatus, err) {
                removeHourglass();
                if(xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    var msg = err;
                    alert(localise.set["msg_err_upd"] + msg);
                }
            }
        });
    }

});
	
