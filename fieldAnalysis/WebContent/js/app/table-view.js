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
 * Show an entire survey in a table
 */
var gSelectedTemplate,          // Survey ident of the current template
	gInstanceId,
	gExportUrl,
	gMedia,
	gDataLength,
	MAX_EXPORT_MEDIA = 500,
	MAX_EXPORT = 10000;

function setTableSurvey(view) {

	var $selHead = $('#p' + view.pId).find('.phead'),
		$selMain = $('#table_panel' + view.pId),
		$selFoot = $('#p' + view.pId).find('.pfoot'),
		$tabSelect,
		sMeta = globals.gSelector.getSurvey(view.sId),
		topForm = undefined,
		currentForm = undefined,
		idx,
		i,
		formIdx,
		data = view.results;

	$selHead.empty();
	$selMain.empty();

	/*
	 * Get the top table so it can be automatically selected
	 */
	if(view.fId) {
		topForm = view.fId;
	} else {
		$.each(sMeta.forms, function(j, item) {
			if(item.p_id == 0) {
				topForm = item.f_id;
			}
		});
	}

	/*
	 * Add table selector buttons
	 */
	$selHead.append('<form><div id="table_select' + view.pId + '"></div></form>');
	$tabSelect = $('#table_select' + view.pId);
	i = -1;
	currentForm = undefined;
	var btns = [];
	for(idx = 0; idx < data.length; idx++) {
		btns[++i] = '<input type="radio" id="radio' + view.pId + '_' + idx + 
				'" name="radio" value="' + idx + '"'; 
		if(data[idx].fId === topForm) {
			btns[++i] = ' checked="checked"';
			currentForm = idx;
		}
		btns[++i] = '/><label for="radio'+ view.pId + '_' + idx + '">' +
				htmlEncode(data[idx].formName) + '</label>';
		
	}
	$tabSelect.append(btns.join(''));
	$tabSelect.buttonset();
	
	function addChangeFunction (ident) {
		$tabSelect.find('input').change(function() {
			formIdx = $tabSelect.find('input:checked').val();
			showTable(formIdx, view, data[formIdx], data[formIdx].fId, ident);
		});
	}
	addChangeFunction(sMeta.survey_ident);

	if(typeof currentForm != "undefined") {
		// note: the current table may not have been loaded yet if the panels were re-loaded while data
		// was still being retrieved
		showTable(currentForm, view, data[currentForm], data[currentForm].fId, sMeta.survey_ident);
	}

	/*
	 * Enable the dialog to create a PDF of an instance or edit in WebForms
	 */
	$('#instance_functions_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, model:true,
			show:"drop",
			zIndex: 2000,
			buttons: [
		        {
		        	text: "Ok",
		        	click: function() {
		        		$(this).dialog("close");
		        	}
		        }
			]
		}
	);
	$('#download_edit, #download_pdf').button();
	
	$selFoot.find('.tDelete').button().off().click(function() {
		deleteAllTables(view.sId);
	});

    $selFoot.find('.tRestore').button().off().click(function() {
        restoreAllTables(view.sId);
        alert(localise.set["msg_restore_started"]);
    });

	$selFoot.find('.tArchive').button().off().click(function() {
		if(confirm(localise.set["msg_archive_data"])) {
			$('#archive_before_date').datepicker({ dateFormat: "yy-mm-dd" });
			$('#archive_data_popup').dialog("open");
		}
	});
	
	/*
	 * Enable the dialog to import data
	 */
	$('#load_data_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, model:true,
			show:"drop",
			zIndex: 2000,
			buttons: [
		        {
		        	text: localise.set["c_close"],
		        	click: function() {
		        		$(this).dialog("close");
		        	}
		        },
		        {
		        	text: localise.set["m_import"],
		        	click: function() {
		        		var importSource = $("input[name='import_source']:checked").val();
				        var fileSelect = $("#file_select").val();
				        var form = $('#form_select option:selected').val();
				        if(importSource === "file" && (!fileSelect || fileSelect.length === 0)) {
				        	alert(localise.set["msg_val_file"]);
				        } else if(importSource === "form" && form < 1) {
					        alert(localise.set["msg_pss"]);
				        } else {
					        importData();
				        }
		        	}
		        }
			]
		}
	);

	/*
 	 * Enable the dialog to archive data
 	 */
	$('#archive_data_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, model:true,
			show:"drop",
			zIndex: 2000,
			buttons: [
				{
					text: localise.set["c_close"],
					click: function() {
						$(this).dialog("close");
					}
				},
				{
					text: localise.set["c_archive_data"],
					click: function() {
						archiveCount(view.sId);
					}
				}
			]
		}
	);

	/*
     * Enable the dialog to export data
     */
	$('#export_data_alert').hide().removeClass('alert-danger').addClass('alert-success').html("");
	$('#export_data_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, model:true,
			show:"drop",
			zIndex: 2000,
			width:350,
			height:350,
			buttons: [
				{
					text: localise.set["c_close"],
					click: function() {
						$(this).dialog("close");
					}
				},
				{
					text: localise.set["m_export"],
					click: function() {
						exportData();
					}
				}
			]
		}
	);
	
	$selFoot.find('.tExport').button().off().click(function() {
		setupExportDialog(view, false);
	});

    $selFoot.find('.tExportMedia').button().off().click(function() {
		setupExportDialog(view, true);
    });
	
	$selFoot.find('.tImport').button().off().click(function() {

		if(globals.gSelector.surveys[view.sId].task_file) {
			document.forms.namedItem("loadtasks").reset();
			importSourceChanged("file");

			$('#survey_to_update').val(view.sId);
            $('#survey_to_update_name').text(view.sName);

            $('#load_tasks_alert').hide();
            $('#clear_existing_alert').hide();

			// Set the survey selector
			var surveyList = globals.gSelector.getSurveyList();
			if(!surveyList) {	// Surveys have not yet been retrieved
				var url = "/surveyKPI/surveys?blocked=true";

				if(typeof url !== "undefined") {
					$.ajax({
						url: url,
						cache: false,
						dataType: 'json',
						success: function(data) {
							setSurveyViewSurveys(data, "-1", '#form_select');
						},
						error: function(xhr, textStatus, err) {
							if(xhr.readyState == 0 || xhr.status == 0) {
								return;  // Not an error
							} else {
								$('#status_msg_msg').empty().text("Error: Failed to get a list of surveys");
								$("#status_msg").dialog("open");
							}
						}
					});
				}
			} else {
				$('#form_select option:selected').val("-1");    // No form selected
			}

            $('#load_data_popup').dialog("open");

		} else {
            alert(localise.set["a_ni"]);
		}
	});

	$('#clear_existing').change(function(){
		var isset = $("#clear_existing:checked").val();
		if(isset) {
			$('#clear_existing_alert').show();
		} else {
			$('#clear_existing_alert').hide();
		}
	});

	$('.import_source').change(function(){
		importSourceChanged($(this).val());
	});
	
}

