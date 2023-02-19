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

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
	gUserLocale = localStorage.getItem('user_locale') || navigator.language;
} 

"use strict";
require.config({
    baseUrl: 'js/libs',
    waitSeconds: 0,
    locale: gUserLocale,
    paths: {
    	app: '../app',
    	bootbox: 'bootbox.min',
    	lang_location: '..'
    },
    shim: {
    	'app/common': ['jquery'],
        'jquery.autosize.min': ['jquery']
    }
});

require([
         'jquery',
         'app/common',
         'modernizr',
         'app/localise',
         'app/ssc',
         'app/globals',
         'app/changeset',
         'bootbox',
         'app/aws',
         'jquery.autosize.min'], 
		function($, common, modernizr, lang, ssc, globals, changeset, bootbox, aws) {


var	gMode = "survey",
	gTempLanguageItems = [];

$(document).ready(function() {

	setTheme();
	setupUserProfile(true);
	localise.setlang();		// Localise HTML
	
	// Get the user details
	globals.gIsAdministrator = false;
	getLoggedInUser(surveyListDone, false, true, undefined, false, false);
	
	// Add menu functions
	$('#m_open').off().click(function() {	// Open an existing form
		openForm("existing");
	});
	
	$('.save_form').off().click(function() {	// Save a survey to Smap
		saveTranslations(getSurveyDetails(undefined, false, true));
	});
	
	$('#m_settings').off().click(function() {	// Get a survey from Smap
		gMode = "settings";
		refreshView(gMode);
	});
	$('#m_changes').off().click(function() {	// View the changes to this survey
		gMode = "changes";
		refreshView(gMode);
	});
	$('#m_undo').off().click(function() {	// Undo last change
		globals.model.undo();
		refreshView(gMode);
	});
	$('#m_redo').off().click(function() {	// Redo last change
		globals.model.redo();
		refreshView(gMode);
	});

	$('#m_auto_translate').click(function(e) {
		e.preventDefault();
		if(!$(this).parent().hasClass("disabled")) {
			var survey = globals.model.survey;
			if (survey.languages.length > 1) {
				aws.setLanguageSelect($('.translate_select'), 'translate', setTranslateValues);
				$('#overwrite').prop("checked", false);
				$('#autoTranslateModal').modal("show");
			}
		} else {
			alert(localise.set["ed_sct"]);
		}
	});
	
	$('.language_list').off().change(function() {
		globals.gLanguage1 = $('#language1').val();
		globals.gLanguage2 = $('#language2').val();
		refreshView(gMode);
 	 });
	

	// Check for selection of the label indicating successful updates and the one indicating failed
	$('#successLabel').off().click(function() {
		alert("success");
	});
	// Check for selection of the label indicating successful updates and the one indicating failed
	$('#failedLabel').off().click(function() {
		alert("failed");
	});
	
    /*
     * Open a new form
     */
	$('#get_form').off().click(function() {
		globals.gCurrentSurvey = $('#survey_name option:selected').val();
		saveCurrentProject(globals.gCurrentProject, globals.gCurrentSurvey);	// Save the current survey id
		getSurveyDetails(refreshView, false, true);
 	 });

	$('#translateGo').off().click(function() {
		if(!$(this).hasClass('disabled')) {
			autoTranslate();
		}
	});

	/*
 	 * Add check prior to the user leaving the screen
 	 */
	window.onbeforeunload = function() {
		if(globals.changes.length > 0) {
			return localise.set["msg_leave"];
		} else {
			return;
		}
	};

});

function surveyListDone() {
	getSurveyDetails(refreshView, false, true);
}


function setTranslateValues() {
	var survey = globals.model.survey;
	if (survey.languages[globals.gLanguage1].code) {
		$('#from_lang').val(survey.languages[globals.gLanguage1].code);
	} else {
		$('#from_lang').val("en");
	}
	if (survey.languages[globals.gLanguage2].code) {
		$('#to_lang').val(survey.languages[globals.gLanguage2].code);
	}  else {
		$('#to_lang').val("en");
	}
}

// Save the survey
function saveTranslations(callback) {
	
	var url="/surveyKPI/surveys/save/" + globals.gCurrentSurvey,
		changes = globals.model.translateChanges,
		changesString = JSON.stringify(changes);		
	
	addHourglass();
	$.ajax({
		url: url,
		type: 'PUT',
		dataType: 'json',
		cache: false,
		data: { changes: changesString },
		success: function(data) {
			var responseFn = callback,
				h = [],
				idx = -1,
				i;
			
			removeHourglass();			
			
			globals.model.clearChanges();
			
			if(typeof responseFn === "function") { 
				responseFn();
			}
			
			// Report success and failure
			globals.model.lastChanges = data.changeSet;
			//$('#successLabel .counter').html(data.success);
			//$('#failedLabel .counter').html(data.failed);	
			
			if(data.success > 0) {
				h[++idx] = '<div class="alert alert-success" role="alert">';
				h[++idx] = '<p>';
				h[++idx] = data.success;
				h[++idx] = " " + localise.set["ed_csa"];
				h[++idx] = '</p>';
				h[++idx] = '<ol>';
				for(i = 0; i < data.changeSet.length; i++) {
					h[++idx] = changeset.addUpdateMessage(data.changeSet[i], false);
				}
				h[++idx] = '</ol>';
				h[++idx] = '</div>';
			}
			if(data.failed > 0) {
				h[++idx] = '<div class="alert alert-danger" role="alert">';
				h[++idx] = data.failed;
				h[++idx] = " " + localise.set["ed_csf"];
				h[++idx] = '<ol>';
				for(i = 0; i < data.changeSet.length; i++) {
					h[++idx] = changeset.addUpdateMessage(data.changeSet[i], true);
				}
				h[++idx] = '</ol>';
				h[++idx] = '</div>';
			}

			bootbox.alert(h.join(""));

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			
			if(xhr.readyState === 0 || xhr.status === 0) {
	              return;  // Not an error
			} else {
				alert(localise.set["msg_err_save"] + ' ' + err);
			}
					
			if(typeof responseFn === "function") { 
				responseFn();
			}
		}
	});	
	
};

function refreshView() {
	
	var i,
		j,
		itemList = [],
		index = -1,
		survey = globals.model.survey,
		numberLanguages,
		key,
		options = [];

	gTempLanguageItems = [];
	
	if(survey) {
		numberLanguages = survey.languages.length;
	}
	
	if(globals.gLanguage1 >= numberLanguages) {
		globals.gLanguage1 = 0;
	}
	if(globals.gLanguage2 >= numberLanguages) {
		globals.gLanguage2 = 0;
	}
	
	// Set the display name
	$('.formName').text(survey.displayName);
			
	// Add all unique questions from all forms
	for(i = 0; i < survey.forms.length; i++) {
		console.log("Form name: " + survey.forms[i].name);
		var formQuestions = survey.forms[i].questions; 
		for(j = 0; j < formQuestions.length; j++) {

			// Question Labels
			if(formQuestions[j].labels[globals.gLanguage1].text) {
				if((index = $.inArray(formQuestions[j].labels[globals.gLanguage1].text, itemList)) > -1) {
					gTempLanguageItems[index].indexes.push({
						form: i,
						question: j
					});
				} else {
					itemList.push(formQuestions[j].labels[globals.gLanguage1].text);
					gTempLanguageItems.push({
						label_a: formQuestions[j].labels[globals.gLanguage1].text,
						label_b: formQuestions[j].labels[globals.gLanguage2].text,
						indexes: [{
							form: i,
							question: j
						}]
					});
				}
			}

			// Hints
			if(formQuestions[j].labels[globals.gLanguage1].hint) {
				if((index = $.inArray(formQuestions[j].labels[globals.gLanguage1].hint, itemList)) > -1) {
					gTempLanguageItems[index].indexes.push({
						form: i,
						question: j,
						hint: true
					});
				} else {
					itemList.push(formQuestions[j].labels[globals.gLanguage1].hint);
					gTempLanguageItems.push({
						label_a: formQuestions[j].labels[globals.gLanguage1].hint,
						label_b: formQuestions[j].labels[globals.gLanguage2].hint,
						indexes: [{
							form: i,
							question: j,
							hint: true
						}]
					});
				}
			}

			// Constraint Messages
			if(formQuestions[j].labels[globals.gLanguage1].constraint_msg) {
				if((index = $.inArray(formQuestions[j].labels[globals.gLanguage1].constraint_msg, itemList)) > -1) {
					gTempLanguageItems[index].indexes.push({
						form: i,
						question: j,
						constraint_msg: true
					});
				} else {
					itemList.push(formQuestions[j].labels[globals.gLanguage1].constraint_msg);
					gTempLanguageItems.push({
						label_a: formQuestions[j].labels[globals.gLanguage1].constraint_msg,
						label_b: formQuestions[j].labels[globals.gLanguage2].constraint_msg,
						indexes: [{
							form: i,
							question: j,
							constraint_msg: true
						}]
					});
				}
			}

			// Required Messages
			if(formQuestions[j].labels[globals.gLanguage1].required_msg) {
				if((index = $.inArray(formQuestions[j].labels[globals.gLanguage1].required_msg, itemList)) > -1) {
					gTempLanguageItems[index].indexes.push({
						form: i,
						question: j,
						required_msg: true
					});
				} else {
					itemList.push(formQuestions[j].labels[globals.gLanguage1].required_msg);
					gTempLanguageItems.push({
						label_a: formQuestions[j].labels[globals.gLanguage1].required_msg,
						label_b: formQuestions[j].labels[globals.gLanguage2].required_msg,
						indexes: [{
							form: i,
							question: j,
							required_msg: true
						}]
					});
				}
			}

			// Guidance Hint
			if(formQuestions[j].labels[globals.gLanguage1].guidance_hint) {
				if((index = $.inArray(formQuestions[j].labels[globals.gLanguage1].guidance_hint, itemList)) > -1) {
					gTempLanguageItems[index].indexes.push({
						form: i,
						question: j,
						guidance_hint: true
					});
				} else {
					itemList.push(formQuestions[j].labels[globals.gLanguage1].guidance_hint);
					gTempLanguageItems.push({
						label_a: formQuestions[j].labels[globals.gLanguage1].guidance_hint,
						label_b: formQuestions[j].labels[globals.gLanguage2].guidance_hint,
						indexes: [{
							form: i,
							question: j,
							guidance_hint: true
						}]
					});
				}
			}
		}
	}
	// Add all unique options from all option lists
	for(key in survey.optionLists) {

		options = survey.optionLists[key].options;
		for(j = 0; j < options.length; j++) {

			if(options[j].labels[globals.gLanguage1].text) {
				if((index = $.inArray(options[j].labels[globals.gLanguage1].text, itemList)) > -1) {
					console.log(options[j].labels[globals.gLanguage1].text);
					gTempLanguageItems[index].indexes.push({
						optionList: key,
						option: j
					});
					
				} else {
					itemList.push(options[j].labels[globals.gLanguage1].text);
					gTempLanguageItems.push({
						label_a: options[j].labels[globals.gLanguage1].text,
						label_b: options[j].labels[globals.gLanguage2].text,
						indexes: [{
							optionList: key,
							option: j
						}]
					});
				}
			}
		}
	}

	// Add the HTML
	setTranslateHtml($('.questions'), gTempLanguageItems, survey);

	// Respond to text changes
	$(".lang_b").first().focus();
	$(".lang_b").change(function(e){
		e.preventDefault();
		var $this = $(this);
		var index = $this.data("index");
		var newVal = $this.val();
		console.log(gTempLanguageItems[index]);
		console.log("New val:" + newVal);
		globals.model.modLabel(globals.gLanguage2, gTempLanguageItems[index].indexes, newVal, "text", "label");
	});
}

/*
 * Convert JSON to html
 */
function setTranslateHtml($element, language_items, survey) {
	var i;

	$element.empty();
	for(i = 0; i < language_items.length; i++) {
		var label_a = language_items[i].label_a;
		var label_b = language_items[i].label_b || "";
		var tabidx = i + 1;
		var content = `
			<div class="col-6">
				<textarea class="lang_a" tabindex="-1" readonly>${label_a}</textarea>
			</div>
			<div class="col-6">
				<textarea class="lang_b" tabindex="${tabidx}" data-index="${i}">${label_b}</textarea>
			<div>`;
		$element.append(content);
	}

}

/*
 * Call AWS services to translate automatically
 */
function autoTranslate() {

	var url="/surveyKPI/surveys/translate/" + globals.gCurrentSurvey
		+ "/" + globals.gLanguage1
		+ "/" + globals.gLanguage2
		+ "/" + $("#from_lang").val()
		+ "/" + $('#to_lang').val();
	var overwrite = $('#overwrite').prop("checked");

	if(overwrite) {
		url += "?overwrite=true";
	}

	$('#translateGo').addClass("disabled");

	addHourglass();
	$.ajax({
		url: url,
		type: 'PUT',
		cache: false,
		timeout: 0,
		success: function() {
			removeHourglass();
			$('#autoTranslateModal').modal("hide");
			$('#translateGo').removeClass("disabled");
			getSurveyDetails(refreshView, false, true);

			var h = [],
				idx = -1,
				msg = localise.set["ed_transd"];

			msg = msg.replace("%s1", globals.model.survey.languages[globals.gLanguage1].name);
			msg = msg.replace("%s2", globals.model.survey.languages[globals.gLanguage2].name);

			h[++idx] = '<div class="alert alert-success" role="alert">';
			h[++idx] = '<p>';
			h[++idx] = msg;
			h[++idx] = '</p>';

			h[++idx] = '</div>';
			bootbox.alert(h.join(""));

		},
		error: function(xhr, textStatus, err) {
			removeHourglass();
			$('#translateGo').removeClass("disabled");

			if(xhr.readyState === 0 || xhr.status === 0) {
				return;  // Not an error
			} else {
				if(xhr.responseText.indexOf("<html>") > 0) {
					alert(localise.set["msg_trans_to"]);
				} else {
					alert(xhr.responseText);
				}

			}
		}
	});
}

});