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
 * Purpose: Review and modify collected data
 */
var gTextValues,
	gCurrentLanguage,
	gUpdate = {},
	gTextSelected = 0,	// checked
	gHasSelect = true,
	gHasText,
	gCountRecords = 0,
	gRelevance = [],
	gQuestions,
	gSecondaryChoices = {},
	gTextId,			// The id of the selected text question
	gTextOtherId;		// The id of the other selected text question

define(['jquery', 'localise', 'common', 'globals'], function($, lang, common, globals) {

	$(document).ready(function() {

		setupUserProfile(true);
		localise.setlang();		// Localise HTML
		/*
		 * Get the user details so we have the default project
		 * Then load the available projects for the user and load the surveys for the default project
		 */
		getLoggedInUser(getSurveyList, false, true);
		$('#text_update').prop("disabled", true).click(function () {
			textUpdate();
		});

		// Set change function on projects
		$('#project_name').change(function() {
			globals.gCurrentProject = $('#project_name option:selected').val();
			globals.gCurrentSurvey = -1;
			globals.gCurrentTaskGroup = undefined;

			saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);

			getSurveyList();
		});

		// Set change function on surveys
		$('#survey_name').change(function() {
			globals.gCurrentSurvey = $('#survey_name option:selected').val();

			saveCurrentProject(globals.gCurrentProject,
				globals.gCurrentSurvey,
				globals.gCurrentTaskGroup);	// Save the current survey id

			getReviewLanguageList();
		});

		// Set change function on languages
		$('#language_name').change(function() {
			getTextQuestions();
		});

		// Set change function on the text question
		$('#text_name').change(function() {
			var otherTargetSelected = $('#other_target_cb').is(':checked');
			if($('#text_name').val() < 0 && !otherTargetSelected) {
				alert(localise.set["msg_pk_sel"]);
				$('#review-container tbody').empty();
				return false;
			}
			getData();
			getRelevance();
		});

		// Set change function on the other text question
		$('#target_question_name').change(function() {
			getData();
		});

		// Set change function on the select by primary key checkbox
		$('#primary_key_cb').change(function() {
			var $this = $(this);
			if($this.is(':checked')) {
				$('#other_target_cb').prop('checked', true);
				$('#other_target_cb').prop("disabled", true).addClass("disabled");
				$('.not_pk_select').hide();
				$('.pk_select').show();
				getTextQuestions();
			} else {
				// 1. Hide form picker
				$('.pk_select').hide();
				$('.not_pk_select').show();
				$('#other_target_cb').prop("disabled", false).removeClass("disabled");
				$('#target_question_name_cont, .review_update_other').show();
				$('.review_update').prop("disabled", true).addClass("disabled");
				getTextQuestions();
			}
		});

		$('#form_name').change(function() {
			getTextQuestions();
		});

		// Set change function on the "other target" checkbox
		$('#other_target_cb').change(function() {
			var $this = $(this);
			if($this.is(':checked')) {
				$('#target_question_name_cont, .review_update_other').show();
				$('.review_update').prop("disabled", true).addClass("disabled");
				getData();
			} else {
				$('#target_question_name_cont, .review_update_other').hide();
				$('.review_update').prop("disabled", false).removeClass("disabled");
			}
		});
		$('#target_question_name_cont, .review_update_other').hide();

		// Add change functions to update dialog
		$('#tu_existing_option').change(function() {
			$('#tu_existing_text').val("");
			$('#tu_new_text').val("");
		});
		$('#tu_existing_text').change(function() {
			$('#tu_existing_option').val("");
			$('#tu_new_text').val("");
		});
		$('#tu_new_text').on('input', function() {
			$('#tu_existing_option').val("");
			$('#tu_existing_text').val("");
		});

		/*
		 * Enable Menu events
		 */
		$('#refreshMenu', 'click', function(e) {

			if(targetHasChanged()) {
				if (confirm(localise.set["msg_refresh"])) {
					gSecondaryChoices = {};	// Clear cache
					getData();
				}
			} else {
				gSecondaryChoices = {};	// clear cache
				getData();
			}
		});

		/*
		 * Add check prior to the user leaving the screen
		 */
		window.onbeforeunload = function() {
			if(targetHasChanged()) {
				return localise.set["msg_leave"];
			}
		};
	});

	$('#applyUpdate').click(function() {
		// TODO only save if value has changed
		var updateString,
			newValue,
			optionSelected,
			newUpdates = [];

		// Get the new value to be applied, first try the list of options
		newValue = $('#tu_existing_option option:selected').val();
		if(typeof newValue !== "undefined" && newValue !== "") {
			optionSelected = true;

		} else {

			newValue = $('#tu_existing_text option:selected').text();

			if(typeof newValue === "undefined" || newValue === "") {
				newValue = $('#tu_new_text').val();
			}
			if(typeof newValue === "undefined" || newValue === "") {
				alert(localise.set["msg_nv"]);
				if(gHasSelect) {
					$('#tu_existing_option').focus();
				} else if (gHasText) {
					$('#tu_existing_text').focus();
				} else {
					$('#tu_new_text').focus();
				}
				return false;
			}

		}

		for(i = 0; i < gUpdate.reviewItems.length; i++) {
			if(optionSelected) {
				newUpdates.push({
					q_id:  gRelevance[0].qId,
					r_id:  gUpdate.reviewItems[i].r_id,
					valueFilter: gUpdate.reviewItems[i].valueFilter,
					qFilter: gUpdate.reviewItems[i].qFilter,
					newValue: newValue,
					set: true
				});
				gUpdate.reviewItems[i].newValue = undefined;

				// If this is a select multiple then unselect the option that made the text question relevant
				if(gRelevance[0].type === "select") {
					newUpdates.push({
						q_id:  gRelevance[0].qId,
						r_id:  gUpdate.reviewItems[i].r_id,
						valueFilter: gUpdate.reviewItems[i].valueFilter,
						qFilter: gUpdate.reviewItems[i].qFilter,
						newValue: gRelevance[0].oname,
						set: false
					});
				}
			} else {
				gUpdate.reviewItems[i].newValue = newValue;
			}

		}

		// Set description of change
		gUpdate.description = localise.set["rev_rt"] + " (" + gUpdate.valueFilter + ") " + localise.set["c_in"] + " ";
		gUpdate.description += gCountRecords;
		if(optionSelected) {
			gUpdate.description += " " + localise.set["rev_rc"] + " (" + newValue + ") " + localise.set["rev_fc"] + " (";
			gUpdate.description += gRelevance[0].label + ")";
		} else {
			gUpdate.description += " " + localise.set["rev_rw"] + " (" + newValue + ")";
		}

		// Create combined list of all items to be updated
		gUpdate.reviewItems = gUpdate.reviewItems.concat(newUpdates);

		gUpdate.reason = $('#tu_reason').val();

		updateString = JSON.stringify(gUpdate);

		addHourglass();
		$.ajax({
			type: "POST",
			dataType: 'text',
			cache: false,
			url: "/surveyKPI/review/" + globals.gCurrentSurvey,
			data: { updates: updateString },
			success: function(data, status) {
				removeHourglass();
				getData();

			}, error: function(data, status) {
				removeHourglass();
				alert(localise.set["c_error"] + data.responseText);
			}
		});
		$(this).dialog("close");
	});


function getSurveyList() {
	loadSurveys(globals.gCurrentProject, undefined, false, false, getReviewLanguageList, false);
}


function getReviewLanguageList() {
	globals.gCurrentSurvey = $('#survey_name option:selected').val();
	if(globals.gCurrentSurvey) {
		getLanguageList(globals.gCurrentSurvey, getTextQuestions, false, '#language_name', false);
		getFormList(globals.gCurrentSurvey);
	}
}


function getTextQuestions() {
	var i,
		$text_name_full = $('#target_question_name'),
		$text_name = $('#text_name');

	gCurrentLanguage = $('#language_name option:selected').val();

	addHourglass();
	$.ajax({
		url: "/surveyKPI/questionList/" + globals.gCurrentSurvey + "/" + gCurrentLanguage + "/new?exc_read_only=true&exc_ssc=true&inc_meta=true",
		dataType: 'json',
		cache: false,
		success: function(data) {
			gQuestions = data;
			removeHourglass();

			var f_id = 0;
			if( $('#primary_key_cb').is(':checked')) {
				f_id = $('#form_name').val();
			}

			$text_name.empty();
			$text_name_full.empty();
			for(i = 0; i < data.length; i++) {
				if(f_id > 0 && f_id != data[i].f_id) {
					continue;		// Skip questions not in the selected form
				}
				var label = data[i].q ? data[i].q : '';
				if(data[i].type === "string" || data[i].type === "calculate" || data[i].type === "barcode") {
					$text_name.append('<option value="' + i + '">' + data[i].name + ' : ' + label + '</option>');
					$text_name_full.append('<option value="' + i + '">' + data[i].name + ' : ' + label + '</option>');
				} else if(data[i].type === "int" || data[i].type === "decimal" || data[i].type === "select1") {
					$text_name_full.append('<option value="' + i + '">' + data[i].name + ' : ' + label + '</option>');
				}
			}
			getData();
			getRelevance();

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["c_error"] + xhr.responseText);
			}
		}
	});
}

