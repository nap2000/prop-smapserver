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

var viewIdx = 0;
var gLastSetForm;

$(document).ready(function() {


    /*
     * Enable Menu events
     */
    $('.rmm').delegate('#refreshMenu', 'click', function(e) {
        e.preventDefault();
        refreshAnalysisData();
    });

    $('.rmm').delegate('#exportMenu', 'click', function(e) {
        e.preventDefault();

        // Set the survey selector
        var surveyList = globals.gSelector.getSurveyList();
        if(!surveyList) {	// Surveys have not yet been retrieved
            getViewSurveys({sId:"-1"});
        }

        exportSurveyChanged();
        $('#export').dialog("open");
    });


    // Change event on export dialog survey select
    $('#export_survey').change(function() {
        exportSurveyChanged();
    });

    // Change event on exporting a query instead of a survey
    $('#exportQuerySel').change(function() {
        exportQuerySelChanged();
    });

    /*
     * Change event on export format select
     */
    $('#exportformat,#export_xlstype').change(function(){
        setExportControls();
    });

    // Edit thingsat button
    $('#btn_edit_thingsat').button().off().click(function(){
        require(['app/neo_model'], function(neo_model) {
            var sId = $('#export_survey option:selected').val(),
                language = $('#export_language option:selected').val(),
                form,
                forms = $(':radio:checked', '.shapeforms').map(function() {
                    return this.value;
                }).get();

            var sMeta = globals.gSelector.getSurvey(sId);

            if(forms.length === 0) {
                alert(window.localise.set["msg_one_f2"]);
                return(false);
            }

            if(sId != -1) {
                neo_model.init(sId, forms[0], language, sMeta.model);
                neo_model.showModel('#ta_model_edit', 300, 200);
                neo_model.showTable('#ta_items_edit');
                neo_model.startEdit();
            }
        });
    });

});


$(window).load(function() {

    var param_string,
        i,
        params,
        aParam;

    // Open the panel items dialog by default
    // Initialise the panel items dialog
    $('#panelItems').dialog(
        {
            autoOpen: false, closeOnEscape:true, draggable:true, modal:false,
            width:300,
            resizable: false,
            draggable: false,
            title: "Panel Management",
            position: { my: "left top", at: "left top", of:'#main', collision: 'none'},
            zIndex: 2000,
            beforeClose: function () {
                return false;		// Disable closing as resizing of panels is causing problems with maps
            }
        }
    );


    // Get parameters - If the ident parameter is set then the report dialog is opened
    param_string = window.location.search.substring(1);
    if(param_string) {
        params = param_string.split("&");
        for (i = 0; i < params.length; i++) {
            aParam = params[i].split("=");
            if(aParam[0] == "ident") {
                gReportIdent = aParam[1];
                gCalledFromReports = true;
            } else if(aParam[0] == "projectId") {
                globals.gEditingReportProject = aParam[1];

            }
        }
        if(gCalledFromReports) {

            $.ajax({   // Get the existing report details to edit
                url: getReportURL(gReportIdent, "json"),
                cache: false,
                success: function(data, status) {

                    $('#reportContainer').dialog("open");

                    // Populate gReport from the existing data
                    gReport = data;
                    gReport.smap.data_bounds = new OpenLayers.Bounds(data.smap.bbox[0], data.smap.bbox[1], data.smap.bbox[2], data.smap.bbox[3]).
                    transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"));

                    setReport(gReport);
                    gReportIdent = undefined;
                }, error: function(data, status) {
                    alert(window.localise.set("c_error"));
                    gReportIdent = undefined;
                }
            });

        }
    }

});


