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
    	lang_location: '..',
    	icheck: './wb/plugins/iCheck/icheck.min',
    },
    shim: {
    	'app/common': ['jquery'],
        'jquery.autosize.min': ['jquery'],
      	'icheck': ['jquery']
    }
});

require([
         'jquery',
         'app/common',
         'modernizr',
         'app/localise',
         'app/ssc',
         'app/globals',
         'icheck',
         'jquery.autosize.min'],
function($, common, modernizr, lang, ssc, globals) {


var	gCache = {},
	gRoles,
	gIdx;

$(document).ready(function() {
	
	var i,
		params,
		pArray = [],
		param = [];

    setCustomEdit();
	setTheme();
	setupUserProfile(true);
	localise.setlang();		// Localise HTML
	
	// Get the user details
	getLoggedInUser(projectChanged, false, true, undefined, false, false);
	
	// Save a row filter
	$('#saveRowFilter').click(function() {
		gRoles[gIdx].row_filter = $('#filter_row_content').val();
		updateRole(gIdx, "row_filter", $('#row_filter_popup'));
	});
	
	// Save a column filter
	$('#saveColumnFilter').off().click(function() {
		var $this,
			question,
			column
		
		gRoles[gIdx].column_filter = [];
		$('input', '#column_select').each(function(index){
			$this = $(this);
			question = gCache[globals.gCurrentSurvey][$this.val()];
			
			if($this.is(':checked')) {
				column = {
					name: question.name
				};
				gRoles[gIdx].column_filter.push(column);
			}
			
		});
		updateRole(gIdx, "column_filter", $('#column_filter_popup'));
	});
	
	$('#project_name').change(function() {
        globals.gCurrentProject = $(this).val();
        globals.gCurrentSurvey = 0;
		projectChanged();
 	 });
	
	// Set change function on survey
	$('#survey_name').change(function() {
		globals.gCurrentSurvey = $('#survey_name option:selected').val();
		saveCurrentProject(globals.gCurrentProject,
			globals.gCurrentSurvey,
			globals.gCurrentTaskGroup);	// Save the current survey id
		surveyChangedRoles();
	});
	
	$('#filter_row_aq_insert').click(function() {
		var current = $('#filter_row_content').val();
		$('#filter_row_content').val(current
				+ (current.length > 0 ? " " : "")
				+ "${"
				+ $('#filter_row_aq option:selected').val()
				+ "} ");
	});

	$('#bundle').off().on('change', function() {
		var checked = $('#bundle').prop('checked');
		if(checked) {
			if(confirm(localise.set["ro_b_w"])) {
				// Save role settings to bundle
				applyRolesToBundle(true);
			} else {
				$('#bundle').prop('checked', false);
			}
		} else {
			applyRolesToBundle(false);
		}
	})
});

function projectChanged() {
	loadSurveys(globals.gCurrentProject, undefined, false, false, surveyChangedRoles, false, undefined, undefined);			// Get surveys
}

function surveyChangedRoles() {
	gRoles = undefined;
    globals.gCurrentSurvey = $('#survey_name option:selected').val();
	$('#survey_name_disp').text($('#survey_name option:selected').text());
	getAllRolesForSurvey();
	
	if(!gCache[globals.gCurrentSurvey]) {
		getSurveyQuestions(globals.gCurrentSurvey);
	} else {
		refreshRFQuestionSelect(gCache[globals.gCurrentSurvey]);
	}
	getBundleRoleSetting(globals.gCurrentSurvey);
	
}

function getSurveyQuestions(sId) {
	if(sId) {
        addHourglass();
        $.ajax({
            url: "/surveyKPI/questionList/" + sId + "/none/new?exc_ssc=true&inc_meta=true",
            dataType: 'json',
            cache: false,
            success: function (data) {
                removeHourglass();
                gCache[sId] = data;
                refreshRFQuestionSelect(gCache[sId]);
            },
            error: function (xhr, textStatus, err) {
                removeHourglass();
                if (xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    alert(localise.set["msg_err_get_q"] + ": " + err);
                }
            }
        });
    }
}

function getAllRolesForSurvey() {
	
	if(gRoles) {
		refreshView();
	} else if(globals.gCurrentSurvey) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/role/survey/" + globals.gCurrentSurvey,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				gRoles = data;
				refreshView();
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
		              return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_r"] + ": " + err);
				}
			}
		});	
	}
}