function getData() {
	var	$elem = $('#review-container tbody'),
		i,
		h = [],
		idx = -1,
		$textUpdate = $('#text_update'),
		otherTargetSelected = $('#other_target_cb').is(':checked'),
		textOtherOption = "",
		textVal = $('#text_name option:selected').val(),
		f_id = $('#form_name').val(),
		qId;

	if(textVal >= 0) {
		gTextId = gQuestions[textVal].id;
	} else {
		gTextId = textVal;		// A meta question
	}
	gTextOtherId = gQuestions[$('#target_question_name option:selected').val()].id;

	qId = gTextId;
	if(otherTargetSelected ) {
		textOtherOption = "?targetQuestion=" + gTextOtherId;
		if( $('#primary_key_cb').is(':checked')) {
			textOtherOption += "&f_id=" + f_id;
			qId = 0;
		}
	}

	$elem.empty();
	var url = "/surveyKPI/review/" + globals.gCurrentSurvey + "/results/distinct/" + qId + textOtherOption;


	addHourglass();
	$.ajax({
		url: url,
		dataType: 'json',
		cache: false,
		success: function(data) {

			removeHourglass();
			$textUpdate.button("disable");
			gTextValues = data;
			gTextSelected = 0;

			for(i = 0; i < data.length; i++) {
				h[++idx] = "<tr>";
				h[++idx] = '<td>';
				h[++idx] = data[i].text;
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = data[i].count;
				h[++idx] = '</td>';
				h[++idx] = '<td>';
				h[++idx] = '<button type="button" class="btn btn-light review_update" value="';
				h[++idx] = i;
				h[++idx] = '"><i class="fas fa-arrow-right"></i></button>';
				h[++idx] = '</td>';
				h[++idx] = '<td class="review_update_other">';
				h[++idx] = addSecondary(data[i], i);
				h[++idx] = '</td>';
				h[++idx] = "<tr>";
			}

			// Add row for other text update button
			h[++idx] = '<tr><td></td><td></td><td></td>';
			h[++idx] = '<td class="review_update_other">';
			h[++idx] = '<button id="target_update_btn" type="button">Update</button>';
			h[++idx] = '</td>';
			h[++idx] = '</tr>;'


			$elem.html(h.join(''));
			$('.review_update').click(function(e) {
				gTextIdx = $(this).val();
				textUpdate();
			});

			getSecondarySelects();

			$('#target_update_btn').button().click(function(e) {
				saveTargetResults();
			});

			if($('#other_target_cb').is(':checked')) {
				$('#target_question_name_cont, .review_update_other').show();
				$('.review_update').prop("disabled", true).addClass("disabled");
			} else {
				$('#target_question_name_cont, .review_update_other').hide();
				$('.review_update').prop("disabled", false).removeClass("disabled");
			}


		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			if(xhr.readyState == 0 || xhr.status == 0) {
				return;  // Not an error
			} else {
				alert(localise.set["c_error"] + xhr.responseText);
			}
		}
	});
}

