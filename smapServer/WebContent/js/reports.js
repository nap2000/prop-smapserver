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
 * Purpose: Allow the user to select a web form in order to complete a survey
 */
var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 

var gReportList = [];
var gConfig;
var gReportIdx;

requirejs.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
    	jquery: '../../../../js/libs/jquery-2.1.1',
       	lang_location: '../'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery'],
    	'bootstrap.min': ['jquery'],
    	'icheck': ['jquery'],
       	'inspinia': ['jquery'],
    	'metismenu': ['jquery'],
    	'slimscroll': ['jquery']
    }
});

require([
         'jquery', 
         'bootstrap.min',
         'app/common',
         'app/globals',
         'app/localise',
         'bootstrapfileinput',
         'inspinia',
         'metismenu',
         'slimscroll',
         'pace',
         'app/data',
         'icheck'
         ], function($, bootstrap, common, globals, localise, bsfi) {

	$(document).ready(function() {

		localise.setlang();		// Localise HTML

		// Get the user details
		globals.gIsAdministrator = false;
        getLoggedInUser(projectChanged, false, true, undefined);
		getReportsForUser();

		$('#m_refresh').click(function() {
            getReportsForUser();
		});

        $('#generateReport').click(function() {
        	var i;
        	var filename;
        	var val;
        	var params = [];
        	var url;
        	var action = gReportList[gReportIdx].action_details;


        	/*
        	for(i = 0; i < gConfig.length; i++) {
        		val = $('#param_' + gConfig[i].name).val();

        		// Validate
        		if(gConfig[i].required && (typeof val === "undefined" || val.trim().length === 0)) {
                    $('#alert').html(localise.set['ed_req'] + " : " + localise.set[gConfig[i].trans])
        			$('#alert').show();
        			return false;
                }

                if(gConfig[i].name === "filename") {
                    filename = val;
                } else {
                    params.push({
                        key: gConfig[i].name,
                        val: val
                    })
                }

                gReportList[gReportIdx].savedParams[gConfig[i].name] = val;
			}
			*/
            $('#alert').hide();

            url = getReportUrl(action.reportType, action.sId, action.filename);
            params = gReportList[gReportIdx].action_details.parameters
            if(params && params.length > 0) {
                for(i = 0; i < params.length; i++) {
                    if(url.indexOf('?') < 0) {
                        url += '?';
                    } else {
                        url += '&';
                    }
                    url += params[i].k + '=' + params[i].v;
                }
            }


            $('#report_popup').modal("hide");
            window.location.href = url;

		});

        // Set change function on projects
        $('#project_name').change(function () {
            projectChanged();
        });

        // Set change function on surveys
        $('#survey').change(function() {
            surveyChanged();
        });

        $('#addReport').click(function(){

            $('#publish_popup').modal("show");
		});

        $('#publishReport').click(function () {

            var sId = $('#survey').val();
            var name = $('#r_name').val();
            var reportType = $('#reportType').val();

            var filename = $('#filename').val();
            var forms = $(':radio:checked', '.shapeforms').map(function() {
                return this.value;
            }).get();
            var form = forms[0];

            // Validation
            if(sId <= 0) {
                $('#publish_alert').html(localise.set["a_exp_leg1"])
                    .addClass("alert-danger").removeClass("alert-success").show();
                return;
            } else if (!name || name.trim().length == 0) {
                $('#publish_alert').html(localise.set["msg_val_nm"])
                    .addClass("alert-danger").removeClass("alert-success").show();
                return;
            }

            // Add roles
            if (globals.gIsSecurityAdministrator) {
                var roleIds = [],
                    id;
                $('input[type=checkbox]:checked', '.role_select_roles').each(function () {
                    id = $(this).val();
                    roleIds.push(id);
                });
                if (roleIds.length > 0) {
                    url += "?roles=" + roleIds.join();
                }
            }

            var url = "/surveyKPI/reporting/link/" + name + "/" + sId
                + "?reportType=" + reportType;

            if(filename && filename.trim().length > 0) {
                url += "&filename=" + filename;
            }
            if(form > 0) {
                url += "&form=" + form;
            }

            addHourglass();
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {

                    removeHourglass();
                    getReportsForUser();
                    $('#publish_alert').html("").hide();
                    $('#publish_popup').addClass("alert-success").removeClass("alert-danger").modal("hide");
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                    	$('#publish_alert').html(localise.set["msg_err_upd"] + " : " + xhr.responseText)
                            .addClass("alert-danger").removeClass("alert-success").show();
                    }
                }
            });

        });


		enableUserProfileBS();
	});

    function surveyChanged() {
        var sId = $('#survey').val();
        var dateQuestionId = 0;     // TODO
        // Set the survey meta data
        var sMeta = globals.gSelector.getSurvey(sId);
        if(!sMeta) {
            getSurveyMetaSE(sId, undefined, false, true, true, dateQuestionId);
        } else {
            addFormPickList(sMeta);
            //addDatePickList(sMeta);   TODO
        }
    }

	/*
	 * Get published reports
	 */
	function getReportsForUser() {

		url="/surveyKPI/userList/temporary?action=report";

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gReportList = data;
				completeReportList(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					  return;  // Not an error
				} else {
				    alert(localise.set["error"] + ": " + xhr.responseText);
				}
			}
		});
	}

	/*
	 * Fill in the report list
	 */
	function completeReportList() {

		var i,
			tab = [],
			idx = -1,
			$reportList = $('#report_list');

		// Add the reports
		if(gReportList) {
            for (i = 0; i < gReportList.length; i++) {
                var action = gReportList[i].action_details;

                tab[++idx] = '<tr>';

                tab[++idx] = '<td>';
                tab[++idx] = action.surveyName;
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';			// Report Name
                tab[++idx] = action.name;
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';            // Launch report
                tab[++idx] = '<button class="btn btn-default report" value="';
                tab[++idx] = i;
                tab[++idx] = '" type="button"><i class="fa fa-book"></i></button>';
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';            // Edit Report
                tab[++idx] = '<button class="btn btn-default report_edit" value="';
                tab[++idx] = i;
                tab[++idx] = '" type="button"><i class="fa fa-edit"></i></button>';
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';            // Delete Report
                tab[++idx] = '<button class="btn btn-default report_delete" value="';
                tab[++idx] = i;
                tab[++idx] = '" type="button"><i class="fa fa-trash"></i></button>';
                tab[++idx] = '</td>';


                tab[++idx] = '</tr>';

                // Add an object to store parameter values
				gReportList[i].savedParams = {};

            }
        }

		$reportList.html(tab.join(''));

		/*
		 * Deleting reports
		 */
        $reportList.find('.report_delete').click(function() {
            gReportIdx = $(this).val();
            var report = gReportList[gReportIdx];

            addHourglass();
            $.ajax({
                url: "/surveyKPI/reporting/link/"  + report.ident,
                type: "DELETE",
                cache: false,
                success: function (data) {
                    removeHourglass();
                    getReportsForUser();
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        $('#publish_alert').html(localise.set["msg_err_upd"] + " : " + xhr.responseText)
                            .addClass("alert-danger").removeClass("alert-success").show();
                    }
                }
            });
        });

		/*
		 * Launching reports
		 */
		$reportList.find('.report').click(function() {

			gReportIdx = $(this).val();
			var selectedAction = gReportList[gReportIdx].action_details;

			// Hard code the config for present - this should have come from the DB
			gConfig = [
				{
					name: "startDate",
					type: "date",
					trans: "a_from_date",
					required: false
				},
                {
                    name: "endDate",
                    type: "date",
                    trans: "a_to_date",
                    required: false
                },
				{
                    name: "filename",
                    type: "text",
                    trans: "sr_fn",
                    required: false
                }
			];

			// Set up the dialog according to the required parameters
			idx = -1;
			h = [];

			for(i = 0; i < gConfig.length; i++) {
				h[++idx] = '<div class="form-group">';

				// Label
				h[++idx] = '<label for="param_';
				h[++idx] = gConfig[i].name;
				h[++idx] = '" class="col-sm-2 control-label">';
				h[++idx] = localise.set[gConfig[i].trans];
				h[++idx] = '</label>';

				// Control
				h[++idx] = '<div class="col-sm-10">';
				h[++idx] = '<input type="';
				h[++idx] = gConfig[i].type;
				h[++idx] = '" id="param_';
                h[++idx] = gConfig[i].name;
                h[++idx] = '"';
                if(gConfig[i].required) {
                	h[++idx] = " required";
				}
				h[++idx] = ' class="form-control">';
                h[++idx] = '</div>';

                h[++idx] = '</div>';    // Form group

			}
			$('#report_params_form').empty().html(h.join(''));

            $('#alert').hide();

            // Restore saved parameters
            for(i = 0; i < gConfig.length; i++) {
                if(selectedAction[gConfig[i].name]) {
                    $('#param_' + gConfig[i].name).val(selectedAction[gConfig[i].name]);
                } else if(gReportList[gReportIdx].savedParams[gConfig[i].name]) {
                    $('#param_' + gConfig[i].name).val(gReportList[gReportIdx].savedParams[gConfig[i].name]);
				} else if(gConfig[i].name === "filename") {
                    $('#param_' + gConfig[i].name).val(gReportList[gReportIdx].name);
				}
            }

			$('#report_popup').modal("show");
		});

	}

    /*
     * Function called when the current project is changed
     */
    function projectChanged() {

        globals.gCurrentProject = $('#project_name option:selected').val();
        globals.gCurrentSurvey = -1;
        globals.gCurrentTaskGroup = undefined;

        loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChanged);			// Get surveys
        completeReportList();		// Refresh the shown reports

        saveCurrentProject(globals.gCurrentProject,
            globals.gCurrentSurvey,
            globals.gCurrentTaskGroup);

    }

    /*
     * Convert a report type into the base of the URL
     */
    function getReportUrl(type, sId, filename) {
        var url = "/surveyKPI/";
        if(type === "xlsx") {
            url += "exportxlsx/";
        }

        url += sId;
        url += "/" + filename;

        return url;
    }

});