/*
 * Update the select options in the question select control
 */
function refreshRFQuestionSelect(questions) {
	var h =[],
		idx = -1,
		i,
		$element = $('#filter_row_aq');
	
	for(i = 0; i < questions.length; i++) {
		if(questions[i].toplevel) {			// Only allow top level form questions in row filter
			h[++idx] = '<option value="';
			h[++idx] = htmlEncode(questions[i].name);
			h[++idx] = '"';
			if (questions[i].id < 0) {       // Show meta in blue
				h[++idx] = ' style="color:blue"';
			}
			h[++idx] = '>';
			h[++idx] = htmlEncode(questions[i].name);

			h[++idx] = '</option>';

		}

	}
	$element.empty().append(h.join(''));
}

/*
 * Convert roles to html
 */
function refreshView() {

	var h = [],
		idx = -1,
		i,
		$element = $('#role_table'),
		hasEnabledRole = false;

	// write the table headings
	h[++idx] = '<table class="table">';
	h[++idx] = '<thead>';
	h[++idx] = '<tr>';
	h[++idx] = '<th>';
	h[++idx] = localise.set["c_role"];
	h[++idx] = '</th>';
	h[++idx] = '<th>';
	h[++idx] = localise.set["c_enabled"];
	h[++idx] = '</th>';
	h[++idx] = '<th>';
	h[++idx] = localise.set["ro_fr"];
	h[++idx] = '</th>';
	h[++idx] = '<th>';
	h[++idx] = localise.set["ro_fc"];
	h[++idx] = '</th>';
	h[++idx] = '<th>';
	h[++idx] = localise.set["ro_f_group"];
	h[++idx] = '<a class="filter_help" href="https://www.smap.com.au/docs/admin-rbac.html#filter-groups" target="_blank"> ( i ) </a>';
	h[++idx] = '</th>';
	h[++idx] = '</tr>';
	h[++idx] = '</thead>';

	// Write the table body
	h[++idx] = '<body>';
	for (i = 0; i < gRoles.length; i++) {

		h[++idx] = '<tr>';
		h[++idx] = '<td>';
		h[++idx] = htmlEncode(gRoles[i].name);
		h[++idx] = '</td>';
		h[++idx] = '<td>';
		h[++idx] = '<div class="btn-group btn-toggle enable" data-idx="';
		h[++idx] = i;
		h[++idx] = '">';
		h[++idx] = '<button class="btn btn-xs norole ';
		if (!gRoles[i].enabled) {
			h[++idx] = 'btn-danger active"';
		} else {
			h[++idx] = 'btn-default"';
		}
		h[++idx] = '>';
		h[++idx] = localise.set["c_no"];
		h[++idx] = '</button>';
		h[++idx] = '<button class="btn btn-xs yesrole ';
		if (!gRoles[i].enabled) {
			h[++idx] = 'btn-default"';
		} else {
			h[++idx] = 'btn-success active"';
		}
		h[++idx] = '>';
		h[++idx] = localise.set["c_yes"];
		h[++idx] = '</button>';
		h[++idx] = '</div>';
		h[++idx] = '<td>';
		h[++idx] = '<button class="btn btn-xs row_filter';
		if (!gRoles[i].enabled) {
			h[++idx] = ' disabled';
		}
		if (gRoles[i].restrict_row) {
			h[++idx] = ' btn-success';
		}
		h[++idx] = '">';
		h[++idx] = '<i class="fa fa-filter" aria-hidden="true"></i>';
		h[++idx] = '</button>';
		h[++idx] = '</td>';
		h[++idx] = '<td>';
		h[++idx] = '<button class="btn btn-xs column_filter';
		if (!gRoles[i].enabled) {
			h[++idx] = ' disabled';
		}
		if (gRoles[i].restrict_row) {
			h[++idx] = ' btn-success';
		}
		h[++idx] = '">';
		h[++idx] = '<i class="fa fa-filter" aria-hidden="true"></i>';
		h[++idx] = '</button>';
		h[++idx] = '</td>';
		h[++idx] = '<td>';
		h[++idx] = '<div class="btn-group btn-toggle role_group';
		if (!gRoles[i].enabled) {
			h[++idx] = ' disabled';
		}
		h[++idx] = '" data-idx="';
		h[++idx] = i;
		h[++idx] = '">';
		h[++idx] = '<button class="btn btn-xs groupA ';
		if (gRoles[i].role_group === 'A') {
			h[++idx] = 'btn-success active';
		} else {
			h[++idx] = 'btn-default';
		}
		if (!gRoles[i].enabled) {
			h[++idx] = ' disabled';
		}
		h[++idx] = '">A</button>';
		h[++idx] = '<button class="btn btn-xs groupB ';
		if (gRoles[i].role_group === 'B') {
			h[++idx] = 'btn-danger active';
		} else {
			h[++idx] = 'btn-default';
		}
		if (!gRoles[i].enabled) {
			h[++idx] = ' disabled';
		}
		h[++idx] = '">B</button>';
		h[++idx] = '</div>';
		h[++idx] = '</td>';
		h[++idx] = '</tr>';

		if (gRoles[i].enabled) {
			hasEnabledRole = true;
		}
	}
	h[++idx] = '</body>';
	h[++idx] = '</table>';

	$element.html(h.join(''));

	$('.enable', $element).off().click(function () {
		var $this = $(this),
			idx;

		$this.find('.btn').toggleClass('active').removeClass("btn-success btn-danger").addClass("btn-default");
		$this.find('.yesrole.active').addClass("btn-success").removeClass("btn-default");
		$this.find('.norole.active').addClass("btn-danger").removeClass("btn-default");

		idx = $this.data("idx");
		gRoles[idx].enabled = !gRoles[idx].enabled;
		updateRole(idx, "enabled", undefined);

		$this.closest('tr').find('.row_filter, .column_filter, .role_group, .groupA, .groupB').toggleClass("disabled");

		setInfoMsg();
	});

	// Row filtering logic
	$('.row_filter', $element).off().click(function () {
		var $this = $(this);

		if (!$this.hasClass("disabled")) {
			gIdx = $this.closest('tr').find('.btn-group').data("idx");
			$('#filter_row_content').val(gRoles[gIdx].row_filter);
			$('#row_filter_popup').modal("show");
		}
	});

	// Column filtering logic
	$('.column_filter', $element).off().click(function () {
		var $this = $(this);

		if (!$this.hasClass("disabled")) {
			gIdx = $this.closest('tr').find('.btn-group').data("idx");
			if (!gRoles[gIdx].column_filter) {
				gRoles[gIdx].column_filter = [];
			}
			refreshColumnSelect(gCache[globals.gCurrentSurvey], gRoles[gIdx].column_filter);
			$('#column_filter_popup').modal("show");
		}
	});

	// filter type
	$('.role_group', $element).off().click(function () {
		var $this = $(this);

		$this.find('.btn').toggleClass('active').removeClass("btn-success btn-danger").addClass("btn-default");
		$this.find('.groupA.active').addClass("btn-success").removeClass("btn-default");
		$this.find('.groupB.active').addClass("btn-danger").removeClass("btn-default");

		idx = $this.data("idx");
		if (gRoles[idx].role_group === 'A') {
			gRoles[idx].role_group = 'B';
		} else {
			gRoles[idx].role_group = 'A';
		}
		updateRole(idx, "role_group", undefined);

	});

	if (hasEnabledRole) {
		$('#roles_alert').html(localise.set["msg_has_roles"]);
	} else {
		$('#roles_alert').html(localise.set["msg_no_roles"]);
	}

}

	/*
     * Update the table that shows enabled columns for this role
     * Filter columns are assumed to be in the same order as questions
     */