function initialiseDialogs() {

    /*
     * Export Dialog
     */
    setExportControls();
    $('#exp_from_date,#exp_to_date').datepicker({ dateFormat: "yy-mm-dd" });
    $('#export').dialog(
        {
            autoOpen: false, closeOnEscape:true, draggable:true, modal:true,
            show:"drop",
            width: 480,
            zIndex: 2000,
            title: window.localise.set["a_exp_title"],
            buttons: [
                {
                    text: window.localise.set["c_cancel"],
                    click: function() {
                        $(this).dialog("close");
                    }
                },
                {
                    text: window.localise.set["m_export"],
                    click: function() {

                        var sId = $('#export_survey option:selected').val(),
                            queryId = $('#export_query option:selected').val(),
                            language = $('#export_language option:selected').val(),
                            displayName = $('#export_survey option:selected').text(),
                            format = $('#exportformat').val(),
                            mediaQuestion = $('#export_media_question').val(),
                            split_locn = $('#splitlocn:checked').prop("checked"),
                            xlstype = $('#export_xlstype').val(),
                            merge_select_multiple = $('#mergeSelectMultiple:checked').prop("checked"),
                            embedImages = $('#embedImages:checked').prop("checked"),
                            incHxl = $('#incHxl:checked').prop("checked"),
                            exportReadOnly = $('#exportReadOnly').prop("checked"),
                            sources = $('#sources').prop("checked"),
                            exportReport = $('#export_report_defn').val(),
                            forms = [],
                            form,
                            name_questions = [],
                            exp_from_date = $('#exp_from_date').datepicker({ dateFormat: 'yy-mm-dd' }).val(),
                            exp_to_date = $('#exp_to_date').datepicker({ dateFormat: 'yy-mm-dd' }).val(),
                            dateQuestionId = $('#export_date_question option:selected').val(),
                            exportQuerySel = $('#exportQuerySel').prop("checked"),
                            queryName = $('#export_query option:selected').text(),
                            includeMeta=$('#includeMeta').prop("checked"),
                            filename,
                            url,
                            filter = $('#ad_filter').val();

                        // Set the filename of the exported file
                        if(exportQuerySel) {
                            if(!queryId) {
                                alert(window.localise.set["a_sel_query"]);
                                return(false);
                            }
                            filename = queryName;

                        } else {
                            if(sId == "-1") {
                                alert(window.localise.set["msg_pss"]);
                                return(false);
                            }
                            filename = displayName;
                        }
                        if(!filename) {
                            filename = "export";
                        }

                        // TODO validate dates
                        if(exp_from_date && exp_to_date && exp_to_date < exp_from_date) {
                            alert(window.localise.set["msg_sel_dates"]);
                            return(false);
                        }

                        if(format === "osm") {
                            forms = $(':checkbox:checked', '.osmforms').map(function() {
                                return this.value;
                            }).get();
                            form = getSelectedForm('.shapeforms', false);
                            var geomQuestion = $('#geomForm_' + form).val();
                            url = exportSurveyOSMURL(sId, displayName, forms, exportReadOnly,
                                exp_from_date, exp_to_date, dateQuestionId, geomQuestion);

                        } else if(format === "shape"
                            || format === "kml"
                            || format === "vrt"
                            || format === "csv"
                            || format === "spss"
                            || format === "stata") {

                            if(exportQuerySel) {
                                sId = undefined;
                                form = 0;
                            } else {
                                queryId = undefined;
                                form = getSelectedForm('.shapeforms', false);
                                gLastSetForm = form;    // Keep until the next time the user opens the dialog
                            }

                            var geomQuestion = $('#geomForm_' + form).val();
                            url = exportSurveyMisc(sId, filename, form,
                                format, exportReadOnly, language,
                                exp_from_date, exp_to_date, dateQuestionId, queryId,
                                filter, merge_select_multiple, geomQuestion);

                        } else if(format === "thingsat") {
                            forms = $(':radio:checked', '.shapeforms').map(function() {
                                return this.value;
                            }).get();
                            if(forms.length === 0) {
                                alert(window.localise.set["msg_one_f2"]);
                                return(false);
                            }
                            url = exportSurveyThingsatURL(sId, displayName, forms[0], language,
                                exp_from_date, exp_to_date, dateQuestionId, formList);
                        } else if(format === "trail") {
                            forms = $(':radio:checked', '.shapeforms').map(function() {
                                return this.value;
                            }).get();
                            if(forms.length === 0) {
                                alert(window.localise.set["msg_one_f2"]);
                                return(false);
                            }
                            var traceFormat = "shape";	// Todo add gpx
                            var type = "trail";			// Todo allow selection of events or trail
                            url = exportSurveyLocationURL(sId, displayName, forms[0], traceFormat, type);

                        } else if(format === "media") {

                            // Validate
                            if(!mediaQuestion) {
                                alert(window.localise.set["msg_sel_media"]);
                                return(false);
                            }
                            name_questions = $(':checkbox:checked', '.mediaselect').map(function() {
                                return this.value;
                            }).get();

                            url = exportSurveyMediaURL(sId, displayName, undefined, mediaQuestion, name_questions.join(','),
                                exp_from_date, exp_to_date, dateQuestionId, filter);

                        } else if(format === "lqas") {

                            url = exportSurveyLqasURL(sId, sources, exportReport);

                        } else {
                            if(xlstype === "new_xlsx") {
                                forms = $(':radio:checked', '.shapeforms').map(function() {
                                    return this.value;
                                }).get();
                                if(forms.length === 0) {
                                    alert(window.localise.set["msg_one_f2"]);
                                    return(false);
                                }
                                form = forms[0];

                                url = exportXlsxSurveyURL(sId, displayName, language, split_locn,
                                    form, exportReadOnly, merge_select_multiple, embedImages, incHxl,
                                    exp_from_date, exp_to_date, dateQuestionId, filter, includeMeta, globals.gTimezone);
                            } else {
                                // Legacy html xlsx export
                                forms = $(':checkbox:checked', '.selectforms').map(function () {
                                    return this.value;
                                }).get();

                                if (forms.length === 0) {
                                    alert(window.localise.set["msg_one_f"]);
                                    return (false);
                                } else {
                                    if (embedImages === true && xlstype === "html") {
                                        alert(window.localise.set["msg_embed"]);
                                        return (false);
                                    }
                                }
                                url = exportSurveyURL(sId, displayName, language, format, split_locn,
                                    forms, exportReadOnly, merge_select_multiple, xlstype, embedImages, incHxl,
                                    exp_from_date, exp_to_date, dateQuestionId, filter, globals.gTimezone);
                            }
                        }

                        downloadFile(url);

                        $(this).dialog("close");
                    }
                }
            ]
        }
    );

    /*
     * Message Dialog
     */
    $('#status_msg').dialog(
        {
            autoOpen: false, closeOnEscape:true, draggable:true, model:true,
            show:"drop",
            zIndex: 2000,
            buttons: [
                {
                    text: window.localise.set["c_close"],
                    click: function() {
                        $(this).dialog("close");
                    }
                }
            ]
        }
    );

}

