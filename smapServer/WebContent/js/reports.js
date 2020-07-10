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
var gReportTypeList = [];
var gCustomReportList = [];
var gConfig;
var gReportIdx;
var gCustomReportIdx;
var gForm = 0;
var gSurveyList;

window.gTasks = {
    cache: {
        surveyRoles: {}
    }
};

requirejs.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
	    jquery: 'jquery',
        moment: 'moment-with-locales.min',
       	lang_location: '../'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery'],
    	'icheck': ['jquery'],
    	'metismenu': ['jquery'],
    	'slimscroll': ['jquery'],
        'bootstrap-datetimepicker.min': ['moment']
    }
});

require([
         'jquery',
         'app/common',
         'app/globals',
         'app/localise',
         'bootstrapfileinput',
         'moment',
         'metismenu',
         'slimscroll',
         'pace',
         'app/data',
         'icheck',
         'bootstrap-datetimepicker.min'
         ], function($, common, globals, localise, bsfi, moment) {

	$(document).ready(function() {

        setCustomReports();			// Apply custom javascript
		setupUserProfile(true);
		localise.setlang();		// Localise HTML
		$("#side-menu").metisMenu();

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
        $('#survey, #c_survey').change(function() {
            surveyChanged(setForm);
        });

        $('#addReport').click(function(){
	        $('#e_tz').val(globals.gTimezone);
        	if($('#publicPanel').hasClass('show')) {
		        $('#publish_form')[0].reset();

		        $('.role_select_roles').empty()
		        getSurveyRoles(gSurveyList[$('#survey').val()].id, undefined, true);

		        // Set button to create
		        $('#publishReport').show();
		        $('#saveReport').hide();
		        $('#publish_popup').modal("show");
	        } else if($('#customPanel').hasClass('show')) {

        		$('#custom_form')[0].reset();
		        addCustomReportTypes();
		        $('.custom_section').hide();
		        $('.custom_type_' + $('#customType').val()).show();

		        // Set button to create
		        $('#customReport').show();
		        $('#saveCustomReport').hide();
		        $('#custom_popup').modal("show");
	        }
		});

		$('#customType').change(function(){
			$('.custom_section').hide();
			$('.custom_type_' + $('#customType').val()).show();
		});

        $('#publishReport').click(function () {
            updateReport(false);
        });

        $('#saveReport').click(function () {
            updateReport(true);
        });

		$('#customReport').click(function () {
			updateCustomReport(false);
		});

		$('#saveCustomReport').click(function () {
			updateCustomReport(true);
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

        $('#enabletransform').change(function() {
	        if($(this).prop('checked')) {
	            $('.transformenabled').show();
	        } else {
		        $('.transformenabled').hide();
            }
        });

		/*
		 * Add date time picker to report month date
		 */
		moment.locale();
		$('#reportMonth').datetimepicker({
			useCurrent: false,
			format: "MM/YYYY",
			viewMode: "months",
			locale: gUserLocale || 'en'
		}).data("DateTimePicker").date(moment());

		$('#generateCustomReport').click(generateCustomReport);

	});

	function updateReport(edit) {

		var i;
        var sId = gSurveyList[$('#survey').val()].id;
        var name = $('#r_name').val();
        var reportType = $('#reportType').val();
        var includeMeta = $('#includeMeta').prop('checked');
        var odata2Data = $('#odata2Data').prop('checked');
        var split_locn = $('#splitlocn').prop('checked');
        var merge_select_multiple = $('#mergeSelectMultiple').prop('checked');
        var landscape = $('#orient_landscape').prop('checked');
        var embed_images = $('#embedImages').prop('checked');
        var language = $('#export_language').val();
		var tz = $('#e_tz').val();                      // Since the export is being saved use a local version of tz
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

        var report = {
            parameters: [],
            roles: [],
            transform: {
            	transforms: []
            },
            name: name,
            reportType: reportType
        };

		if(filename && filename.trim().length > 0) {
			report.filename = filename;
		}

		/*
         * Add Transform
         */
        report.transform.enabled = $('#enabletransform').prop('checked');

		report.transform.key_questions = [];                                    // Key questions
		var keyString = $('#t_keys').val();
		if(keyString) {
			var keysArray = keyString.split(',');
			if (keysArray.length > 0) {
				for (i = 0; i < keysArray.length; i++) {
					if(keysArray[i].trim().length > 0) {
						report.transform.key_questions.push(keysArray[i].trim());
					}
				}
			}
		}

		// Repeating transforms
		var transforms = {};
		transforms.valuesQuestion = $('#t_values_question').val();      // values question

		transforms.values = [];                                         // Values
		var valuesString = $('#t_values').val();
		if(valuesString) {
			var valuesArray = valuesString.split(',');
			if (valuesArray.length > 0) {
				for (i = 0; i < valuesArray.length; i++) {
					if(valuesArray[i].trim().length > 0) {
						transforms.values.push(valuesArray[i].trim());
					}
				}
			}
		}
		transforms.wideColumns = [];                                     // Wide Columns
		var colsString = $('#t_wide_columns').val();
		if(colsString) {
			var colsArray = colsString.split(',');
			if (colsArray.length > 0) {
				for (i = 0; i < colsArray.length; i++) {
					if(colsArray[i].trim().length > 0) {
						transforms.wideColumns.push(colsArray[i].trim());
					}
				}
			}
		}
		report.transform.transforms.push(transforms);

		/*
		 * Validate
		 */
        if(report.transform.enabled) {
	        // Validate keys
	        if(report.transform.key_questions.length == 0) {
		        alert(window.localise.set["rep_msg_min_keys"]);
		        return;
	        }
	        if(!report.transform.transforms[0].valuesQuestion) {
		        alert(window.localise.set["rep_msg_v_q"]);
		        return;
	        }
	        if(report.transform.transforms[0].values.length == 0) {
		        alert(window.localise.set["rep_msg_min_values"]);
		        return;
	        }
	        if(report.transform.transforms[0].wideColumns.length == 0) {
		        alert(window.localise.set["rep_msg_min_values"]);
		        return;
	        }
        }

        // Add roles
        $('input[type=checkbox]:checked', '.role_select_roles').each(function () {
            report.roles.push({
                id: $(this).val()
            });
        });

        // Validate Roles - ensure at least one role is selected
        if(gTasks.cache.surveyRoles[sId].length > 0  && report.roles.length == 0) {
            alert(window.localise.set["msg_one_role"]);
            return;
        }

        /*
         * create URL
         */
        var url = "/surveyKPI/reporting/link/" + sId;

        if(edit) {
			url += "?ident=" + gReportList[gReportIdx].ident;
		}

        /*
         * Add parameters
         */
        if(form > 0) {
            report.parameters.push({
               k: "form",
               v: form
            });
        }
        if(includeMeta) {
	        report.parameters.push({
		        k: "meta",
		        v: "true"
	        });
        }
        if(odata2Data) {
	        report.parameters.push({
		        k: "odata2",
		        v: "true"
	        });
        }
        if(split_locn) {
	        report.parameters.push({
		        k: "split_locn",
		        v: "true"
	        });
        }
        if(dateId != 0) {
	        report.parameters.push({
		        k: "dateId",
		        v: dateId
	        });
        }
        if(exp_from_date) {
	        report.parameters.push({
		        k: "startDate",
		        v: exp_from_date
	        });
        }
        if(exp_to_date) {
	        report.parameters.push({
		        k: "endDate",
		        v: exp_to_date
	        });
        }
        if(merge_select_multiple) {
	        report.parameters.push({
		        k: "merge_select_multiple",
		        v: "true"
	        });
        }
        if(embed_images) {
	        report.parameters.push({
		        k: "embed_images",
		        v: "true"
	        });
        }
        if(landscape) {
	        report.parameters.push({
		        k: "landscape",
		        v: "true"
	        });
        }
        if(language != "none") {
	        report.parameters.push({
		        k: "language",
		        v: language
	        });
        }
		if(tz) {
			report.parameters.push({
				k: "tz",
				v: tz
			});
			url += (url.indexOf('?') >= 0) ? '&' : '?';
			url += "tz=" + encodeURIComponent(tz);     // Also add timezone to URL
		}

        if(filter && filter.length > 0) {
	        report.parameters.push({
		        k: "filter",
		        v: filter
	        });
        }

        addHourglass();
        $.ajax({
            url: url,
	        type: "POST",
	        contentType: "application/json",
            cache: false,
	        data: { report: JSON.stringify(report) },
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

	function updateCustomReport(edit) {

		var questions = globals.gSelector.getSurveyQuestions(gSurveyList[$('#c_survey').val()].id, "none");
		var i;
		var sIdent = gSurveyList[$('#c_survey').val()].ident;
		var name = $('#c_name').val();
		var reportType = $('#customType').val();

		// Validation
		if(!sIdent) {
			alert(localise.set["a_exp_leg1"]);
			return;
		} else if (!name || name.trim().length == 0) {
			alert(localise.set["msg_val_nm"]);
			$('#r_name').focus();
			return;
		}

		var report = {
			sIdent: sIdent,
			dateColumn: getDateName($('#custom_date_q').val())
		};

		// Add columns
		report.columns = [];
		var cols = $(".c_column:checked").map(function(){
			return $(this).val();
		}).toArray();
		for(i = 0; i < cols.length; i++) {
			var col = {};
			col.column = questions[cols[i]].name;
			report.columns.push(col);
		}

		/*
		 * create URL
		 */
		var url = "/surveyKPI/custom_reports/"
				+ globals.gCurrentProject + "/"
				+ sIdent + "/"
				+ reportType + "/" + encodeURIComponent(name);
		if(edit) {
			url += "?id=" + gCustomReportList[gCustomReportIdx].id;
		}

		addHourglass();
		$.ajax({
			url: url,
			type: "POST",
			contentType: "application/json",
			cache: false,
			data: { report: JSON.stringify(report) },
			success: function (data) {
				removeHourglass();
				getReports();
				$('#custom_popup').modal("hide");
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

	    var isCustom = $('#customPanel').hasClass('show');
		var sId;
        var dateQuestionId = 0;

	    if(isCustom) {
		    sId = gSurveyList[$('#c_survey').val()].id;
		    getQuestionList(sId, "none", 0, "-1", showCustomColumns, false, undefined, undefined, undefined);
	    } else {
		    sId = gSurveyList[$('#survey').val()].id;
		    getSurveyRoles(sId, undefined, true);
	    }

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
		    };
		    getViewLanguages(view);
	    } else {
		    setSurveyViewLanguages(languages, undefined, '#export_language', true);
	    }

    }

    /*
     * Update the custom columns in the custom dialog
     */
    function showCustomColumns() {
    	var i,
		    idx = -1,
		    h =[];
    	var questions = globals.gSelector.getSurveyQuestions(gSurveyList[$('#c_survey').val()].id, "none");

	    h[++idx] = '<div class="row">';
    	h[++idx] = '<div class="col-sm-offset-1 col-sm-1">';
    	h[++idx] = '</div>';
	    h[++idx] = '<div class="col-sm-5">';
	    h[++idx] = localise.set["c_question"];
	    h[++idx] = '</div>';
	    h[++idx] = '<div class="col-sm-5">';
	    h[++idx] = localise.set["rep_ch"];
	    h[++idx] = '</div>';
	    h[++idx] = '</div>';


    	for(i = 0; i < questions.length; i++) {
    		h[++idx] = '<div class="row">';

    		// Checkbox
	        h[++idx] = '<div class="col-sm-offset-1 col-sm-1">';
	        h[++idx] = '<div class="checkbox">';
	        h[++idx] = '<input type="checkbox" class="c_column" value="';
	        h[++idx] = i;
	        h[++idx] = '">';
		    h[++idx] = '</div>';
		    h[++idx] = '</div>';    // end checkbox

		    // Name
	        h[++idx] = '<div class="col-sm-5">';
	        h[++idx] = '<span>';
	        h[++idx] = questions[i].name;
		    h[++idx] = '</span>';
		    h[++idx] = '</div>';

		    // Title
		    h[++idx] = '<div class="col-sm-5">';
		    h[++idx] = '<input type="text" value="';
		    h[++idx] = '';
		    h[++idx] = '" class="form-control" />';
		    h[++idx] = '</div>';

    		h[++idx] = '</div>';    // end row
	    }
    	$('#columnsHere').empty().html(h.join(''));

	    if(gConfig && gConfig.columns && gConfig.columns.length > 0) {
		    for(i = 0; i < gConfig.columns.length; i++) {
			    $('.c_column', '#columnsHere').each(function(){
				    var $this = $(this);
			    })
			    $(':checkbox[value=' + getQuestionIndex(gConfig.columns[i], questions) + ']', '#columnsHere').prop("checked","true");
		    }
	    }
    }

    /*
     *  Get the name of a date question given its id
     */
    function getDateName(id) {
	    var sMeta = globals.gSelector.getSurvey(gSurveyList[$('#survey').val()].id);
	    if(sMeta && sMeta.dates) {
		    for (i = 0; i < sMeta.dates.length; i++) {
		    	if(sMeta.dates[i].id == id) {
				    return(sMeta.dates[i].name);
			    }
		    }
	    }
    }

	/*
     *  Get the id of a date question given its nae
     */
	function getDateId(name) {
		var sMeta = globals.gSelector.getSurvey(gSurveyList[$('#survey').val()].id);
		if(sMeta && sMeta.dates) {
			for (i = 0; i < sMeta.dates.length; i++) {
				if(sMeta.dates[i].name == name) {
					return(sMeta.dates[i].id);
				}
			}
		}
	}

	/*
	 * Get published reports
	 */
	function getReports() {

		/*
		 * Get reports that are accessible via a public link
		 */
		var url="/surveyKPI/userList/temporary?action=report&pId=" + globals.gCurrentProject;

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
				    var msg = xhr.responseText;
				    if(msg.indexOf("404 - Not Found") >= 0) {
				        msg = localise.set["msg_no_proj"];
                    }
				    alert(localise.set["error"] + ": " + msg);
				}
			}
		});

		/*
         * Get custom reports
         */
		var url="/surveyKPI/custom_reports?pId=" + globals.gCurrentProject;

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gCustomReportList = data;
				completeCustomReportList(data);
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					var msg = xhr.responseText;
					if(msg.indexOf("404 - Not Found") >= 0) {
						msg = localise.set["msg_no_proj"];
					}
					alert(localise.set["error"] + ": " + msg);
				}
			}
		});


		/*
		 * Get custom report types
		 */
		url = '/surveyKPI/custom_reports/types';

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gReportTypeList = data;
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["error"] + ": " + msg);
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
	            var link = location.origin + "/surveyKPI/action/" + gReportList[i].ident;

                tab[++idx] = '<tr data-idx="';
                tab[++idx] = i;
                tab[++idx] = '" data-link="';
                tab[++idx] = link;
	            tab[++idx] = '">';

	            tab[++idx] = '<td>';			// Anonymous Link
	            tab[++idx] = '<a type="button" class="btn btn-block btn-primary" href="';
	            tab[++idx] = link;
	            tab[++idx] = '">';
	            tab[++idx] = action.name;
	            tab[++idx] = '</a>';
	            tab[++idx] = '</td>';

	            tab[++idx] = '<td>';
	            tab[++idx] = action.surveyName;
	            tab[++idx] = '</td>';

                tab[++idx] = '<td>';			// Copy Link
                tab[++idx] = '<button type="button" class="btn btn-default has_tt copyLink" title="';
                tab[++idx] = localise.set["c_cl"];
                tab[++idx] = '" value="';
                tab[++idx] = i;
                tab[++idx] = '"><i class="fa fa-share-alt"></i></button>';
                tab[++idx] = '</td>';

                tab[++idx] = '<td>';
                tab[++idx] = '<div class="dropdown">';
                tab[++idx] = '<button id="dropdownMenu' + i + '" class="btn btn-default dropdown-toggle report_action" data-toggle="dropdown"  type="button" aria-haspopup="true" aria-expanded="false">';
                tab[++idx] = localise.set["c_action"];
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
        	var $this = $(this);
            var copyText = $this.closest('tr').data("link");

            // From https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery
            var $temp = $("<input>");
            $("body").append($temp);
	        $temp.val(copyText).select();
            document.execCommand("copy");

            $this.attr('title', localise.set["c_c"] + ": " + copyText).tooltip('_fixTitle').tooltip('show');
            $temp.remove();

        });
		$('.copyLink').on('hidden.bs.tooltip', function () {
			$(this).attr('title', localise.set["c_cl"]).tooltip('_fixTitle');
		})

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
        $('.repDelete', $reportList).click(function() {
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

        $('.repEdit', $reportList).click(function() {
            var $this = $(this);
            var i;

            gReportIdx = $this.closest('tr').data("idx");
            var report = gReportList[gReportIdx];

            $('#publish_form')[0].reset();
            $('#r_name').val(report.action_details.name);

            $('#reportType').val(report.action_details.reportType);

            $('#survey').val(getSurveyIndex(report.action_details.sId));
            surveyChanged(setForm);

            getSurveyRoles(report.action_details.sId, report.action_details.roles);

            // Add parameters
            var meta = false;
            var split_locn = false;
            var odata2_data = false;
            var merge_select_multiple = false;
            var embed_images = false;
            var language = "none";
            var dateId = 0;
            var exp_from_date;
            var exp_to_date;
            var filter;
            var tz;
            var landscape;
            var transform = report.action_details.transform;
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
                } else if(param.k === "odata2") {
                    if(param.v === "true") {
                        odata2_data = true;
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
                } else if(param.k === "tz") {
	                tz = param.v;
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
            $('#odata2Data').prop('checked', odata2_data);
            $('#mergeSelectMultiple').prop('checked', merge_select_multiple);
            $('#embedImages').prop('checked', embed_images);
            if(landscape) {
                $("#orient_landscape").prop("checked",true);
            } else {
                $("#orient_portrait").prop("checked",true);
            }
            $('#export_language').val(language);
            if(tz) {
	            $('#e_tz').val(tz);
            }
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

            $('.transformenabled').hide();
            if(transform) {
	            $('#enabletransform').prop('checked', transform.enabled);
	            if(transform.enabled) {
		            $('.transformenabled').show();
                }
	            if(transform.key_questions) {
		            $('#t_keys').val(transform.key_questions.join(', '));
	            }
	            var transformDetails = transform.transforms[0];
	            if(transformDetails) {
		            $('#t_values_question').val(transformDetails.valuesQuestion);
		            if(transformDetails.values) {
			            $('#t_values').val(transformDetails.values.join(', '));
		            }
		            if(transformDetails.wideColumns) {
			            $('#t_wide_columns').val(transformDetails.wideColumns.join(', '));
		            }
	            }
            }

            // Set button to save
            $('#publishReport').hide();
            $('#saveReport').show();

            setupReportDialog();        // Enable and disable controls

            $('#publish_popup').modal("show");
        });

        $('.repGenerate', $reportList).click(function() {
            var $this = $(this);
            var i;

            gReportIdx = $this.closest('tr').data("idx");
            var report = gReportList[gReportIdx];

            downloadFile(location.origin + "/surveyKPI/action/" + report.ident);

	        $('#main_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_ds_s"]);
            setTimeout(function (){
                $( '#main_alert' ).hide();
            }, 2000);


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
				h[++idx] = '<div class="form-group row">';

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
     * Fill in the custom report list
     */
	function completeCustomReportList() {

		var i,
			tab = [],
			idx = -1,
			$reportList = $('#custom_report_list');

		// Add the reports
		if(gCustomReportList) {
			for (i = 0; i < gCustomReportList.length; i++) {
				var report = gCustomReportList[i];

				tab[++idx] = '<tr data-idx="';
				tab[++idx] = i;
				tab[++idx] = '">';

				tab[++idx] = '<td>';
				tab[++idx] = '<a type="button" class="btn btn-block btn-warning custom_report" href="#">';
				tab[++idx] = report.name;
				tab[++idx] = '</a>';
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = report.surveyName;
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = '<div class="dropdown">';
				tab[++idx] = '<button id="dropdownMenu' + i + '" class="btn btn-default dropdown-toggle report_action" data-toggle="dropdown"  type="button" aria-haspopup="true" aria-expanded="false">';
				tab[++idx] = localise.set["c_action"];
				tab[++idx] = '</button>';
				tab[++idx] = '<ul class="dropdown-menu" aria-labelledby="dropdownMenu' + i + '">';
				tab[++idx] = '<li><a class="repGenerate" href="#">' + localise.set["c_generate"] + '</a></li>';
				tab[++idx] = '<li><a class="repEdit" href="#">' + localise.set["c_edit"] + '</a></li>';
				tab[++idx] = '<li><a class="repDelete" href="#">' + localise.set["c_del"] + '</a></li>';
				tab[++idx] = '</ul>';
				tab[++idx] = '</div>';  // Dropdown class
				tab[++idx] = '</td>';
				tab[++idx] = '</tr>';
			}
		}

		$reportList.html(tab.join(''));

		// Add response to report being launched
		$('.custom_report', $reportList).click(function(){
			var $this = $(this);
			gCustomReportIdx= $this.closest('tr').data("idx");
			$('#custom_report_launch').modal("show");
		});

		/*
         * Delete
         */
		$('.repDelete', $reportList).click(function() {
			var $this = $(this);
			gCustomReportIdx = $this.closest('tr').data("idx");
			var report = gCustomReportList[gCustomReportIdx];

			addHourglass();
			$.ajax({
				url: "/surveyKPI/custom_reports/" + report.id,
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

		$('.repEdit', $reportList).click(function() {
			var $this = $(this);
			var i;

			gCustomReportIdx = $this.closest('tr').data("idx");
			var report = gCustomReportList[gCustomReportIdx];

			$('#report_params_form')[0].reset();

			// Set button to save
			$('#customReport').hide();
			$('#saveCustomReport').show();

			$('#custom_form')[0].reset();

			setupCustomReportDialog(report);


			$('#custom_popup').modal("show");
		});

		$('.repGenerate', $reportList).click(function() {
			var $this = $(this);
			gCustomReportIdx= $this.closest('tr').data("idx");
			$('#custom_report_launch').modal("show");


		});
	}

	/*
	 * Initialise the custom repor form
	 */
	function setupCustomReportDialog(report) {

		$('#c_survey').val(gCustomReportIdx);
		if(report) {
			gConfig = JSON.parse(report.config);
		} else {
			gConfig = undefined;
		}
		surveyChanged();

		if(report) {
			$('#c_name').val(report.name);
			$('#custom_date_q').val(getDateId(gConfig.dateColumn));

		}
		addCustomReportTypes();
	}

	function getQuestionIndex(col, questions) {
		var i;
		for(i = 0; i < questions.length; i++) {
			if(col.column === questions[i].name) {
				return i;
			}
		}
		return -1;
	}

    /*
     * Function called when the current project is changed
     */
    function projectChanged() {

        globals.gCurrentProject = $('#project_name option:selected').val();
        globals.gCurrentSurvey = -1;
        globals.gCurrentTaskGroup = undefined;

        loadSurveys(globals.gCurrentProject, undefined, false, false, surveysLoaded, true);			// Get surveys
        getReports();		// Refresh the shown reports

        saveCurrentProject(globals.gCurrentProject,
            globals.gCurrentSurvey,
            globals.gCurrentTaskGroup);

    }

	function surveysLoaded(data) {
		gSurveyList = data;
		surveyChanged();
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

    function addCustomReportTypes() {

    	var hostname = location.hostname,
		    h = [],
		    idx = -1,
		    i;

	    if(gReportTypeList && gReportTypeList.length > 0) {
	    	for(i = 0; i < gReportTypeList.length; i++) {
	    		h[++idx] = '<option value="';
	    		h[++idx] = gReportTypeList[i].id;
	    		h[++idx] = '">';
			    h[++idx] = gReportTypeList[i].name;
			    h[++idx] = '</option>';
		    }

	    }
	    $('#customType').empty().html(h.join(''));
    }

	function getSurveyIndex(sId) {
		var i;
		for(i = 0; i < gSurveyList.length; i++) {
			if(gSurveyList[i].id === sId) {
				return i;
			}
		}
		return 0;
	}

	function generateCustomReport() {
		var usageMsec = $('#reportMonth').data("DateTimePicker").date(),
			d = new Date(usageMsec),
			month = d.getMonth() + 1,
			year = d.getFullYear(),
			url = "/custom/report/daily/" + gCustomReportList[gCustomReportIdx].id + "/xls";

		url += "?year=" + year;
		url += "&month=" + month;

		$('#custom_report_launch').modal("hide");

		downloadFile(url);
	}
});