function importSourceChanged(source) {

	$('.import_form,.import_file').hide();
	if(source === "form") {
		$('.import_form').show();
	} else {
		$('.import_file').show();
	}
}

function setUserTableSurvey(view) {

	var $selHead = $('#p' + view.pId).find('.phead'),
		$selMain = $('#table_panel' + view.pId),
		$selFoot = $('#p' + view.pId).find('.pfoot'),
		$tabSelect,
		idx,
		i,
		data = view.results;

	$selHead.empty();
	$selMain.empty();



	showUserTable(view);

	/*
	 * Enable the dialog to create a PDF of an instance or edit in WebForms
	 */
	$('#instance_functions_popup').dialog(
		{
			autoOpen: false, closeOnEscape:true, draggable:true, model:true,
			show:"drop",
			zIndex: 2000,
			buttons: [
				{
					text: "Ok",
					click: function() {
						$(this).dialog("close");
					}
				}
			]
		}
	);
	$('#download_edit, #download_pdf').button();

}

/*
 * Setup the export dialog
 */
function setupExportDialog(view, media) {

	gExportUrl = "/surveyKPI/surveyexchange/" + view.sId + "/" + cleanFileName(view.sName);
	gMedia = media;
	gDataLength = view.results[0].features.length;

	validateExport();

	$('#exp_s_name').text(view.sName);
	$('#export_data_popup').dialog("open");
	$('#exp_start_record,#exp_end_record').keyup(function() {validateExport()});
}