function exportSurveyChanged() {
    var sId = $('#export_survey option:selected').val(),
        languages = globals.gSelector.getSurveyLanguages(sId),
        sMeta,
        questions,
        checkedForms,
        format,
        xls_type,
        i,
        language;

    if(sId > 0) {

        // Save selections so they can be restored
        format = $('#exportformat').val();
        xls_type = $('#export_xlstype').val();
        if(format === "osm") {
            checkedForms = $(':radio:checked', '.osmforms').map(function () {
                return this.value;
            }).get();
        } else if (format == "xls" && xls_type == "new_xlsx") {
            checkedForms = $(':radio:checked', '.shapeforms').map(function () {
                return this.value;
            }).get();
        } else {
            checkedForms = $(':checkbox:checked', '.selectforms').map(function () {
                return this.value;
            }).get();
            if(checkedForms && checkedForms.length > 0) {
                for(i = 0; i < checkedForms.length; i++) {
                    var  val_array= checkedForms[i].split(":");
                    checkedForms[i] = val_array[0];
                }
            }
        }
        language = $('#export_language').val();


        if(!languages || languages.length == 0) {
            getLanguageList(sId, addMediaPickList);		// Retrieve the languages and questions for the default language
        } else {
            setSurveyViewLanguages(languages, undefined, '#settings_language', false );
            setSurveyViewLanguages(languages, undefined, '#export_language', true );
            questions = globals.gSelector.getSurveyQuestions(sId, languages[0].name);
            addMediaPickList();
        }

        sMeta = globals.gSelector.getSurvey(sId);
        if(!sMeta) {
            getSurveyMetaSE(sId, {}, false,true, true, false, false);
        } else {
            addFormPickList(sMeta, checkedForms);
            addDatePickList(sMeta);
            addGeomPickList(sMeta);
        }

        // Update the thingsat model if we changed the survey
        if($('#exportformat').val() === "thingsat") {
            showModel();
        }

        exportQuerySelChanged();

        // Restore previous selections
        $('#export_language').val(language);

    } else {
        $('#export_date_question').html("");
    }
}