function refreshColumnSelect(questions, filter_columns) {
	
	var h =[],
	idx = -1,
	i, j,
	$element = $('#column_select');

	h[++idx] = '<table class="table">';
	h[++idx] = '<thead>';
	h[++idx] = '<th>';
		h[++idx] = localise.set["c_question"];
	h[++idx] = '</th>';
	h[++idx] = '<th>';
	h[++idx] = '</th>';
	h[++idx] = '<th>';
		h[++idx] = localise.set["c_enabled"];
	h[++idx] = '</th>';
	h[++idx] = '</thead>';
	h[++idx] = '<tbody>';

	for(i = 0; i < questions.length; i++) {
		h[++idx] = '<tr>';
		h[++idx] = '<td>';
			h[++idx] = htmlEncode(questions[i].name);
		h[++idx] = '</td>';
		h[++idx] = '<td>';
			h[++idx] = htmlEncode(questions[i].q);
			h[++idx] = '</td>';
		h[++idx] = '<td><span class="colgroup"><input type="checkbox" name="colgroup" value="';
		h[++idx] = i;
		h[++idx] = '"';
		
		// See if this question has been included in the filter columns
		j = 0;
		while(j < filter_columns.length) {
			if(filter_columns[j].name ==  questions[i].name) {
				h[++idx] = ' checked';
				break;
			}
			j++;
		}
		
		h[++idx] = '></span></td>';
		h[++idx] = '</tr>';
	}
	h[++idx] = '</tbody>';
	h[++idx] = '</table>';
	
	$element.empty().append(h.join(''));
	
	$('input', $element).iCheck({
	    checkboxClass: 'icheckbox_square-green',
	    radioClass: 'iradio_square-green'
	});
}

