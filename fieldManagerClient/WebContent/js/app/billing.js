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
        gOrganisationList,
	    gEnterpriseList,
	    gEnabled;

	$(document).ready(function() {

		setTheme();
		setupUserProfile(true);
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
        $('#organisation, #enterprise').change(function(){
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

            $("#billPanel, .billOnly").show();
            $('#ratesPanel').hide();

        });
        $('#ratesTab a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');

            $("#billPanel, .billOnly").hide();
            $('#ratesPanel').show();
        });

        $('#billLevel').change(function () {
            levelChanged();
        });

        $('#enableBilling').change(function(){
        	gEnabled = $(this).is(':checked');
	        var enabledString = gEnabled ? "true" : "false";
	        var idx = 0;
	        var id = 0;
	        if(gLevel === "org") {
				idx = $('#organisation').val();
				id = gOrganisationList[idx].id;
	        } else if(gLevel === "ent") {
		        idx = $('#enterprise').val();
		        id = gEnterpriseList[idx].id;
	        }

	        if(gEnabled) {
	        	$('.billing_enabled').show();
		        $('.billing_disabled').hide();
	        } else {
		        $('.billing_enabled').hide();
		        $('.billing_disabled').show();
	        }

	        /*
	         * Store the changed value
	         */
	        addHourglass();
	        $.ajax({
		        type: "POST",
		        cache: false,
		        contentType: "application/json",
		        url: "/surveyKPI/billing/enable",
		        data: {
		        	enabled: enabledString,
			        level: gLevel,
			        id: id
		        },
		        success: function(data) {
			        removeHourglass();
		        }, error: function(data, status) {
			        removeHourglass();
			        alert(localise.set["c_error"] + ": " + data.statusText);
		        }
	        });
        });

	});

	function userKnown() {
        var h = [],
            idx = -1,
            level;

	    if(globals.gIsOrgAdministrator || globals.gIsEnterpriseAdministrator || globals.gIsServerOwner) {

	    	if(globals.gIsServerOwner || globals.gIsEnterpriseAdministrator) {
                h[++idx] = '<option value="owner">';
                h[++idx] = localise.set["server"];
                h[++idx] = '</option>';
                level = "owner";
            }
            if(globals.gIsEnterpriseAdministrator || globals.gIsOrgAdministrator) {
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
        } else if(gLevel === "ent") {
		    $(".showEnterprise").show();
		    if(!gEnterpriseList) {
			    getEnterprises();
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
            orgIdx,
	        entIdx

		getRates();

        url = "/surveyKPI/billing?year=" + year + "&month=" + month;
        if(gLevel === "org" || gLevel === "org_ind") {
            orgIdx = $('#organisation').val();
            url += "&org=" + gOrganisationList[orgIdx].id;
        } else  if(gLevel === "ent") {
	        entIdx = $('#enterprise').val();
	        url += "&ent=" + gEnterpriseList[entIdx].id;
        }

        addHourglass();
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function (data) {
                removeHourglass();
				if(data) {
					gEnabled = data.enabled;
					$('#enableBilling').prop('checked', gEnabled);
					if(gEnabled) {
						$('.billing_enabled').show();
						$('.billing_disabled').hide();
					} else {
						$('.billing_enabled').hide();
						$('.billing_disabled').show();
					}

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
			higherName,
			hasParam = false;

	    url = "/surveyKPI/billing/rates";
	    if(gLevel === "org" || gLevel === "org_ind") {
		    orgIdx = $('#organisation').val();
		    url += (hasParam ? '&' : '?')  + "org=" + gOrganisationList[orgIdx].id;
		    hasParam = true;
	    } else  if(gLevel === "ent") {
		    entIdx = $('#enterprise').val();
		    url += (hasParam ? '&' : '?')  + "ent=" + gEnterpriseList[entIdx].id;
		    hasParam = true;
	    }

	    if (globals.gTimezone) {
		    url += (hasParam ? '&' : '?') + "tz=" + encodeURIComponent(globals.gTimezone);
		    hasParam = true;
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

	function populateRatesTable(rates) {
		var $elem = $('#rates_table'),
			h = [],
			idx = -1,
			i,
			j;

		if(rates) {
			for (i = 0; i < rates.length; i++) {
				h[++idx] = '<tr>';

				h[++idx] = '<td></td>';     // status

				h[++idx] = '<td>';			// Applies From
				h[++idx] = rates[i].appliesFrom.year + '-' + rates[i].appliesFrom.month + '-' + rates[i].appliesFrom.day;
				h[++idx] = '</td>';

				h[++idx] = '<td>';			// Changed By
				h[++idx] = rates[i].modifiedBy;
				h[++idx] = '</td>';

				h[++idx] = '<td>';			// Created date
				h[++idx] = rates[i].modified.date.year + '-' + rates[i].modified.date.month + '-' + rates[i].modified.date.day
					+ ' ' + rates[i].modified.time.hour + ':' + rates[i].modified.time.minute;
				h[++idx] = '</td>';

				h[++idx] = '<td>';			// Line Items
				for(j = 0; j < rates[i].line.length; j++) {
					var line = rates[i].line[j];
					h[++idx] = localise.set[line.name] + ": " + line.unitCost + " (" + localise.set["free"] + ": " + line.free + ")<br/>";
				}
				h[++idx] = '</td>';

				h[++idx] = '<td>';			// Line Items
					h[++idx] = '<button type="button" class="btn btn-danger delrate ';
					if(rates[i].eId == 0 && rates[i].oId == 0) {
						h[++idx] = 'disabled';
					}
					h[++idx] = '" data-idx="';
					h[++idx] = i;
					h[++idx] = '"><i class="glyphicon glyphicon-trash" aria-hidden=true"></i></button>';
				h[++idx] = '</td>';

				h[++idx] = '</tr>';
			}
			$elem.empty().append(h.join(''));

			$(".delrate", $('#ates_table')).click(function(){
				var idx = $(this).data("idx");
				deleteRate(idx);
			});
		}
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
                            h[++idx] = ' selected="selected"'
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

	function getEnterprises() {

		addHourglass();
		$.ajax({
			type: 'GET',
			cache: false,
			url: "/surveyKPI/enterpriseList",
			success: function(data, status) {
				removeHourglass();
				gEnterpriseList = data;
				if(data && data.length > 0) {
					var h = [],
						idx = -1,
						i;

					for(i = 0; i < data.length; i++) {
						h[++idx] = '<option value="';
						h[++idx] = i;
						h[++idx] = '"';
						if(i == 0 ) {
							h[++idx] = ' selected="selected"'
						}
						h[++idx] = '>';
						h[++idx] = data[i].name;
						h[++idx] = '</option>';
					}
					$('.enterprise_select').html(h.join(''));
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
	