function exportQuerySelChanged() {
    require(['app/extended_model'], function(extended_model) {

        var expExtended = $('#exportQuerySel').prop("checked"),
            sId = $('#export_survey option:selected').val(),
            sMeta;

        if(expExtended) {

            $('.selectquery').show();
            $('.selectsurvey').hide();
            $('.showshape').hide();
            sMeta = globals.gSelector.getSurveyExtended(sId);
            if(!sMeta) {
                sMeta = getExtendedSurveyMetaSE(sId, extended_model.convertMetaToGraph);
            } else {
                extended_model.convertMetaToGraph(sMeta);
            }
        } else {

            setExportControls();
            $('.showextselect').hide();
        }
    });

}

function setExportControls() {
    var format = $('#exportformat').val(),
        xlsType = $('#export_xlstype').val();

    // Make sure the export button is enabled as export to things at may have disabled it
    $('#export').next().find("button:contains('Export')").removeClass("ui-state-disabled");

    $('.exportcontrol').hide();
    if(format === "osm") {
        $('.showosm,.showro,.showlang').show();
    } else if(format === "csv") {
        $('.showshape,.showro,.showlang, .mergeselmult').show();
    } else if(format === "shape" || format === "kml" || format === "vrt" || format === "csv") {
        $('.showshape,.showro,.showlang').show();
    } else if(format === "stata" || format === "spss") {
        $('.showshape,.showro,.showlang').show();
    } else if(format === "thingsat") {
        $('.showshape,.showro,.showlang').show();
        showModel();			// Show the thingsat model
    } else if(format === "trail") {
        $('.showshape').show();
    } else if(format === "media") {
        $('.showmedia, .showlang').show();
    } else if(format === "lqas") {
        $('.showlqas, .selectsurvey').show();
        getReports(showReportList, undefined, "lqas");
    } else {    // Default including xls
        $('.showro,.showlang, .mergeselmult').show();
        if(format === "xls" && xlsType === "new_xlsx") {
            $(' .shownewxls').show();
        } else {
            $('.showoldxls').show();
        }
    }

    // Set some values according to what the user specified last
    $('.osmform[value=' + gLastSetForm + ']', '.shapeforms').prop("checked", "checked");
    shapeFormsChanged();
}

/*
 * Add the pick list for media export
 */
function addMediaPickList() {

    var sId = $('#export_survey option:selected').val(),
        format = $('#exportformat').val(),
        languages = globals.gSelector.getSurveyLanguages(sId),
        questions = globals.gSelector.getSurveyQuestions(sId, languages[0]),
        i,
        h = [],
        idx = -1,
        h2 = [],
        idx2 = -1;

    /*
     * Add the media question select list
     */
    if(typeof questions !== "undefined") {
        for(i = 0; i < questions.length; i++) {
            if(questions[i].type === "image" || questions[i].type === "video" || questions[i].type === "audio") {
                h[++idx] = '<option value="';
                h[++idx] = questions[i].id;
                h[++idx] = '">';
                h[++idx] = questions[i].name;
                h[++idx] = '</option>';
            } else if(questions[i].name !== "_task_key") {

                if(questions[i].type === "string" ||
                    questions[i].type === "select1" ||
                    questions[i].type === "date" ||
                    questions[i].type === "dateTime" ||
                    questions[i].type === "int" ||
                    questions[i].type === "decimal" ||
                    questions[i].type === "barcode" ||
                    questions[i].type === "geopoint"
                ) {

                    h2[++idx2] = '<div class="checkbox"><label><input type="checkbox" name="mediaselect" value="';
                    h2[++idx2] = questions[i].id;
                    h2[++idx2] = '" class="mediaselectoption"/>';
                    h2[++idx2] = questions[i].name;
                    h2[++idx2] = '</label></div>';
                }

            }
        }

        if(idx === -1 && format === "media") {
            alert(localise.set["msg_nm"]);
        }
        $('#export_media_question').html(h.join(''));
        $('.mediaselect').html(h2.join(''));
    }

}

/*
 * Add the Custom Report Configuration Select list
 */