function setInfoMsg() {
	var i,
		hasEnabledRole = false;
	
	for(i = 0; i < gRoles.length; i++) {
		if(gRoles[i].enabled) {
			hasEnabledRole = true;
		}
	}
	if(hasEnabledRole) {
		$('#roles_alert').html(localise.set["msg_has_roles"]);
	} else {
		$('#roles_alert').html(localise.set["msg_no_roles"]);
	}
}

/*
 * Update a role
 */
function updateRole(idx, property, $popup) {
	
	addHourglass();
	$.ajax({
		  type: "POST",
		  contentType: "application/x-www-form-urlencoded",
		  cache: false,
		  url: "/surveyKPI/role/survey/" + globals.gCurrentSurvey + "/" + property,
		  data: { 
			  role: JSON.stringify(gRoles[idx])
			  },
		  success: function(data, status) {
			  removeHourglass();
			  if(handleLogout(data)) {
				  gRoles[idx].linkid = data.linkid;		// Record the id of survey/role entity
				  if(property === "enabled") {		// Newly enabled get any synchronised properties
					  gRoles[idx].row_filter = data.row_filter;
					  gRoles[idx].column_filter = data.column_filter;
					  if(data.role_group) {
						  gRoles[idx].role_group = data.role_group;
						  var $g = $('#role_table .role_group[data-idx=' + idx + ']')

						  $g.find('.btn').removeClass('active').removeClass("btn-success btn-danger").addClass("btn-default");
						  $g.find('.group' + data.role_group).addClass('active');
						  $g.find('.groupA.active').addClass("btn-success").removeClass("btn-default");
						  $g.find('.groupB.active').addClass("btn-danger").removeClass("btn-default");
					  }
				  }

				  if($popup) {
					  $popup.modal("hide");
				  }
			  }

		  }, error: function(data, status) {
			  removeHourglass();
			  if(data && data.responseText) {
				  alert(data.responseText);
			  } else {
				  alert(localise.set["msg_u_f"]);
			  }
		  }
	});
}

  /*
   * Get the roles setting for the bundle
   */
	function getBundleRoleSetting(sId) {
		addHourglass();
		$.ajax({
			url: "/surveyKPI/bundle/settings/" + sId,
			dataType: 'json',
			cache: false,
			success: function (data) {
				removeHourglass();
				if(handleLogout(data)) {
					$('#bundle').prop('checked', data.bundleRoles);
				}
			},
			error: function (xhr, textStatus, err) {
				removeHourglass();
				if (xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["msg_err_get_q"] + ": " + err);
				}
			}
		});
	}

	/*
     * The checkbox has been set, or unset, to apply all roles to the bundle
     */
	function applyRolesToBundle(value) {

		addHourglass();
		$.ajax({
			type: "POST",
			contentType: "application/x-www-form-urlencoded",
			cache: false,
			data: {
				sId: $('#survey_name').val(),
				value: value
			},
			url: "/surveyKPI/role/survey/bundle",
			success: function (data, status) {
				removeHourglass();
				if (handleLogout(data)) {
					if(value) {
						alert(localise.set["ro_b_d"]);
						}
				}

			}, error: function (data, status) {
				removeHourglass();
				if (data && data.responseText) {
					alert(data.responseText);
				} else {
					alert(localise.set["msg_u_f"]);
				}
			}
		});
	}
});