function getRelevance() {

	var textVal = $('#text_name option:selected').val();
	if(textVal >= 0) {
		gTextId = gQuestions[textVal].id;

		addHourglass();
		$.ajax({
			url: "/surveyKPI/review/" + globals.gCurrentSurvey + "/relevance/" + gCurrentLanguage + "/" + gTextId,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				gRelevance = data;

			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + xhr.responseText);
				}
			}
		});
	}
}


function textUpdate() {

	var $tu_existing_text = $('#tu_existing_text'),
		$tu_existing_option = $('#tu_existing_option'),
		$text_change_list = $('#text_to_mod'),
		i,
		h = [],
		idx = -1;

	gUpdate = {};
	gUpdate.reviewItems = [];
	gCountRecords = 0;

	// Get selected values that are to be changed

	gUpdate.reviewItems.push(
		{
			q_id: gTextId
		}
	);
	gUpdate.qFilter = gTextId,
		gUpdate.valueFilter = gTextValues[gTextIdx].text;

	gCountRecords = parseInt(gTextValues[gTextIdx].count);
	$text_change_list.html(gTextValues[gTextIdx].text);

	// Add existing option selection options

	gHasSelect = false;
	// Assume just one relevant question for now
	h[++idx] = '<option value=""></option>';
	if(gRelevance.length > 0) {
		for(i = 0; i < gRelevance[0].options.length; i++) {
			gHasSelect = true;
			h[++idx] = '<option value="';
			h[++idx] = gRelevance[0].options[i].name;
			h[++idx] = '">';
			h[++idx] = gRelevance[0].options[i].label;
			h[++idx] = '</option>';
		}
	}
	$tu_existing_option.empty().html(h.join(''));
	if(!gHasSelect) {
		$('.tu_existing_option').css('color','#ccc').prop("disabled", true);
	} else {
		$('.tu_existing_option').css('color','black').prop("disabled", false);
	}

	// Add existing text options
	idx = -1;
	h = [];
	gHasText = false;
	h[++idx] = '<option value=""></option>';
	for(i = 0; i < gTextValues.length; i++) {
		if(i != gTextIdx) {
			gHasText = true;
			h[++idx] = '<option value="';
			h[++idx] = i;	// Use any unique value other than "", only the text content is used
			h[++idx] = '">';
			h[++idx] = gTextValues[i].text;
			h[++idx] = '</option>';
		}
	}

	$tu_existing_text.empty().html(h.join(''));
	if(!gHasText) {
		$('.tu_existing_text').css('color','#ccc').prop("disabled", true);
	} else {
		$('.tu_existing_text').css('color','black').prop("disabled", false);
	}

	$('#text_update_popup').modal("show");
}