function addCustomReportList(templates) {

    var i,
        h = [],
        idx = -1;

    for(i = 0; i < templates.length; i++) {
        h[++idx] = '<option value="';
        h[++idx] = templates[i].id;
        h[++idx] = '">';
        h[++idx] = templates[i].name;
        h[++idx] = '</option>';
    }

    $('#export_report_defn').html(h.join(''));

}

/* 
 * Show a newo4J model of the survey
 */
function showModel() {
    require(['app/neo_model'], function(neo_model) {
        var sId = $('#export_survey option:selected').val();
        if(sId != -1) {
            var sMeta = globals.gSelector.getSurvey(sId);
            if(!sMeta) {
                getSurveyMetaSE(sId, {}, false, false, false, undefined, neo_model);
            } else {
                $('.showthingsat').show();

                // Set the form to the value stored in the model
                if(sMeta.model) {
                    var graph = JSON.parse(sMeta.model);
                    $('.osmform[value=' + graph.form + ']').prop("checked", "checked");
                }

                neo_model.init(sId, undefined, undefined, sMeta.model);
                neo_model.showModel('#ta_model_show', 300, 200);
            }
        } else {
            neo_model.clear('#ta_model_show');
        }
    });
}

/*
 * Get the type of a question
 */
function getQuestionInfo(sId, language, qId) {

    var qList = globals.gSelector.getSurveyQuestions(sId, language),
        i,
        qInfo;

    if(qList) {
        for(i = 0; i < qList.length; i++) {
            if(qList[i].id == qId) {
                qInfo = {};
                qInfo.type = qList[i].type;
                qInfo.name = qList[i].name;
                break;
            }
        }
    }

    return qInfo;
}



/******************************************************************************/

/**
 * Generic Functions
 * @author 		Tobin Bradley, Neil Penman
 */

/**
 * Return whether a string is a number or not
 */
function isNumber (o) {
    return ! isNaN (o-0);
}

function esc(input) {
    if(input != null && input != undefined ) {
        return input
            .replace('&', '&amp;')
            .replace('<','&lt;')
            .replace('>', '&gt;');
    } else {
        return "";
    }

};


/**
 * Add commas to numeric values
 */