/*
 * Ensure the export data is within bounds
 */
function validateExport() {

	var maxLength = gMedia ? MAX_EXPORT_MEDIA : MAX_EXPORT;
	var msg = localise.set[gMedia ? "a_exp_media_msg" : "a_exp_msg"] + " " + localise.set["a_exp_msg2"];
	var valid = false;
	var startRec = $('#exp_start_record').val();
	var endRec = $('#exp_end_record').val();
	var length;

	if(typeof endRec === "undefined" || endRec === "") {
		endRec = gDataLength;
	}
	if(typeof startRec === "undefined" || startRec === "") {
		startRec = 0;
	} else {
	}

	length = endRec - startRec;

	if(length > maxLength) {
		msg = msg.replace("%s1", maxLength);
		msg = msg.replace("%s2", length);
		$('#export_data_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);
	} else if(length < 0) {
		$('#export_data_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["a_exp_start"]);
	} else {
		$('#export_data_alert').hide().removeClass('alert-danger').addClass('alert-success').html("");
		valid = true;
	}
	return valid;
}
/*
 * Export data
 */
function exportData() {
	if(validateExport()) {

		var startRec = $('#exp_start_record').val();
		var endRec = $('#exp_end_record').val();
		var url = gExportUrl;
		var hasParam = false;

		if(gMedia) {
			url += "?media=true";
			hasParam = true;
		}
		if(startRec && startRec !== "") {
			url += (hasParam ? "&" : "?") + "start=" + startRec;
			hasParam = true;
		}
		if(endRec && endRec !== "") {
			url += (hasParam ? "&" : "?") + "end=" + endRec;
			hasParam = true;
		}
		downloadFile(url);
		$('#export_data_popup').dialog("close");
	}
}

function getRecordNumber($element) {

}

/*
 * Import data
 */
function importData() {
	var url = "/surveyKPI/assignments/load";
	var f = document.forms.namedItem("loadtasks");
	var formData = new FormData(f);
	
	$('#load_tasks_alert').hide();
	addHourglass();
	$.ajax({
		  type: "POST",
		  data: formData,
		  cache: false,
          contentType: false,
          dataType: "json",
          processData:false,
		  url: url,
		  success: function(data, status) {
			  removeHourglass();
			  
			  var idx = -1,
			  	h = [],
			  	i;
			  
			  if(!data || data.length === 0) {
				  $('#load_data_popup').dialog("close");
			  } else {
				  for(i = 0; i < data.length; i++) {
					h[++idx] = '<ul>';
					  	h[++idx] = '<li>';
					  	h[++idx] = data[i];
						h[++idx] = '</li>';
					h[++idx] = '</ul>';
				  }
				  $('#load_tasks_alert').show().removeClass('alert-danger').addClass('alert-success').html(h.join(''));  
			  }
			  
			  refreshAnalysisData();
		  },
		  error: function(xhr, textStatus, err) {
			  removeHourglass(); 			 
			  var msg = xhr.responseText;
			  if(msg && msg === "only csv") {
				  msg = localise.set["t_efnl"] + " " + localise.set["msg_csv"];
			  } else {
				  msg = localise.set["t_efnl"] + " " + xhr.responseText;
			  }

			  $('#load_tasks_alert').show().removeClass('alert-success').addClass('alert-danger').html(msg);
			 
		  }
	});
}

function deleteAllTables(sId) {

	// Get the groups
	addHourglass();
    $.ajax({
        url: "/surveyKPI/surveyResults/" + sId + "/groups",
        cache: false,
        dataType: 'json',
        success: function (response) {
            removeHourglass();

            if(response.length > 1) {
            	var surveyList = "";
            	for(i = 0; i < response.length; i++) {
            		if(sId != response[i].sId) {
                        if (surveyList.length > 0) {
                            surveyList += ", ";
                        }
                        surveyList += response[i].surveyName;
                    }
				}
                var decisionGroups = confirm(localise.set["msg_del_groups"] + " " + surveyList);
                if(decisionGroups == false) {
                	return;
				}
			}
            var decision = confirm(localise.set["msg_del_data"]);
            if (decision == true) {
                var msg2 = localise.set["msg_del_data2"];
                var decision2 = confirm(msg2);
                if(decision2 == true) {
                    addHourglass();
                    $.ajax({
                        type : 'Delete',
                        url : deleteSurveyDataURL(sId),
                        cache: false,
                        success : function(response) {
                            removeHourglass();
                            refreshAnalysisData();
                        },
                        error: function(xhr, textStatus, err) {
                            removeHourglass();
                            if(xhr.readyState == 0 || xhr.status == 0) {
                                return;  // Not an error
                            } else {
                                console.log(xhr);
                                alert(localise.set["msg_err_del"] + " " + err);
                            }
                        }
                    });
                }
            }
        },
        error: function (xhr, textStatus, err) {
            removeHourglass();
            if (xhr.readyState == 0 || xhr.status == 0) {
                return;  // Not an error
            } else {
                console.log(xhr);
                alert(localise.set["error"] + " " + err);
            }
        }
    });

}

function restoreAllTables(sId) {
    var msg = localise.set["msg_res_data"];
    var decision = confirm(msg);
    if (decision == true) {
        var msg2 = localise.set["msg_del_data2"];
        var decision2 = confirm(msg2);
        if(decision2 == true) {
            addHourglass();
            $.ajax({
                url: "/surveyKPI/surveyResults/" + sId + "/restore",
                cache: false,
                success: function (response) {
                    removeHourglass();
                    setTimeout(refreshAnalysisData, 5000);
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        console.log(xhr);
                        alert(localise.set["error"] + " " + err);
                    }
                }
            });
        }
	}
}

/*
 * Check how many records are to be archived
 * Then, if the user confirms, start the archive
 */
function archiveCount(sId) {

	var before = $('#archive_before_date').datepicker({ dateFormat: 'yy-mm-dd' }).val();
	if(before === '') {
		$('#archive_data_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["msg_archive_before"]);
		return;
	}
	addHourglass();
	$.ajax({
		url: "/surveyKPI/surveyResults/" + sId + "/archivecount?startDate=" + before + "&tz=" + encodeURIComponent(globals.gTimezone),
		dataType: 'json',
		cache: false,
		success: function (response) {
			removeHourglass();
			if(response.count > 0) {
				var msg = localise.set["msg_archive"];
				msg = msg.replace("%s1", response.count);
				msg = msg.replace("%s2", before);
				msg = msg.replace("%s3", response.surveys.join(","));
				if(confirm(msg)) {
					archiveAllTables(sId);
				}
			} else {
				$('#archive_data_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["msg_archive_none"]);
			}
			setTimeout(refreshAnalysisData, 5000);
		},
		error: function (xhr, textStatus, err) {
			removeHourglass();
			if (xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["error"] + " " + err);
			}
		}
	});

}

function archiveAllTables(sId) {

	var before = $('#archive_before_date').datepicker({ dateFormat: 'yy-mm-dd' }).val();

	addHourglass();
	$.ajax({
		url: "/surveyKPI/surveyResults/" + sId + "/archive?startDate=" + before + "&tz=" + encodeURIComponent(globals.gTimezone),
		dataType: 'json',
		cache: false,
		success: function (response) {
			removeHourglass();
			if(response.count > 0) {
				var msg = localise.set["msg_archive_done"];
				msg = msg.replace("%s1", response.count);
				msg = msg.replace("%s2", before);
				msg = msg.replace("%s3", response.archives.join(","));
				$('#archive_data_alert').show().removeClass('alert-danger').addClass('alert-success').text(msg);
			} else {
				$('#archive_data_alert').show().removeClass('alert-success').addClass('alert-danger').text(localise.set["msg_archive_none"]);
			}
			setTimeout(refreshAnalysisData, 5000);
		},
		error: function (xhr, textStatus, err) {
			removeHourglass();
			if (xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["error"] + " " + err);
			}
		}
	});

}

function showTable(tableIdx, view, tableItems, fId, survey_ident) {

	var elemMain = 'table_panel' + view.pId,
		$selMain = $('#'+ elemMain);
	
	$selMain.empty();
	view.fId = fId;		// Save current form id for the export function

	if(view.dirty) {
		view.dirty = false;
		view.currentFormId = fId;
		refreshAnalysisData();
		return;
	}
	
	if(tableItems && tableItems.features && tableItems.features.length > 0) {
		generateTable(elemMain, tableItems, "", survey_ident, view.sId);
		addRightClickToTable($selMain, view.sId, view);
		$selMain.find('table').tablesorter();
		addMoreLessButtons($selMain, view, fId, tableItems);
	} else {
        if(typeof tableItems.message !== "undefined" && tableItems.message.trim().length > 0) {
            $selMain.html(tableItems.message);
        } else if(typeof tableItems.totals !== "undefined" && tableItems.totals.total_count > 0) {
            $selMain.html(localise.set["an_nmd"]);
        } else {
            $selMain.html(localise.set["an_nd"]);
        }
	}
}

function showUserTable(view) {

	var elemMain = 'table_panel' + view.pId,
		$selMain = $('#'+ elemMain),
		tableItems = view.results[0];

	$selMain.empty();

	if(tableItems && tableItems.features && tableItems.features.length > 0) {
		generateUserTable(elemMain, tableItems, view.user_ident, view.uId, view.subject_type);
		addRightClickToTable($selMain, view.sId, view);
		$selMain.find('table').tablesorter();
		addMoreLessUserButtons($selMain, view);
	} else {
		if(typeof tableItems.message !== "undefined" && tableItems.message.trim().length > 0) {
			$selMain.html(tableItems.message);
		} else if(typeof tableItems.totals !== "undefined" && tableItems.totals.total_count > 0) {
			$selMain.html(localise.set["an_nmd"]);
		} else {
			$selMain.html(localise.set["an_nd"]);
		}
	}
}

function addMoreLessButtons($elem, tView, fId, tItems) {
	$elem.find('.get_less').button().click(function() {
		tView.tableCount = 1;
		var currentStart = tView.start_recs[fId].pop();
		var newStart = tView.start_recs[fId].pop();
		processSurveyData(fId, tView.sId, tView, tItems.survey, true, newStart);
	});
	$elem.find('.get_more').button().click(function() {
		tView.tableCount = 1;
		processSurveyData(fId, tView.sId, tView, tItems.survey, true, parseInt($(this).val()));
	});
	$elem.find('.get_less_dis, .get_more_dis').button({ disabled: true });
}

function addMoreLessUserButtons($elem, view) {
	$elem.find('.get_less').button().click(function() {
		var currentStart = view.start_recs[0].pop();
		var newStart = view.start_recs[0].pop();
		getUserData(view, newStart);
	});
	$elem.find('.get_more').button().click(function() {
		getUserData(view, parseInt($(this).val()));
	});
	$elem.find('.get_less_dis, .get_more_dis').button({ disabled: true });
}

/*
 * Called to display a table with question data
 */
function setTableQuestion(view) {
	
	var $selHead = $('#p' + view.pId).find('.phead'),
		elemMain = 'table_panel' + view.pId,
		$selMain = $('#' + elemMain),
		$selFoot = $('#p' + view.pId).find('.pfoot'),
		disp_desc,
		data;

	$selHead.empty();
	$selMain.empty();

	if(view.results) {
		data = view.results[0];
		disp_desc = getDisplayDescription(data.fn, "graph", data.survey, data.question, data.group, undefined, 
				data.qtype, data.date_question,
				data.start, data.end, data.interval, data.units, data.filter);
		data.caption = disp_desc;
	}

	
	/*
	 * Get all the features for all the items in this form, 
	 */ 
	if(data) {
		generateTable(elemMain, data, disp_desc, undefined, 0);
		addRightClickToTable($selMain, view.sId);
	} else {
		$selHead.html(localise.set["an_nd"]);
	}

	$selFoot.find('.tExport,.tExportMedia').hide();		// Export of table level data from question view no longer supported
	$selFoot.find('.tImport').hide();
	$selFoot.find('.tDelete').hide();
    $selFoot.find('.tRestore').hide();
	$selFoot.find('.tArchive').hide();
	
}

function getTablePanel() {
	for (var i = 0; i < globals.gSelector.getViews().length; i++) {
		if (globals.gSelector.getViews()[i].title == "Table"){
			return globals.gSelector.getViews()[i];
		}
	}
	
	return {};
}

/*
 * Toggle the setting of the _bad attribute for the passed in data record
 */
function toggleBad($elem, fId, pKey, value, sId, theView) {
	
	var toValue,
		toBeBad;
	
	if(value == "f" || value == "No") {
		toBeBad = "true";
		toValue = "Yes";
	} else {
		toBeBad = "false";
		toValue = "No";
	}
	
	var reason = prompt(localise.set["msg_reason"],"");
	
	$.ajax({
		  type: "POST",
		  dataType: 'text',
		  cache: false,
		  contentType: "application/json",
		  data: { value: toBeBad, sId: sId, reason: reason},
		  url: toggleBadURL(fId, pKey),
		  success: function(data, status) {
			  $elem.text(toValue);
			  $elem.next().text(reason);
			  $elem.toggleClass('bad_r').toggleClass('good_r');
			  if(theView) {
				  theView.dirty = true;
			  }
		  }, error: function(data, status) {
			  alert(data.responseText);
			  //alert("Error: Failed to update record"); 
		  }
	});
	
}

/*
 * Add a right click function to all anchors beneath the passed in element that will add the media item to the report
 * Also add a function to toggle the "bad" status of a record
 */
function addRightClickToTable($elem, sId, view) {
	
	function toggleBadFn(survey, theView) {
		$elem.find('.bad_r, .good_r').off().bind("contextmenu", function(e) {
			var $this = $(this);
			var pkey = $this.attr("pkey");
			var fId = $this.closest('table').attr("form");
			var value = $this.text();
			toggleBad($this, fId, pkey, value, survey, theView);
			return false;
		});
	}
	
	function tableEditFn(survey, theView) {
		
		$elem.find('.menu_button').off().click(function(e) {
			var $this = $(this);
			var pkey = $this.data("pkey");
			var survey_ident = $this.data("ident");	
			var isBad = $this.parent().parent().find('.bad_r').size() !== 0;
			var isReplaced = $this.parent().parent().find('.bad_replaced').size() !== 0;
			var sId =  $this.data("id");	
			var instanceid = $this.data("instanceid");

			populateLanguageSelect(sId, $('#download_language'));
			populatePdfSelect(sId, $('#select_pdf'));

			gSelectedTemplate = survey_ident;
			gInstanceId = instanceid;
			
			if((isBad && isReplaced) || (!globals.gIsAnalyst && !globals.gIsManage)) {
				$('#download_edit').button("disable");
			} else {
				$('#download_edit').button("enable");
				if(view.subject_type === "survey") {
					$('#download_edit').attr("href", "/webForm/" + survey_ident + "?datakey=prikey&datakeyvalue=" + pkey);
				} else if(view.subject_type === "user") {
					$('#download_edit').attr("href", "/webForm/" + survey_ident + "?datakey=instanceid&datakeyvalue=" + instanceid);
				}
				$('#download_edit').click(function () {
                    $('#instance_functions_popup').dialog("close");
				});
			}
			
			$('#instance_functions_popup').dialog("open");
			
			return false;
		});
		
	}
	
	toggleBadFn(sId, view);
	tableEditFn(sId, view);
}

$('#download_pdf').click(function () {

	var docURL,
		language,
		pdf_template,
		orientation,
		include_references,
		launched_only

	language = $('#download_language option:selected').val();
	pdf_template = $('#select_pdf').val();
	orientation = $("input[name='orientation']:checked", "#instance_functions_popup").val();
	include_references = $("#include_references", "#instance_functions_popup").prop('checked');
	launched_only = $("#launched_only", "#instance_functions_popup").prop('checked');

	downloadPdf(language, orientation, include_references, launched_only, gSelectedTemplate, gInstanceId, pdf_template);
	
	//window.location.href = docURL;
	$('#instance_functions_popup').dialog("close");
});