/*
 * Save any changes to the "other" question
 */
function saveTargetResults() {

	var updateString,
		newValue,
		oldValue,
		newUpdates = [],
		idx;



	// for each item where value has changed
	$('.review_update_other input, .sec_sel1').each(function(index){
		var $this = $(this);

		if($this.data("orig") != $this.val()) {
			gUpdate.reviewItems = [];

			console.log("val: " + $this.val() + " has changed");

			newValue = $this.val();
			oldValue = $this.data("orig");
			gTextIdx = $this.data("idx");

			// Filter on the main question
			if( $('#primary_key_cb').is(':checked')) {
				gUpdate.r_id = gTextValues[gTextIdx].text;
				gUpdate.qFilter = 0;
			} else {
				gUpdate.r_id = 0;
				gUpdate.qFilter = gTextId;
				gUpdate.valueFilter = gTextValues[gTextIdx].text;
			}

			// Filter on the target question
			gUpdate.qFilterTarget = gTextOtherId;
			gUpdate.targetValueFilter = oldValue;

			gCountRecords = parseInt(gTextValues[gTextIdx].count);

			// Set description of change
			gUpdate.description = "Replace value (" + oldValue + ") in ";
			gUpdate.description += gCountRecords;
			gUpdate.description += " records with (" + newValue + ")";

			gUpdate.reason = "";

			gUpdate.reviewItems.push( {
				q_id: gTextOtherId,
				newValue: newValue
			});


			updateString = JSON.stringify(gUpdate);
			addHourglass();
			$.ajax({
				type: "POST",
				dataType: 'text',
				cache: false,
				url: "/surveyKPI/review/" + globals.gCurrentSurvey,
				data: { updates: updateString },
				success: function(data, status) {
					removeHourglass();
					getData();

				}, error: function(data, status) {
					removeHourglass();
					alert(localise.set["c_error"] + data.responseText);
				}
			});

		}

	});




}