$.fn.digits = function(){
    return this.each(function(){
        $(this).text( $(this).text().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") );
    });
};

function downloadFileURL() {

    var url = "/download";
    return url;
}

function toggleBadURL(form, pKey) {

    var url = "/surveyKPI/items/";
    url += form;
    url += "/bad/";
    url += pKey;
    return url;
}

function getReportURL(ident, format) {

    var url = "/surveyKPI/reports/view/" + ident;
    if(typeof format != "undefined") {
        url += "?format=" + format;
    }
    return url;
}

function reportSaveURL(projectId) {

    var url = "/surveyKPI/reports/report/" + projectId;
    return url;
}

function dashboardStateURL() {

    var url = "/surveyKPI/dashboard/state";
    return url;
}

function dashboardURL(projectId) {

    if(!projectId) {
        projectId = 0;
    }
    var url = "/surveyKPI/dashboard/" + projectId;
    return url;
}

function deleteSurveyDataURL(sId) {

    var url = "/surveyKPI/surveyResults/";
    url += sId;
    return url;
}

function regionURL(region) {

    var url = "/surveyKPI/region/";
    url += region;

    return url;
}

function resultsURL (sId, qId, dateId, groupId, groupType, geoTable, fn, lang, timeGroup,
                     startDate, endDate, qId_is_calc, filter, advanced_filter, geomFormQuestions,
                     selectedGeomQuestion) {

    var url = "/surveyKPI/results/";
    url += sId;
    url += "?qId=" + qId;

    if(dateId != null) {
        url += "&dateId=" + dateId;
    }
    if(groupId != null && groupId != "-1") {
        url += "&groupId=" + groupId;

        if(groupType != null) {
            url += "&group_t=" + groupType;
        }
        if(geoTable != null && geoTable.toLowerCase() != "none") {
            url += "&geoTable=" + geoTable;
        }
    }
    if(fn) {
        url += "&fn=" + fn;
    } else {
        url += "&fn=percent";
    }

    if(lang) {
        url += "&lang=" + lang;
    } else {
        url += "&lang=eng";
    }

    if(typeof timeGroup !== "undefined") {
        url+= "&timeGroup=" + timeGroup;
    }

    if(typeof startDate !== "undefined" && startDate.length > 0) {
        url+= "&startDate=" + startDate;
    }

    if(typeof endDate !== "undefined" && endDate.length > 0) {
        url+= "&endDate=" + endDate;
    }

    if(qId_is_calc) {
        url+= "&qId_is_calc=true";
    }

    if(typeof filter !== "undefined") {
        url+= "&filter=" + encodeURIComponent(filter);
    }

    if(typeof advanced_filter !== "undefined") {
        url+= "&advanced_filter=" + encodeURIComponent(advanced_filter);
    }

    if(geomFormQuestions && geomFormQuestions.length > 0) {
        var qList = "";
        for(var i = 0; i < geomFormQuestions.length; i++) {
            if(i > 0) {
                qList += ",";
            }
            qList += geomFormQuestions[i].question;
        }
        url+= "&geom_questions=" + encodeURIComponent(qList);
    }
    if(selectedGeomQuestion) {
        url+= "&selected_geom_question=" + encodeURIComponent(selectedGeomQuestion);
    }

    return url;
}


function surveyList () {

    var url = "/surveyKPI/surveys";
    if(globals.gCurrentProject !== 0 && globals.gCurrentProject !== -1) {
        url += "?projectId=" + globals.gCurrentProject;
        url += "&blocked=true";
        return url;
    } else {
        return undefined;
    }

}


function regionsURL () {

    var url = "/surveyKPI/regions";
    return url;
}

/**
 * Web service handler for retrieving items in a table
 * @param {string} survey
 */
function formItemsURL (form, getFeatures, mustHaveGeom, start_key, rec_limit, bBad, filter, dateId, startDate,
                       endDate, advanced_filter, tz, inc_ro, geomFormQuestions) {

    var url = "/surveyKPI/items/";
	var ampersand = false;

    url += form;

    if(getFeatures == "no") {
        if(ampersand) {
            url += "&";
        } else {
            url += "?";
        }
        ampersand=true;
        url += "feats=no";
    }
    if(mustHaveGeom == "no") {
        if(ampersand) {
            url += "&";
        } else {
            url += "?";
        }
        ampersand=true;
        url += "mustHaveGeom=no";
    }
    url += "&start_key=" + start_key;
    if(rec_limit) {
        url += "&rec_limit=" + rec_limit;
    }
    if(bBad) {
        url += "&get_bad=true";
    }

    if(inc_ro) {
        url += "&inc_ro=true";
    }

    if(typeof filter !== "undefined") {
        url+= "&filter=" + encodeURIComponent(filter);
    }

    if(dateId != null) {
        url += "&dateId=" + dateId;
    }

    if(typeof startDate !== "undefined" && startDate.length > 0) {
        url+= "&startDate=" + startDate;
    }

    if(typeof endDate !== "undefined" && endDate.length > 0) {
        url+= "&endDate=" + endDate;
    }

    if(typeof advanced_filter !== "undefined" && advanced_filter.length > 0) {
        url+= "&advanced_filter=" + encodeURIComponent(advanced_filter);
    }

    if(geomFormQuestions && geomFormQuestions.length > 0) {
        var qList = "";
        for(let i = 0; i < geomFormQuestions.length; i++) {
            if(i > 0) {
                qList += ",";
            }
            qList += geomFormQuestions[i].question;
        }
        url+= "&geom_questions=" + encodeURIComponent(qList);
    }

	if(tz) {
		url += '&tz=' + encodeURIComponent(tz);
	}

    return url;
}

/**
 * Web service handler for retrieving user access data in a table
 */
function userItemsURL (view, start_key, rec_limit, dateId, startDate,
                       endDate, tz) {

	var url = "/surveyKPI/items/user/";

	url += view.uId;

	url += "?start_key=" + start_key;
	if(rec_limit) {
		url += "&rec_limit=" + rec_limit;
	}

	if(dateId != null) {
		url += "&dateId=" + dateId;
	}

	if(typeof startDate !== "undefined" && startDate.length > 0) {
		url+= "&startDate=" + startDate;
	}

	if(typeof endDate !== "undefined" && endDate.length > 0) {
		url+= "&endDate=" + endDate;
	}

	if(tz) {
		url += '&tz=' + encodeURIComponent(tz);
	}

	return url;
}

/**
 * Web service handler for retrieving user location data
 */
function userLocationsItemsURL (view, start_key, rec_limit, tz) {

    var url = "/surveyKPI/items/user_locations/";

    url += globals.gCurrentProject;

    url += "?start_key=" + start_key;
    if(rec_limit) {
        url += "&rec_limit=" + rec_limit;
    }

    if(tz) {
        url += '&tz=' + encodeURIComponent(tz);
    }

    return url;
}

/*
 * Web service handler for exporting a table
 * @param {string} table
 * @param {string} format
 */
function exportTableURL (table, format) {

    var url = "/surveyKPI/export/";
    url += table;
    url += "/" + format;
    return url;
}

/*
 * Web service handler for exporting an entire survey to legacy XLS
 */
function exportSurveyURL (
    sId,
    filename,
    language,
    format,
    split_locn,
    forms,
    exp_ro,
    merge_select_multiple,
    xlstype,
    embedImages,
    incHxl,
    exp_from_date,
    exp_to_date,
    dateQuestionId,
    filter,
    tz) {

    var url;
    if(xlstype === "html") {
        url = "/surveyKPI/exportSurvey/";
    } else {
        url = "/surveyKPI/exportxls/";
    }

    filename = cleanFileName(filename);

    exp_ro = exp_ro || false;

    if(!format) {
        format="xls";
    }

    url += sId;
    url += "/" + filename;
    url += "?language=" + language;

    url += "&format=" + format;
    if(format === "xls" && split_locn === true) {
        url += "&split_locn=true";
    }
    if(format === "xls" && merge_select_multiple === true) {
        url += "&merge_select_multiple=true";
    }
    url += "&forms=" + forms;
    url += "&exp_ro=" + exp_ro;
    if(typeof embedImages !== "undefined") {
        url += "&embedimages=" + embedImages;
    }
    if(typeof incHxl !== "undefined") {
        url += "&hxl=" + incHxl;
    }

    if(xlstype != "html") {
        url += "&filetype=" + xlstype;
    }
    if(dateQuestionId != 0) {	// -100 is a pseudo ID for Upload Time
        url += "&dateId=" + dateQuestionId;
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    if(filter) {
        url += '&filter=' + fixedEncodeURIComponent(filter);
    }

    if(tz) {
        url += '&tz=' + encodeURIComponent(tz);
    }

    return url;
}

/*
 * Web service handler for exporting an entire survey to XLSX
 */
function exportXlsxSurveyURL (
    sId,
    filename,
    language,
    split_locn,
    form,
    exp_ro,
    merge_select_multiple,
    embedImages,
    incHxl,
    exp_from_date,
    exp_to_date,
    dateQuestionId,
    filter,
    includeMeta,
    tz) {

    var url = "/surveyKPI/exportxlsx/";

    filename = cleanFileName(filename);

    exp_ro = exp_ro || false;

    url += sId;
    url += "/" + filename;
    url += "?language=" + language;

    if(split_locn === true) {
        url += "&split_locn=true";
    }
    if(merge_select_multiple === true) {
        url += "&merge_select_multiple=true";
    }
    url += "&form=" + form;
    url += "&exp_ro=" + exp_ro;
    if(typeof embedImages !== "undefined") {
        url += "&embedimages=" + embedImages;
    }
    if(typeof incHxl !== "undefined") {
        url += "&hxl=" + incHxl;
    }

    if(dateQuestionId > 0 || dateQuestionId <= -100) {	// -100 is a pseudo ID for Upload Time
        url += "&dateId=" + dateQuestionId;
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    if(filter) {
        url += '&filter=' + fixedEncodeURIComponent(filter);
    }

    if(includeMeta) {
        url += "&meta=true";
    }

	if(tz) {
		url += "&tz=" + encodeURIComponent(tz);
	}

    return url;
}

function fixedEncodeURIComponent (str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, escape);
}

function exportSurveyMediaURL (sId, filename, form, mediaQuestion, nameQuestions,
                               exp_from_date,
                               exp_to_date,
                               dateQuestionId,
                               filter) {

    var url = "/surveyKPI/exportSurveyMedia/";

    filename = cleanFileName(filename);

    url += sId;
    url += "/" + filename;

    url+="?mediaquestion=" + mediaQuestion;
    if(nameQuestions && nameQuestions.trim().length > 0) {
        url+="&namequestions=" + fixedEncodeURIComponent(nameQuestions);
    }

    if(dateQuestionId > 0 || dateQuestionId == -100) {	// -100 is a pseudo ID for Upload Time
        url += "&dateId=" + dateQuestionId;
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    if(filter) {
        url += '&filter=' + fixedEncodeURIComponent(filter);
    }

    return url;
}

function exportSurveyLqasURL (sId, sources, reportDefn,
                              exp_from_date,
                              exp_to_date,
                              dateQuestionId) {

    var url = "/surveyKPI/lqasExport/",
        hasParam = false;

    url += sId;
    url += "/" + reportDefn;

    if(sources) {
        url+="?sources=true";
        hasParam = true;
    }

    if(dateQuestionId > 0) {
        if(hasParam) {
            url += "&";
        } else {
            url += "?";
        }
        url += "dateId=" + dateQuestionId;

        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    return encodeURI(url);
}

/*
 * Web service handler for exporting an entire survey to OSM
 */
function exportSurveyOSMURL (sId, filename, forms, exp_ro,
                             exp_from_date,
                             exp_to_date,
                             dateQuestionId,
                             geomQuestion) {

    var url = "/surveyKPI/exportSurveyOSM/",
        form,
        ways = [];

    filename = cleanFileName(filename);

    exp_ro = exp_ro || false;

    url += sId;
    url += "/" + filename;


    if(typeof forms !== undefined && forms.length > 0 ) {
        url += "?ways=" + forms.join(',');
        url+= "&exp_ro=" + exp_ro;
    } else {
        url += "?exp_ro=" + exp_ro;
    }

    if(dateQuestionId > 0 || dateQuestionId == -100) {	// -100 is a pseudo ID for Upload Time
        url += "&dateId=" + dateQuestionId;
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    if(geomQuestion) {
        url += "&geom_question=" + geomQuestion;
    }

    return encodeURI(url);
}

/*
 * Web service handler for exporting a form as a shape file
 */
function exportSurveyMisc (sId, filename, form, format, exp_ro, language,
                           exp_from_date,
                           exp_to_date,
                           dateQuestionId,
                           queryId,
                           filter,
                           merge_select_multiple,
                           geomQuestion) {

    var url = "/surveyKPI/exportSurveyMisc/";

    exp_ro = exp_ro || false;

    filename = cleanFileName(filename);

    // Remove the ":false" from the form id which used by xls exports
    //form = form.substring(0, form.lastIndexOf(":"));

    if(typeof sId !== "undefined") {
        url += sId;
    } else {
        url += queryId;
    }
    url += "/" + filename;
    url += "/shape";
    url += "?form=" + form;
    url += "&format=" + format;
    url += "&exp_ro=" + exp_ro;
    url += "&language=" + encodeURIComponent(language);

    if(dateQuestionId > 0 || dateQuestionId == -100) {	// -100 is a pseudo ID for Upload Time
        url += "&dateId=" + dateQuestionId;
        if(exp_from_date) {
            url += "&from=" + exp_from_date;
        }
        if(exp_to_date) {
            url += "&to=" + exp_to_date;
        }
    }

    if(typeof queryId != "undefined") {
        url += "&query=true";
    }

    if(filter) {
        url += '&filter=' + fixedEncodeURIComponent(filter);
    }

    if(merge_select_multiple) {
        url += "&merge_select_multiple=true";
    }

    if(geomQuestion) {
        url += "&geom_question=" + geomQuestion;
    }

    return url;
}

/*
 * Web service handler for exporting a form as a shape file
 */
function exportSurveyThingsatURL (sId, filename, form, language) {

    var url = "/surveyKPI/exportSurveyThingsat/";


    filename = cleanFileName(filename);

    url += sId;
    url += "/" + filename;
    url += "?form=" + form;
    url += "&language=" + language;

    return encodeURI(url);
}

/*
 * Web service handler for exporting a form as a shape file
 */
function exportSurveyLocationURL (sId, filename, form, format, type) {

    var url = "/surveyKPI/exportSurveyLocation/";


    filename = cleanFileName(filename);

    url += sId;
    url += "/" + filename;
    url += "?form=" + form;
    url += "&format=" + format;
    url += "&type=" + type;

    return encodeURI(url);
}
