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
var gGeneratedList = [];
var gConfig;
var gReportIdx;
var gForm = 0;
var gSurveyList;
var gPanel;

window.gTasks = {
    cache: {
        surveyRoles: {}
    }
};

requirejs.config({
    baseUrl: '/js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '/js/app',
        moment: 'moment-with-locales.min',
       	lang_location: '/js'
    },
    shim: {
    	'app/common': ['jquery'],
        'app/data': ['jquery'],
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
         'slimscroll',
         'pace',
         'app/data',
         'bootstrap-datetimepicker.min'
         ], function($, common, globals, localise, bsfi, moment) {

	$(document).ready(function() {

		setCustomReports();			// Apply custom javascript
		setTheme();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML

		// Get the user details
        getLoggedInUser(projectChanged, false, true, undefined);

		$('#m_refresh').click(function() {
			checkLoggedIn(function() {
				getReports();
				getGeneratedReports();
			})
		});

		$('#generatedTab a').click(function (e) {
			panelChange($(this), 'generated');
		});
		$('#publishTab a').click(function (e) {
			panelChange($(this), 'publish');
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
            surveyChangedReports(setForm);
        });

        $('#addReport').click(function(){
        	if($('#publishPanel').hasClass('show')) {
		        $('#publish_form')[0].reset();
		        $('#e_tz').val(globals.gTimezone);
		        $('.role_select_roles').empty()
		        getSurveyRoles(gSurveyList[$('#survey').val()].id, undefined, true, true);

		        // Set button to create
		        $('#publishReport').show();
		        $('#saveReport').hide();
		        $('#publish_popup').modal("show");
	        }
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

	});

	/*
 	 * Respond to a panel being changed
     */
	function panelChange($this, name) {
		gPanel = name;

		$('.panel_dep').hide();
		$('.' + name).show();
	}

	function updateReport(edit) {

		var i;
        var sId = gSurveyList[$('#survey').val()].id;
        var name = $('#r_name').val();
        var reportType = $('#reportType').val();
        var includeMeta = $('#includeMeta').prop('checked');
		var includeReadOnly = $('#includeReadOnly').prop('checked');
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
        var forms = $(':radio:checked', '.shapeforms_bs4').map(function() {
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
		if(includeReadOnly) {
			report.parameters.push({
				k: "exp_ro",
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
	        contentType: "application/x-www-form-urlencoded",
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
                    alert(localise.set["msg_err_upd"] + " : " + xhr.responseText);	// alerts htmlencode
                }
            }
        });
    }

    function surveyChangedReports(callback, selectedRoles, setall) {

		var sId = gSurveyList[$('#survey').val()].id;
		var dateQuestionId = 0;

		getSurveyRoles(sId, selectedRoles, setall, true);

        // Set the survey meta data
        var sMeta = globals.gSelector.getSurvey(sId);
        if(!sMeta) {
	        getSurveyMetaSE(sId, undefined, false, true, true, dateQuestionId, callback);
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
     *  Get the name of a date question given its id
     */
    function getDateColName(id) {
	    var sMeta = globals.gSelector.getSurvey(gSurveyList[$('#survey').val()].id);
	    if(sMeta && sMeta.dates) {
		    for (i = 0; i < sMeta.dates.length; i++) {
		    	if(sMeta.dates[i].id == id) {
				    return(sMeta.dates[i].col);
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
		var tzString = globals.gTimezone ? "&tz=" + encodeURIComponent(globals.gTimezone) : "";
		var url="/surveyKPI/userList/temporary?action=report&pId=" + globals.gCurrentProject +tzString;

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

	}

	/*
     * Get generated reports
     */
	function getGeneratedReports() {

		/*
		 * Get reports that are accessible via a public link
		 */
		var tzString = globals.gTimezone ? "?tz=" + encodeURIComponent(globals.gTimezone) : "";
		var url="/surveyKPI/background_report/" + globals.gCurrentProject + tzString;

		addHourglass();
		$.ajax({
			url: url,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gGeneratedList = data;
				completeGeneratedList(data);
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
				tab[++idx] = addCacheBuster(link);
				tab[++idx] = '">';
				tab[++idx] = htmlEncode(action.name);
				tab[++idx] = '</a>';
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = htmlEncode(action.surveyName);
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
				tab[++idx] = '<div class="dropdown-menu" aria-labelledby="dropdownMenu' + i + '">';
				tab[++idx] = '<button class="dropdown-item repGenerate" type="button">' + localise.set["c_generate"] + '</button>';
				tab[++idx] = '<button class="dropdown-item repEdit" type="button">' + localise.set["c_edit"] + '</button>';
				tab[++idx] = '<button class="dropdown-item repDelete" type="button">' + localise.set["c_del"] + '</button>';
				tab[++idx] = '</div>';
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
						alert(localise.set["msg_err_upd"] + " : " + xhr.responseText);	// alerts htmlencode
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

			$('#survey').val(getSurveyIndex(report.action_details.surveyIdent));
			surveyChangedReports(setForm, report.action_details.roles, false);

			// Add parameters
			var meta = false;
			var readOnly = false;
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
				} else if(param.k === "exp_ro") {
					if(param.v === "true") {
						readOnly = true;
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
			$('#includeReadOnly').prop('checked', readOnly);
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
	 * Fill in the background generated report list
	 */
	function completeGeneratedList() {

		var i,
			tab = [],
			idx = -1,
			$generatedList = $('#generated_list');

		// Add the reports
		if(gGeneratedList) {
            for (i = 0; i < gGeneratedList.length; i++) {
				var genItem = gGeneratedList[i];
	            var link = typeof genItem.filename === "undefined" ? "#"
					: location.origin + "/surveyKPI/file/" + genItem.filename + "/report?reportname=" + genItem.report_name;
				// Add an extension to the report name
				if(typeof genItem.filename !== "undefined" ) {
					var extIdx = genItem.filename.lastIndexOf('.');
					if (extIdx > 0) {
						link += genItem.filename.substring(extIdx);
					}
				}

                tab[++idx] = '<tr data-idx="';
                tab[++idx] = i;
                tab[++idx] = '" data-link="';
                tab[++idx] = link;
	            tab[++idx] = '">';

				tab[++idx] = '<td>';
				tab[++idx] = genItem.id;
				tab[++idx] = '</td>';

	            tab[++idx] = '<td>';			// Anonymous Link
				if(genItem.status === 'complete') {
					tab[++idx] = '<a type="button" class="btn btn-block btn-primary';
					if(typeof genItem.filename === "undefined") {
						tab[++idx] = ' disabled'
					}
					tab[++idx] = '" href="';
					tab[++idx] = link;
					tab[++idx] = '">';
					tab[++idx] = htmlEncode(genItem.report_name);
					tab[++idx] = '</a>';
				} else {
					tab[++idx] = htmlEncode(genItem.report_name);
				}
	            tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				var rt = genItem.report_type;
				if(rt === 'survey') {
					rt = 'c_survey';
				}
				tab[++idx] = localise.set[rt];
				tab[++idx] = '</td>';

	            tab[++idx] = '<td>';
	            tab[++idx] = htmlEncode(genItem.userName);
	            tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = genItem.status_loc;
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = genItem.status_msg;
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = genItem.completed;
				tab[++idx] = '</td>';

				tab[++idx] = '<td>';
				tab[++idx] = genItem.duration;
				tab[++idx] = '</td>';

                tab[++idx] = '</tr>';

            }
        }

		$generatedList.html(tab.join(''));

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

        loadSurveys(globals.gCurrentProject, undefined, false, false, surveysLoaded, true, undefined, undefined);			// Get surveys
        getReports();		// Refresh the shown reports
		getGeneratedReports();

        saveCurrentProject(globals.gCurrentProject,
            globals.gCurrentSurvey,
            globals.gCurrentTaskGroup);
    }

	function surveysLoaded(data) {
		gSurveyList = data;
		surveyChangedReports();
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
        $('.shapeforms_bs4').find("input").each(function() {
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

	function getSurveyIndex(sIdent) {
		var i;
		for(i = 0; i < gSurveyList.length; i++) {
			if(gSurveyList[i].ident === sIdent) {
				return i;
			}
		}
		return 0;
	}


});

