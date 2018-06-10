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
var gForm = 0;

requirejs.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
    	jquery: '../../../../js/libs/jquery-2.1.1',
        moment: 'moment-with-locales.min',
       	lang_location: '../'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery'],
    	'bootstrap.min': ['jquery'],
    	'icheck': ['jquery'],
       	'inspinia': ['jquery'],
    	'metismenu': ['jquery'],
    	'slimscroll': ['jquery'],
        'bootstrap-datetimepicker.min': ['moment']
    }
});

require([
         'jquery', 
         'bootstrap.min',
         'app/common',
         'app/globals',
         'app/localise',
         'bootstrapfileinput',
         'moment',
         'inspinia',
         'metismenu',
         'slimscroll',
         'pace',
         'app/data',
         'icheck',
         'bootstrap-datetimepicker.min'
         ], function($, bootstrap, common, globals, localise, bsfi, moment) {

	$(document).ready(function() {

        setCustomReports();			// Apply custom javascript
		localise.setlang();		// Localise HTML

		// Get the user details
		globals.gIsAdministrator = false;
        getLoggedInUser(projectChanged, false, true, undefined);

		$('#m_refresh').click(function() {
            getReports();
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
            surveyChanged(setForm);
        });

        $('#addReport').click(function(){
            $('#publish_form')[0].reset();

            // Set button to create
            $('#publishReport').show();
            $('#saveReport').hide();
            $('#publish_popup').modal("show");
		});

        $('#publishReport').click(function () {
            updateReport(false);
        });

        $('#saveReport').click(function () {
            updateReport(true);
        });

        $('#publish_popup').on('shown.bs.modal', function () {
            $('#exp_from_date').datetimepicker({
                locale: gUserLocale || 'en',
                useCurrent: false
            });

            $('#exp_to_date').datetimepicker({
                locale: gUserLocale || 'en',
                useCurrent: false
            });
            $('#r_name').focus();
        });

        // Dialog methods
        $('#reportType').change(function () {
           setupReportDialog();
        });
        $('#publish_popup').on('show.bs.modal', function (event) {
            setupReportDialog();
        });

		enableUserProfileBS();
	});

	function updateReport(edit) {

        var sId = $('#survey').val();
        var name = $('#r_name').val();
        var reportType = $('#reportType').val();
        var includeMeta = $('#includeMeta').prop('checked');
        var split_locn = $('#splitlocn').prop('checked');
        var merge_select_multiple = $('#mergeSelectMultiple').prop('checked');
        var landscape = $('#orient_landscape').prop('checked');
        var embed_images = $('#embedImages').prop('checked');
        var language = $('#export_language').val();
        var dateId = $('#export_date_question').val();
        var exp_from_date = undefined;
        var exp_to_date = undefined;
        if($('#exp_from_date').data("DateTimePicker").date()) {
            exp_from_date = $('#exp_from_date').data("DateTimePicker").date().startOf('day').format('YYYY-MM-DD');
        }
        if($('#exp_to_date').data("DateTimePicker").date()) {
            exp_to_date = $('#exp_to_date').data("DateTimePicker").date().endOf('day').format('YYYY-MM-DD');
        }
        var filter = $('#tg_ad_filter').val();
        var filename = $('#filename').val();
        var forms = $(':radio:checked', '.shapeforms').map(function() {
            return this.value;
        }).get();
        var form = forms[0];

        // Validation
        if(sId <= 0) {
            alert(localise.set["a_exp_leg1"]);
            return;
        } else if (!name || name.trim().length == 0) {
            alert(localise.set["msg_val_nm"]);
            $('#r_name').focus();
            return;
        } else if(exp_from_date && exp_to_date && exp_to_date < exp_from_date) {
            alert(window.localise.set["msg_sel_dates"]);
            $('#exp_from_date').focus();
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

        var url = "/surveyKPI/reporting/link/" + sId
            + "?reportType=" + reportType
            + "&name=" + name;

        if(filename && filename.trim().length > 0) {
            url += "&filename=" + filename;
        }
        if(form > 0) {
            url += "&form=" + form;
        }
        if(includeMeta) {
            url += "&meta=true";
        }
        if(split_locn) {
            url += "&split_locn=true";
        }
        if(dateId != 0) {
            url += "&dateId=" + dateId;
        }
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
        if(merge_select_multiple) {
            url += "&merge_select_multiple=true";
        }
        if(embed_images) {
            url += "&embedimages=true";
        }
        if(landscape) {
            url += "&landscape=true";
        }
        if(language != "none") {
            url += "&language=" + language;
        }
        if(filter && filter.length > 0) {
            url += "&filter=" + filter;
        }

        if(edit) {
            url += "&ident=" + gReportList[gReportIdx].ident;
        }

        addHourglass();
        $.ajax({
            url: url,
            dataType: 'json',
            cache: false,
            success: function (data) {

                removeHourglass();
                getReports();
                $('#publish_popup').modal("hide");
            },
            error: function (xhr, textStatus, err) {
                removeHourglass();
                if (xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    alert(localise.set["msg_err_upd"] + " : " + xhr.responseText);
                }
            }
        });
    }

    function surveyChanged(callback) {
        var sId = $('#survey').val();
        var dateQuestionId = 0;     // TODO
        // Set the survey meta data
        var sMeta = globals.gSelector.getSurvey(sId);
        if(!sMeta) {
            getSurveyMetaSE(sId, undefined, false, true, true, dateQuestionId, false, callback);
        } else {
            addFormPickList(sMeta);
            addDatePickList(sMeta);
        }

        var languages = globals.gSelector.getSurveyLanguages(sId);
        if(typeof languages === "undefined") {
            var view = {
                sId: sId
            }
            getViewLanguages(view);
        } else {
            setSurveyViewLanguages(languages, undefined, '#export_language', true);
        }

    }

	/*
	 * Get published reports
	 */
	function getReports() {

		url="/surveyKPI/userList/temporary?action=report&pId=" + globals.gCurrentProject;

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

                tab[++idx] = '<tr data-idx="';
                tab[++idx] = i;
                tab[++idx] = '">';

                tab[++idx] = '<td>';
                tab[++idx] = action.surveyName;
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';			// Report Name
                tab[++idx] = action.name;
                tab[++idx] = '</td>';

                tab[++idx] = '<td class="thelink">';			// Anonymous Link
                tab[++idx] = location.origin + "/surveyKPI/action/" + gReportList[i].ident;
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';			// Copy Link
                tab[++idx] = '<button type="button" class="btn btn-default has_tt copyLink" title="Copy Link" value="';
                tab[++idx] = i;
                tab[++idx] = '"><i class="fa fa-share-alt"></i></button>';
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';
                tab[++idx] = '<div class="dropdown">';
                tab[++idx] = '<button id="dropdownMenu' + i + '" class="btn btn-default dropdown-toggle report_action" data-toggle="dropdown"  type="button" aria-haspopup="true" aria-expanded="false">';
                tab[++idx] = localise.set["c_action"] + ' <span class="caret"></span>';
                tab[++idx] = '</button>';
                tab[++idx] = '<ul class="dropdown-menu" aria-labelledby="dropdownMenu' + i + '">';
                    tab[++idx] = '<li><a class="repGenerate" href="#">' + localise.set["c_generate"] + '</a></li>';
                    tab[++idx] = '<li><a class="repEdit" href="#">' + localise.set["c_edit"] + '</a></li>';
                    tab[++idx] = '<li><a class="repDelete" href="#">' + localise.set["c_del"] + '</a></li>';
                tab[++idx] = '</ul>';
                tab[++idx] = '</div>';  // Dropdown class
                tab[++idx] = '</td>';
                tab[++idx] = '</tr>';

                // Add an object to store parameter values
				gReportList[i].savedParams = {};

            }
        }

		$reportList.html(tab.join(''));

        /*
         * Respond to a user clicking copy link
         */
        $('.has_tt').tooltip();
        $('.copyLink').click(function () {
            var copyText = $(this).closest('tr').find('.thelink').get(0);
            var $temp = $("<input>");
            $("body").append($temp);
            $temp.val($(copyText).text()).select();
            document.execCommand("copy");

            $(this).prop('title', localise.set["c_c"] + ": " + $(copyText).text()).tooltip('fixTitle').tooltip('show');
            $temp.remove();

        });

		/*
		 * Action Dropbox
		 */
		var $dropdown = $('#contextMenu');
        $reportList.find('.report_action').click(function() {
            $(this).after($dropdown.clone(true));
            $(this).dropdown();
        });

        /*
         * Delete
         */
        $('.repDelete').click(function() {
            var $this = $(this);
            gReportIdx = $this.closest('tr').data("idx");
            var report = gReportList[gReportIdx];

            // Move the context menu out of the way
            $('#menuStore').after($dropdown);

            addHourglass();
            $.ajax({
                url: "/surveyKPI/reporting/link/" + report.ident,
                type: "DELETE",
                cache: false,
                success: function (data) {
                    removeHourglass();
                    getReports();
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        getReports();
                    } else {
                        alert(localise.set["msg_err_upd"] + " : " + xhr.responseText);
                    }
                }
            });
        });

        $('.repEdit').click(function() {
            var $this = $(this);
            var i;

            gReportIdx = $this.closest('tr').data("idx");
            var report = gReportList[gReportIdx];

            $('#publish_form')[0].reset();
            $('#r_name').val(report.action_details.name);

            $('#reportType').val(report.action_details.reportType);
            $('#survey').val(report.action_details.sId);
            surveyChanged(setForm);

            // Add parameters
            var meta = false;
            var split_locn = false;
            var merge_select_multiple = false;
            var embed_images = false;
            var language = "none";
            var dateId = 0;
            var exp_from_date;
            var exp_to_date;
            var filter;
            var landscape;
            for(i = 0; i < report.action_details.parameters.length; i++) {
                var param = report.action_details.parameters[i];

                if(param.k === "meta") {
                    if(param.v === "true") {
                        meta = true;
                    }
                } else  if(param.k === "form") {
                    gForm = +param.v;
                    setForm();
                } else if(param.k === "split_locn") {
                    if(param.v === "true") {
                        split_locn = true;
                    }
                } else if(param.k === "merge_select_multiple") {
                    if(param.v === "true") {
                        merge_select_multiple = true;
                    }
                } else if(param.k === "embed_images") {
                    if(param.v === "true") {
                        embed_images = true;
                    }
                } else if(param.k === "language") {
                    language = param.v;
                } else if(param.k === "filter") {
                    filter = param.v;
                } else if(param.k === "dateId") {
                    dateId = param.v;
                } else if(param.k === "startDate") {
                    exp_from_date = param.v;
                } else if(param.k === "endDate") {
                    exp_to_date = param.v;
                } else if(param.k === "landscape") {
                    if(param.v === "true") {
                        landscape = true;
                    }
                }
            }
            $('#includeMeta').prop('checked', meta);
            $('#splitlocn').prop('checked', split_locn);
            $('#mergeSelectMultiple').prop('checked', merge_select_multiple);
            $('#embedImages').prop('checked', embed_images);
            if(landscape) {
                $("#orient_landscape").prop("checked",true);
            } else {
                $("#orient_portrait").prop("checked",true);
            }
            $('#export_language').val(language);
            $('#tg_ad_filter').val(filter);
            if(dateId) {
                $('#export_date_question').val(dateId);
            }
            if(exp_from_date) {
                $('#exp_from_date').datetimepicker({
                    locale: gUserLocale || 'en',
                    useCurrent: false
                }).data("DateTimePicker").date(moment(exp_from_date));

                $('#r_name').focus();
            }
            if(exp_to_date) {
                $('#exp_to_date').datetimepicker({
                    locale: gUserLocale || 'en',
                    useCurrent: false
                }).data("DateTimePicker").date(moment(exp_to_date));
            }

            // Set button to save
            $('#publishReport').hide();
            $('#saveReport').show();

            setupReportDialog();        // Enable and disable controls

            $('#publish_popup').modal("show");
        });

        $('.repGenerate').click(function() {
            var $this = $(this);
            var i;

            gReportIdx = $this.closest('tr').data("idx");
            var report = gReportList[gReportIdx];

            downloadFile(location.origin + "/surveyKPI/action/" + report.ident);
            alert(localise.set["msg_ds_s"]);
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
        getReports();		// Refresh the shown reports

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

    /*
     * Set the selected form in the pick list
     */
    function setForm() {
        $('.shapeforms').find("input").each(function() {
            console.log($(this).val());
            if($(this).val() == gForm) {
                $(this).prop('checked', true);
            }
        }).get();
    }

    /*
     * Hide and show controls in the report dialog
     */
    function setupReportDialog() {
        var reportType = $('#reportType').val();
        $('.rt_dependent').hide();
        $('.' + reportType).show();
    }

});