function targetHasChanged() {
	changed = false;

	$('.review_update_other input').each(function(index){
		var $this = $(this);
		if($this.data("orig") != $this.val()) {
			changed = true;
		}

	});

	return changed;
}

function addSecondary(item, i) {
	var h =[],
		idx = -1,
		qIndex = $('#target_question_name option:selected').val(),
		type = gQuestions[qIndex].type;

	if(type === "select1") {
		h[++idx] = '<select class="sec_sel1" data-orig="';
		h[++idx] = item.targetQuestion;
		h[++idx] = '" data-idx="';
		h[++idx] = i;
		h[++idx] = '">';
		h[++idx] = '</select>';
	} else {
		h[++idx] = '<input type="text" data-orig="';
		h[++idx] = item.targetQuestion;
		h[++idx] = '" data-idx="';
		h[++idx] = i;
		h[++idx] = '" value="';
		h[++idx] = item.targetQuestion;
		h[++idx] = '">';
	}

	return h.join('');
}

function getSecondarySelects() {


	var qIndex = $('#target_question_name option:selected').val(),
		type;

	type = gQuestions[qIndex].type;
	if(type === 'select' || type === 'select1') {
		if (!gSecondaryChoices[qIndex]) {
			// Get choices from the server

			gCurrentLanguage = $('#language_name option:selected').val();
			addHourglass();
			$.ajax({
				url: "/surveyKPI/optionList/" + globals.gCurrentSurvey + "/" + gCurrentLanguage + "/"
					+ gQuestions[qIndex].id,
				dataType: 'json',
				cache: false,
				success: function (data) {
					removeHourglass();

					var idx = qIndex;
					gSecondaryChoices[idx] = data;
					addSecondarySelects(data);
				},
				error: function (xhr, textStatus, err) {
					removeHourglass();
					if (xhr.readyState == 0 || xhr.status == 0) {
						return;  // Not an error
					} else {
						alert(localise.set["c_error"] + xhr.responseText);
					}
				}
			});
		} else {
			// Use cached choices
			addSecondarySelects(gSecondaryChoices[qIndex]);
		}
	}
}

function addSecondarySelects(choices) {
	var i,
		h = [];
	var idx = -1;

	for(i = 0; i < choices.length; i++) {
		h[++idx] = '<option value="';
		h[++idx] = choices[i].value;
		h[++idx] = '">';
		h[++idx] = choices[i].label;
		h[++idx] = '</option>';
	}

	$('.sec_sel1').empty().append(h.join(''));
	$('.sec_sel1').each(function(){
		var $this = $(this);
		var val = $this.data('orig');
		$this.val(val);
	});
}

function getFormList(sId) {
	addHourglass();
	$.ajax({
		url: "/surveyKPI/survey/" + sId + "/getMeta",
		cache: false,
		dataType: 'json',
		success: function(data) {
			removeHourglass();
			var i,
				h = [];
			var idx = -1;

			if(data) {
				for(i = 0; i < data.forms.length; i++) {
					h[++idx] = '<option value="';
					h[++idx] = data.forms[i].f_id;
					h[++idx] = '">';
					h[++idx] = data.forms[i].name;
					h[++idx] = '</option>';
				}
			}
			$('#form_name').empty().append(h.join(''));

		},
		error: function(data) {
			removeHourglass();
			alert(localise.set["c_error"] + data.responseText);
		}
	});
}


});

