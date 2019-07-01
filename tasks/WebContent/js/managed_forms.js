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
 * Purpose: Manage the panels that display graphs, maps etc of results data
 */

var gUserLocale = navigator.language;
if (Modernizr.localstorage) {
    gUserLocale = localStorage.getItem('user_locale') || navigator.language;
}

"use strict";
requirejs.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 60,
    paths: {
        app: '../app',
        i18n: '../../../../js/libs/i18n',
        async: '../../../../js/libs/async',
        localise: '../../../../js/app/localise',
        modernizr: '../../../../js/libs/modernizr',
        common: '../../../../js/app/common',
        globals: '../../../../js/app/globals',
        crf: '../../../../js/libs/commonReportFunctions',
        toggle: 'bootstrap-toggle.min',
        lang_location: '../../../../js',
        file_input: '../../../../js/libs/bootstrap.file-input',
        datetimepicker: '../../../../js/libs/bootstrap-datetimepicker.min',
        icheck: '../../../../js/libs/wb/plugins/iCheck/icheck.min',
        svgsave: '../../../../js/libs/saveSvgAsPng',
        metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu',
        inspinia: '../../../../js/libs/wb/inspinia.v2.9.2',
        pace: '../../../../js/libs/wb/plugins/pace/pace.min',
        qrcode: '../../../../js/libs/jquery-qrcode-0.14.0.min',
	    slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll.min'

    },
    shim: {

        'common': ['jquery'],
        'datetimepicker': ['moment'],
        'app/plugins': ['jquery'],
        'crf': ['jquery'],
        'file_input': ['jquery'],
        'metismenu': ['jquery'],
        'icheck': ['jquery'],
        'app/chart': ['jquery'],
        'qrcode': ['jquery'],
	    'slimscroll': ['jquery'],
        'toggle': ['bootstrap.min'],
        'inspinia': ['jquery']
    }
});

require([
    'jquery',
    'common',
    'localise',
    'globals',
    'moment',
    'app/chart',
    'app/mapOL3',
    'svgsave',
    'app/actioncommon',
    'metismenu',
    'pace',
    'datetimepicker',
    'icheck',
    'crf',
    'qrcode',
    'toggle',
	'slimscroll',
    'inspinia'

], function ($,
             common,
             localise,
             globals,
             moment,
             chart,
             map,
             svgsave,
             actioncommon) {

    /*
     * Report definition
     * Default Settings
     *    Create a chart for data table columns that are enabled and do not have column specific setting
     * Column specific settings
     *    Override settings where names match
     */

    var gMapView = false;           // Set true when the map tab is shown
    var gChartView = false;         // Set true when the chart view is shown
    var gTimingView = false;        // Set true when the timing view is shown
    var gRefreshingData = false;    // Prevent double click on  refresh button
    var gSelectedIndexes = [];      // Array of selected row indexes
    var gAssignedCol = 0;           // Column that contains the assignment status

    window.gTasks = {
        cache: {
            surveyConfig: {},
            managedData: {},
            surveyList: {},
            surveyRoles: {},
            recordChanges: {}
        },
        gSelectedRecord: undefined,
        gSelectedSurveyIndex: undefined,
        gUpdate: [],
        gCurrentIndex: undefined,
        gPriKey: undefined,
        gSort: undefined,
        gDirn: undefined
    }

    $(document).ready(function () {

        /*
        var i,
            params,
            pArray = [],
            param = [],
            openingNew = false,
            dont_get_current_survey = true;

         */

        window.chart = chart;
        window.moment = moment;
        setCustomManage();
	    setupUserProfile(true);
        localise.setlang();		// Localise HTML
        userDefaults();

        $('.editRecordSection, .selectedOnly').hide();

        // Get the parameters and show a management survey if required
        /*
        params = location.search.substr(location.search.indexOf("?") + 1)
        pArray = params.split("&");
        dont_get_current_survey = false;
        for (i = 0; i < pArray.length; i++) {
            param = pArray[i].split("=");
            if (param[0] === "id") {
                dont_get_current_survey = true;		// Use the passed in survey id
                globals.gCurrentSurvey = param[1];
                saveCurrentProject(-1, globals.gCurrentSurvey);	// Save the current survey id
            } else if (param[0] === "new") {
                dont_get_current_survey = true;		// Don't set the current survey from the users defaults
                globals.gCurrentSurvey = -1;
                // TODO display list of
            }
        }
        */

        // Get the user details
        globals.gIsAdministrator = false;
        getLoggedInUser(refreshData, false, true, undefined, false, false);

        // Get the report definition

        // Set change function on projects
        $('#project_name').change(function () {
            projectChanged();
        });

        // Set change function on survey
        $('#survey_name').change(function () {
            gTasks.gSelectedSurveyIndex = $(this).val();
            globals.gCurrentSurvey = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].id;  // TODO remove
            surveyChanged();
        });

        /*
         * Setup dialog to change the current survey
         */
        $("#changeSurveys").click(function () {
            $("#surveySelect").modal("show");
        });

        $('#exitEditRecord').click(function() {
            window.history.back();
        });

        window.addEventListener("popstate", function(e) {
            exitEdit();
            return false;
        });

        $('#er_form_data').change(function(){
            if($(this).prop('checked')) {
                $('.showFormData').show();
                $('.showMgmtData').addClass('col-sm-6').removeClass('col-sm-12');
            } else {
                $('.showFormData').hide();
                $('.showMgmtData').addClass('col-sm-12').removeClass('col-sm-6');
            }
        });

        /*
         * Edit a record
         */
        $('#m_edit').click(function() {
            var columns = gTasks.cache.surveyConfig[globals.gViewId].columns;

            window.location.hash="#edit";
            $('.shareRecordOnly, .role_select').hide();
            $('#srLink').val("");
            getSurveyRoles(globals.gCurrentSurvey);
            getRecordChanges(gTasks.gSelectedRecord);
            actioncommon.showEditRecordForm(gTasks.gSelectedRecord, columns, $('#editRecordForm'), $('#surveyForm'));

            $('.overviewSection').hide();
            $('.editRecordSection').show();
        });

        /*
         * Open the dialog to assign a user to a record
         */
        $('#m_assign_to').click(function() {
            $('#userAssign').modal("show");
        });

        /*
         * Lock a record for editing by this user
         */
        $('#m_lock').click(function() {

            var url = "/surveyKPI/managed/lock/" + globals.gCurrentSurvey;
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/json",
                cache: false,
                url: url,
                data: {record: gTasks.gSelectedRecord.instanceid},
                success: function (data, status) {
                    removeHourglass();
                    globals.gMainTable.ajax.reload();
                    globals.gMainTable.row(gTasks.gSelectedRecord.instanceid.replace(':', '\\:'));      // Reselect the row, escape the :
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });
        /*
	     * Lock a record for editing by this user
	     */
        $('#assignUserSave').click(function() {

            var url = "/surveyKPI/managed/assign/" + globals.gCurrentSurvey + "/" + $('#user_to_assign').val();

            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/json",
                cache: false,
                url: url,
                data: {record: gTasks.gSelectedRecord.instanceid},
                success: function (data, status) {
                    removeHourglass();
                    globals.gMainTable.ajax.reload();
                    globals.gMainTable.row(gTasks.gSelectedRecord.instanceid.replace(':', '\\:'));      // Reselect the row, escape the :
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });

        });

        /*
         * Release a record
         */
        $('#m_release').click(function() {

            var url = "/surveyKPI/managed/release/" + globals.gCurrentSurvey;
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/json",
                cache: false,
                url: url,
                data: {record: gTasks.gSelectedRecord.instanceid},
                success: function (data, status) {
                    removeHourglass();
                    globals.gMainTable.ajax.reload();
                    globals.gMainTable.row(gTasks.gSelectedRecord.instanceid);      // Reselect the row
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        /*
         * Save a record of data in managed forms
         */
        $('#saveRecord').click(function () {
            var saveString = JSON.stringify(gTasks.gUpdate);
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/json",
                cache: false,
                url: "/surveyKPI/managed/update/" + globals.gCurrentSurvey + "/" + gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].managed_id,
                data: {settings: saveString},
                success: function (data, status) {
                    removeHourglass();
                    gTasks.gUpdate = [];
                    $('#saveRecord').prop("disabled", true);

                    globals.gMainTable.ajax.reload();
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        $('#shareRecord').click(function () {
            $('.shareRecordOnly').toggle();
            // Automatically get the link if there are no roles to select
            if ($('.role_select_roles').text().length === 0) {
                $("#getSharedRecord").trigger("click");
            }
        });

        $('#getSharedRecord').click(function () {

            var url = "/surveyKPI/managed/actionlink/" +
                globals.gCurrentSurvey + "/" +
                gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].managed_id + "/" +
                gTasks.gPriKey;

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

            addHourglass();
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {

                    removeHourglass();
                    $('#srLink').val(data.link);
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        console.log("Error: Failed to get sharing link: " + err);
                    }
                }
            });

        });

        /*
         * Save changes to the table columns that are shown
         */
        $('#applyColumns').click(function () {

            var
                config = gTasks.cache.surveyConfig[globals.gViewId],
                $this;

            $('input', '#tab-columns-content').each(function (index) {
                $this = $(this);
                config.columns[index + 1].hide = !$this.is(':checked');		// Ignore prikey

            });

            updateVisibleColumns(config.columns);
            saveConfig(config);

        });

        // Save changes to the barcodes that are shown
        $('#applyBarcodes').click(function () {

            var
                config = gTasks.cache.surveyConfig[globals.gViewId],
                $this;

            $('input', '#tab-barcode-content').each(function (index) {
                $this = $(this);
                config.columns[index + 1].barcode = $this.is(':checked');		// Ignore prikey

            });
            globals.gMainTable.ajax.reload(); // redraw
            saveConfig(config);

        });

        // Refresh menu
        $('#m_refresh').click(function () {
            refreshData();
        });

        /*
         * Set up the action menu functions
         */
        $('#getRelated').click(function () {

            var masterRecord = getSelectedRecord();

            if (typeof masterRecord != "undefined") {
                // 1. Hide results other than this primary result
                showManagedData(globals.gCurrentSurvey);

                // 2. Get related surveys and show it
                getRelatedList(globals.gCurrentSurvey, masterRecord);
            }
        });

        // Add a new chart
        $('#m_add_chart').click(function () {
            $('#chartInfo').hide();
            chart.addNewChart();
        });

        // Add a new map layer
        $('#m_add_layer').click(function () {
            $('#layerInfo').hide();
            $('#ml_title').val("");
            $('#layerEdit').modal("show");
        });

        // Respond to save on a layer edit dialog
        $('#addLayerSave').click(function () {
            map.saveLayer();
        });

        /*
         * Take action on tab change to initialise tab contents
         * Refer: http://stackoverflow.com/questions/20705905/bootstrap-3-jquery-event-for-active-tab-change
         */
        $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab
            console.log("tab:::: " + target);
            $('.targetSpecific').hide();
            gMapView = false;
            gChartView = false;
            gTimingView = false;
            if (target === '#map-view') {
                map.init(featureSelected);
                $('.mapOnly').show();
                gMapView = true;
            } else if(target === '#chart-view') {
                chart.init(true, false);
                $('.chartOnly').show();
                gChartView = true;
            } else if(target === '#timing-view') {
                chart.init(false, true);
                $('#m_add_chart').show();
                gTimingView = true;
            }
        });


    });

    // Generate a file based on chart data
    $('.genfile').click(function () {

        var format,
            $this = $(this);

        if ($this.hasClass("xls")) {
            format = "xlsx";
        } else if ($this.hasClass("pdf")) {
            format = "pdf";
        } else {
            format = "image";
        }
        genFile(false, format);
    });

    // Generate an xls file of basic counts for all data
    $('.genxlsfileall').click(function () {
        var $groupBy = $('#srf_group')
        if(gTasks.cache.surveyConfig[globals.gViewId] &&  $groupBy.html().length == 0) {
            var cols = gTasks.cache.surveyConfig[globals.gViewId].columns;
            var h = [];
            var idx = -1;
            var i;
            var currentSelectQuestion = "";
            var selectQuestion = "";

            h[++idx] = '<option value="-1">';
            h[++idx] = localise.set["none"];
            h[++idx] = '</option>';

            for(i = 0; i < cols.length; i++) {

                // Don't use some types to group
                if(cols[i].type === "image" || cols[i].type === "video" || cols[i].type === "audio"
                    || cols[i].displayName === "prikey" || cols[i].displayName === "the_geom") {

                    continue;

                }

                if(cols[i].type === "select") {
                    var n = cols[i].displayName.split(" - ");         // Handle legacy select multiple
                    if (n.length > 1) {
                        selectQuestion = n[0];
                        if(selectQuestion === currentSelectQuestion) {
                            continue;
                        } else {
                            currentSelectQuestion = selectQuestion;
                        }
                    } else {
                        selectQuestion = n;     // A compressed select multiple
                    }
                }
                h[++idx] = '<option value="';
                h[++idx] = i;
                h[++idx] = '">';
                h[++idx] = cols[i].type === "select" ? selectQuestion : cols[i].displayName;
                h[++idx] = '</option>';
            }
            $groupBy.empty().append(h.join(''));
        }
        $('#overviewReport').modal("show");
    });

    $('#overviewReportSave').click(function() {
        genFile(true, "xlsx");
        $('#overviewReport').modal("hide");
    });

    /*
     * Generate a file of data
     */
    function genFile(alldata, format) {
        var url = "/surveyKPI/tables/generate",
            filename,
            mime,
            data,
            settings = [],
            managedId,
            title = $('#survey_name option:selected').text(),
            project = $('#project_name option:selected').text(),
            charts = [],
            chartData,
            settingsObj,
            fromVal,
            toVal,
            colCount = 0,
            colName,
            colValue,
            i;

        /*
         * Get the settings
         */
        settingsObj = globals.gMainTable.settings();
        settings.push({
            k: localise.set["br_s"],
            v: settingsObj.search()
        });
        settings.push({
            k: localise.set["c_dateq"],
            v: $('#date_question :selected').text()
        });
        settings.push({
            k: localise.set["a_from_date"],
            v: $('#filter_from').val()
        });
        settings.push({
            k: localise.set["a_to_date"],
            v: $('#filter_to').val()
        });
        if(format === "xlsx" && alldata) {
            settings.push({
                k: localise.set["br_tf"],
                v: $('#srf_text_fn').val()
            });
            settings.push({
                k: localise.set["br_nf"],
                v: $('#srf_num_fn').val()
            });

            var groupIdx = $('#srf_group').val();
            if(groupIdx != -1) {
                settings.push({
                    k: "Group By",
                    v: gTasks.cache.surveyConfig[globals.gViewId].columns[groupIdx].displayName
                });
            }
        }
        colCount = globals.gMainTable.columns()[0].length;
        for (i = 0; i < colCount; i++) {
            colValue = globals.gMainTable.column(i).search();
            if (colValue && colValue.trim().length > 2) {

                settings.push({
                    k: $(globals.gMainTable.column(i).header()).find('span').text(),
                    v: colValue.substring(1, colValue.length - 1)	// Remove regexp
                });
            }

        }

        var tz = globals.gTimezone;

        data = getTableData(globals.gMainTable, gTasks.cache.surveyConfig[globals.gViewId].columns, format);

        if (format === "xlsx") {
            filename = title + ".xlsx";
            mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (format === "pdf") {
            filename = title + ".pdf";
            mime = "application/pdf";
        } else {
            // image
            filename = title + ".zip"
            mime = "application/zip";
        }

        if (format !== "image") {

            managedId = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].managed_id;

            if (format === "xlsx") {
                chartData = chart.getXLSData(alldata);
            }

            generateFile(url, filename, format, mime, data, globals.gCurrentSurvey, managedId, title, project, charts, chartData, settings, tz);
        } else {
            var countImages = $('.svg-container svg').length;
            $('.svg-container svg').each(function (index) {
                var $this = $(this),
                    elem = $this[0],
                    title = $this.closest('.ibox').find('.ibox-title h5').text();

                if (!title) {
                    title = "A Chart";
                }
                //svgsave.saveSvgAsPng(elem, "x.png");
                svgsave.svgAsPngUri(elem, undefined, function (uri) {
                    var chart = {
                        image: uri,
                        title: title
                    }
                    charts.push(chart);
                    countImages--;
                    if (countImages <= 0) {
                        generateFile(url, filename, format, mime, undefined, globals.gCurrentSurvey, managedId, title, project, charts, chartData, settings, tz);
                    }
                });

            });
        }

    }

    /*
     * Alerts
     */
    $('#show_alerts').click(function () {
        if (!globals.gAlertSeen) {
            globals.gAlertSeen = true;
            $('.alert_icon').removeClass("text-danger");
            saveLastAlert(globals.gLastAlertTime, true);
        }
    });

    // Respond to duplicate gReports menu
    if (isDuplicates) {
        $('#duplicateSearch').click(function () {
            showDuplicateData(globals.gCurrentSurvey);
        });
    }


    /*
     * Add filtering by date et al to datatable
     */
    if (!isDuplicates) {
        $.fn.dataTableExt.afnFiltering.push(
            function (oSettings, aData, iDataIndex) {

                if(filterOutAssignments(aData)) {
                    return false;
                }
                if(filterOutDate(aData)) {
                    return false;
                }
                return true;

            }
        );
    }

    /*
     * Test if this record should be filtered out based on its assignement
     */
    function filterOutAssignments(aData) {
        var myRecords = $('#my_records').prop('checked'),
            unassignedRecords = $('#unassigned_records').prop('checked'),
            otherRecords = $('#other_records').prop('checked');

        if(myRecords && unassignedRecords && otherRecords) {
            return false;
        }

        var assignment = aData[gAssignedCol];
        if(myRecords && assignment === globals.gLoggedInUser.ident) {
            return false;
        }
        if(unassignedRecords && assignment === '') {
            return false;
        }
        if(otherRecords && assignment !== '' && assignment !== globals.gLoggedInUser.ident) {
            return false;
        }
        return true;
    }

    /*
     * Test if this record should be filter out based on its date
     */
    function filterOutDate(aData) {
        var fromDate = document.getElementById('filter_from').value,
            toDate = document.getElementById('filter_to').value,
            dateCol = $('#date_question').val(),
            dateParts = [],
            dataDate,
            dataDateVal;

        fromDate = fromDate.replace(/\-/g, "");
        toDate = toDate.replace(/\-/g, "");

        dataDateVal = aData[dateCol];

        if (dataDateVal) {
            dataDate = dataDateVal.replace(/\-/g, "");
            dateParts = dataDate.split(" ");
            if (dateParts.length > 0) {
                dataDate = dateParts[0];
            }

            if (fromDate === "" && toDate === "") {
                return false;
            }
            if (fromDate === "" && toDate >= dataDate) {
                return false;
            } else if (toDate === "" && fromDate <= dataDate) {
                return false;
            } else if (fromDate <= dataDate && toDate >= dataDate) {
                return false;
            }

            return true;
        } else {
            return false;
        }
    }

    /*
     * Get the survey view (mini dashboard for a single survey)
     */
    function getSurveyView(viewId, sId, managedId, queryId) {

        var url;

        url = '/surveyKPI/surveyview/' + viewId;
        url += '?survey=' + sId;
        url += '&managed=' + managedId;
        url += '&query=' + queryId;		// ignore for moment, ie note caching is done only on survey index

        if (!globals.gViewId || !gTasks.cache.surveyConfig[globals.gViewId]) {

            addHourglass();
            $.ajax({
                url: url,
                cache: false,
                dataType: 'json',
                success: function (data) {
                    removeHourglass();

                    globals.gViewId = data.viewId;
                    gTasks.cache.surveyConfig[globals.gViewId] = data;

                    showManagedData(sId);

                    map.setLayers(data.layers);
                    chart.setCharts(data.charts);

                    // Add a config item for the group value if this is a duplicates search
                    if (isDuplicates) {
                        data.columns.unshift({
                            hide: true,
                            include: true,
                            name: "_group",
                            displayName: "_group"
                        });
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    map.deleteLayers();
                    //if (globals.gMainTable) {
                    //    globals.gMainTable.destroy(true);
                    //}
                    gRefreshingData = false;
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(localise.set["error"] + ": " + xhr.responseText);
                    }
                }
            });
        } else {
            showManagedData(sId);
        }
    }

    /*
     * Function called when the current survey is changed
     */
    function surveyChanged() {


        globals.gViewId = 0;        // TODO remember views set for each survey and restore

        getEligibleUsers();

        $('.editRecordSection, .selectedOnly').hide();
        if (globals.gCurrentSurvey > 0 && typeof gTasks.gSelectedSurveyIndex !== "undefined") {

            saveCurrentProject(-1, globals.gCurrentSurvey);
            getSurveyView(0, globals.gCurrentSurvey,
                gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].managed_id, 0);

            $('.main_survey').html($('#survey_name option:selected').text());

        } else {
            // No surveys in this project
            $('#content').empty();
            gRefreshingData = false;
        }
    }

    /*
     * Refresh the data used in this page
     */
    function refreshData() {

        if(!gRefreshingData) {
            gRefreshingData = true;
            gTasks.cache.surveyConfig = {};
            gTasks.cache.managedData = {};
            gTasks.cache.surveyList = {};
            gTasks.cache.surveyRoles = {};
            gTasks.cache.recordChanges = {};

            // Get the list of available surveys
            loadManagedSurveys(globals.gCurrentProject, surveyChanged);
        }

    }

    /*
     * Function called when the current project is changed
     */
    function projectChanged() {

        globals.gCurrentProject = $('#project_name option:selected').val();
        globals.gCurrentSurvey = -1;
        globals.gCurrentTaskGroup = undefined;

        saveCurrentProject(globals.gCurrentProject,
            globals.gCurrentSurvey,
            globals.gCurrentTaskGroup);

        refreshData();

    }

    /*
     * Show the survey data along with the management columns
     * If masterRecord is specified then only show that record
     */
    function showManagedData(sId) {

        var x = 1,
            columns = gTasks.cache.surveyConfig[globals.gViewId].columns,
            parameters,
            shownColumns = [],
            hiddenColumns = [],
            visibleColumns = [],
            h = [],
            idx = -1,
            hfoot = [],
            foot_idx = -1,
            i, j,
            colIdx = 0,
            $table = $("#trackingTable"),
            doneFirst = false,
            headItem,
            hColSort = [],
            hDups = [],
            hColSortIdx = -1,
            hDupsIdx = -1;


        if (globals.gMainTable) {
            globals.gMainTable.destroy();
        }

        // Add table
        h[++idx] = '<div class="table-responsive">';
        h[++idx] = '<table id="trackingTable" class="table table-striped">';

        // Add head
        h[++idx] = '<thead>';
        h[++idx] = '<tr>';

        for (i = 0; i < columns.length; i++) {
            headItem = columns[i];

            hColSort[hColSortIdx++] = addToColumnSort(headItem);
            if(isDuplicates) {
                hDups[hDupsIdx++] = addToDuplicateReportSelect(headItem);
            }

            shownColumns.push({
                "data": headItem.displayName
            });
            h[++idx] = '<th>';
            h[++idx] = '<span class="ch">';
            h[++idx] = headItem.displayName;
            h[++idx] = '</span>';
            h[++idx] = '</th>';
            hfoot[++foot_idx] = '<th></th>';
            headItem.colIdx = colIdx;
            colIdx++;

            if (headItem.hide) {
                hiddenColumns.push(i);
            } else {
                visibleColumns.push(i);
            }
        }
        h[++idx] = '</tr>';
        h[++idx] = '</thead>';
        h[++idx] = '<tfoot>';
        h[++idx] = '<tr>';
        h[++idx] = hfoot.join('');
        h[++idx] = '</tr>';
        h[++idx] = '</tfoot>';

        // close table
        h[++idx] = '</table>';
        h[++idx] = '</div>';

        $table.empty().html(h.join(''));

        /*
         * Apply data tables
         */
        var url = '/api/v1/data/';
        url += sId;

        url += "?mgmt=true";

        if (isDuplicates) {
            url += "&group=true";
        }

        url += "&format=dt";
        url += "&merge_select_multiple=yes";
        url += "&sort=prikey&dirn=desc";

        url += "&tz=" + encodeURIComponent(globals.gTimezone);

        $.fn.dataTable.ext.errMode = 'none';

        // Create data table
        globals.gMainTable = $table.DataTable({
            processing: true,
            responsive: true,
            select: {
                selector: 'td:not(:first-child)'
            },
            rowId: 'instanceid',
            ajax: url,
            columns: shownColumns,
            order: [0],
            initComplete: function (settings, json) {

                gRefreshingData = false;
                initialise();

                columns = gTasks.cache.surveyConfig[globals.gViewId].columns;
                parameters = gTasks.cache.surveyConfig[globals.gViewId].parameters;

                if(parameters && parameters.form_data === 'off') {
                    $('.manageFormData').hide();
                    $('.showFormData').hide();
                    $('.showMgmtData').addClass('col-sm-12').removeClass('col-sm-6');
                }

                this.api().columns().flatten().each(function (colIdx) {
                    if (columns[colIdx].filter || columns[colIdx].type === "select1") {
                        var select = $('<select class="form-control"/>')
                            .appendTo(
                                this.api().column(colIdx).header()
                            )
                            .on('change', function () {
                                var val = $(this).val();
                                if (val == '') {
                                    this.api()
                                        .column(colIdx)
                                        .search(val)
                                        .draw();
                                } else {
                                    this.api()
                                        .column(colIdx)
                                        .search("^" + $(this).val() + "$", true, false, false)
                                        .draw();
                                }
                                saveFilter(colIdx, val);
                            });

                        select.append($('<option value=""></option>'));

                        this.api()
                            .column(colIdx)
                            .cache('search')
                            .sort()
                            .unique()
                            .each(function (d) {
                                select.append($('<option value="' + d + '">' + d + '</option>'));
                            });


                        // Set current value
                        if (columns[colIdx].filterValue) {
                            select.val(columns[colIdx].filterValue).trigger('change');
                        }
                    }

                });
            },

            columnDefs: [
                {
                    targets: "_all",
                    render: function (data, type, full, meta) {
                        return addAnchors(data, true).join(',');
                    }
                },
                {
                    visible: false,
                    "targets": hiddenColumns
                },
                {
                    visible: true,
                    "targets": visibleColumns
                },
            ],
            language: {
                url: localise.dt()
            }
        });

        // Respond to an error
        globals.gMainTable.on('error.dt', function (e, settings, techNote, message) {
            alert(localise.set["c_error"] + ": " + message);
            gRefreshingData = false;
        });

        // Respond to selection of a row
        globals.gMainTable.off('select').on('select', function (e, dt, type, indexes) {
                recordSelected(indexes);
        });
        globals.gMainTable.off('deselect').on('deselect', function (e, dt, type, indexes) {
            $('.selectedOnly').hide();
        });

        // Highlight data conditionally, set barcodes
        globals.gMainTable.off('draw').on('draw', function () {

            if (isDuplicates) {

                var rows = globals.gMainTable.rows({page: 'current'}).nodes();
                var last = null;

                globals.gMainTable.column(0, {page: 'current'}).data().each(function (group, i) {
                    if (last !== group) {
                        $(rows).eq(i).before(
                            '<tr class="group"><td colspan="5">' + group + '</td></tr>'
                        );

                        last = group;
                    }
                });
            }

            columns = gTasks.cache.surveyConfig[globals.gViewId].columns;

            for (i = 0; i < columns.length; i++) {
                headItem = columns[i];

                // Highlighting
                if (headItem.markup) {
                    $(globals.gMainTable.column(headItem.colIdx).nodes()).each(function (index) {
                        var $this = $(this),
                            v = $this.text();

                        for (j = 0; j < headItem.markup.length; j++) {
                            if (headItem.markup[j].value == v) {
                                $this.addClass(headItem.markup[j].classes);
                            }
                        }

                    });
                }

                // Barcode
                if (headItem.barcode) {
                    $(globals.gMainTable.column(headItem.colIdx).nodes()).each(function (index) {
                        var $this = $(this),
                            opt = {
                                render: 'div',
                                size: 100,
                                text: $this.text()
                            }

                        $this.empty().qrcode(opt);

                    });
                }
            }

            // Refresh the other views that depend on the displayed rows
            map.refreshAllLayers(gMapView);
            chart.refreshAllCharts(gChartView, gTimingView, true);

        });

        // Respond to filter changes
        $('.table_filter').change(function () {
            globals.gMainTable.draw();
        });

        // Respond to change of search
        $('#trackingTable_filter input').focusout(function () {
            globals.gMainTable.draw();
        });

        /*
         * Settings
         */
        $('#tab-columns-content, #tab-barcode-content').html(hColSort.join(''));

        /*
         * Duplicates modal
         */
        if(isDuplicates) {
            $('#duplicateSelect').html(hDups.join(''));
            $('input', '#duplicateSelect').iCheck({
                checkboxClass: 'icheckbox_square-green',
                radioClass: 'iradio_square-green'
            });
        }

    }

    /*
     * Show duplicates data
     */
    function showDuplicateData(sId) {

        var url = '/api/v1/data/similar/' + sId + '/' + getSearchCriteria() + "?format=dt";
        url += "&tz=" + encodeURIComponent(globals.gTimezone);

        globals.gMainTable.ajax.url(url).load();

    }

    /*
     * Get the search criteria for a duplicate search
     */
    function getSearchCriteria() {
        var criteria = "";

        $('input', '#duplicateSelect').each(function (index) {
            var $this = $(this),
                fn;

            if ($this.is(':checked')) {
                if (criteria.length > 0) {
                    criteria += ',';
                }
                fn = $this.closest('.row').find('select').val();
                criteria += $this.val() + '::' + fn;
            }


        });

        return criteria;
    }

    /*
     * Add the column to the settings
     */
    function addToColumnSort(item) {
        var h = [],
            idx = -1;

        if (item.include) {
            h[++idx] = '<div class="setings-item">';
            h[++idx] = '<span>';
            h[++idx] = item.displayName;
            h[++idx] = '</span>';

            h[++idx] = '<div class="switch">';
            h[++idx] = '<input type="checkbox" name="columnSelect"';
            h[++idx] = ' class="columnSelect" value="';
            h[++idx] = item.displayName;
            h[++idx] = '"';
            if(!item.hide) {
            	h[++idx] = ' checked';
            }
            h[++idx] = '>';
            h[++idx] = '</div>';
            h[++idx] = '</div>';
        }
        return h.join('');
    }

    /*
     * Add the column to the select list for duplicate searches
     */
    function addToDuplicateReportSelect(item) {
        var h = [],
            idx = -1;

        if (item.include) {
            h[++idx] = '<div class="row">';
            h[++idx] = '<div class="setings-item">';

            h[++idx] = '<div class="col-sm-1">';
            h[++idx] = '<input type="checkbox" name="columnSelect"';
            h[++idx] = ' class="columnSelect" value="';
            h[++idx] = item.displayName;
            h[++idx] = '"';
            h[++idx] = '>';
            h[++idx] = '</div>';

            h[++idx] = '<div class="col-sm-4">';
            h[++idx] = '<span>';
            h[++idx] = item.displayName;
            h[++idx] = '</span>';
            h[++idx] = '</div>';


            h[++idx] = '<div class= "col-sm-4">';
            h[++idx] = '<select>';
            h[++idx] = '<option value="exact">';
            h[++idx] = localise.set["br_exact"];
            h[++idx] = '</option>';
            h[++idx] = '<option value="lower">';
            h[++idx] = localise.set["br_ci"];
            h[++idx] = '</option>';
            h[++idx] = '<option value="soundex">';
            h[++idx] = localise.set["br_sdx"];
            h[++idx] = '</option>';
            h[++idx] = '</select>';
            h[++idx] = '</div>';


            h[++idx] = '</div>';	// Settings item
            h[++idx] = '</div>';		// Row

        }
        return h.join('');
    }

    /*
     * Get surveys and update the survey lists on this page
     *  This is a different function from the common loadSurveys function as processing differs depending on whether
     *    there is a managed form
     *   applied to the survey
     */
    function loadManagedSurveys(projectId, callback) {

        var url = "/surveyKPI/surveys?projectId=" + projectId + "&blocked=true",
            $elemSurveys = $('#survey_name');


        if (typeof projectId !== "undefined" && projectId != -1 && projectId != 0) {

            addHourglass();
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {

                    var i,
                        item,
                        h = [],
                        idx = -1,
                        firstSurvey = true,
                        firstSurveyId = undefined,
                        firstSurveyIndex = undefined;

                    removeHourglass();

                    gTasks.cache.surveyList[globals.gCurrentProject] = data;
                    gTasks.gSelectedSurveyIndex = undefined;

                    for (i = 0; i < data.length; i++) {
                        item = data[i];
                        if (true) {     // Previously filtered out non managed forms if it was the managed forms page
                            h[++idx] = '<option value="';
                            h[++idx] = i;
                            h[++idx] = '">';
                            h[++idx] = item.displayName;
                            h[++idx] = '</option>';

                            if (firstSurvey) {
                                firstSurveyId = item.id;
                                firstSurveyIndex = i;
                                firstSurvey = false;
                            }

                            if (item.id === globals.gCurrentSurvey) {
                                gTasks.gSelectedSurveyIndex = i;
                            }
                        }

                    }

                    $elemSurveys.empty().html(h.join(''));

                    if (!gTasks.gSelectedSurveyIndex && firstSurveyId) {
                        globals.gCurrentSurvey = firstSurveyId;
                        gTasks.gSelectedSurveyIndex = firstSurveyIndex;
                    } else if (gTasks.gSelectedSurveyIndex && firstSurveyId) {
                        $elemSurveys.val(gTasks.gSelectedSurveyIndex);
                    }

                    if (typeof callback == "function") {
                        callback();
                    } else {
                        gRefreshingData = false;
                    }
                },
                error: function (xhr, textStatus, err) {

                    removeHourglass();
                    gRefreshingData = false;
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        console.log(localise.set["c_error"] + ": " + err);
                    }
                }
            });
        } else {
            gRefreshingData = false;
        }
    }

    /*
     * Get the currently selected recoord
     */
    function getSelectedRecord() {

        var record,
            idx;

        $('input[type=radio]:checked', '#content table').each(function () {
            idx = $(this).val();
        });

        return idx;
    }

    /*
     * Get data related to the currently selected record
     */
    function getRelatedList(sId, masterRecord) {
        var record = gTasks.gSelectedRecord;

        var url = '/surveyKPI/managed/connected/' + sId + '/0/' + record.prikey;

        $('#relatedData').empty();
        addHourglass();
        $.ajax({
            url: url,
            cache: false,
            dataType: 'json',
            success: function (data) {
                removeHourglass();

                var i;

                for (i = 0; i < data.length; i++) {
                    showRelated(i, data[i]);
                }


            },
            error: function (xhr, textStatus, err) {
                removeHourglass();
                if (xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    alert(localise.set["c_error"] + sId);
                }
            }
        });

    }

    /*
     * Show a related data item
     */
    function showRelated(itemIndex, item) {
        var h = [],
            idx = -1,
            tableId = "relTable" + itemIndex;

        h[++idx] = '<div class="row">'
        h[++idx] = '<div class="col-md-12">';
        h[++idx] = '<div class="ibox float-e-margins">';
        h[++idx] = '<div class="ibox-title">';
        h[++idx] = '<h5>';
        h[++idx] = '</h5>';
        h[++idx] = '</div>';
        h[++idx] = '<div class="ibox-content">';
        h[++idx] = '<div class="row">';
        h[++idx] = '<div class="col-md-12">';
        h[++idx] = '<table id="';
        h[++idx] = tableId;
        h[++idx] = '" class="table table-striped table-responsive toggle-arrow-tiny" data-page-size="8">';
        h[++idx] = '</table>';
        h[++idx] = '</div>';
        h[++idx] = '</div>';
        h[++idx] = '</div>';
        h[++idx] = '</div>';
        h[++idx] = '</div>';
        h[++idx] = '</div>';

        $('#relatedData').append(h.join(""));
        getRelatedTable(tableId, item)
    }

    function getRelatedTable(tableId, item) {

        var url,
            managed =  "true";

        var url = "/api/v1/data/";

        if (item.type === "child") {
            url += globals.gCurrentSurvey + "?mgmt=" + managed + "&form=" + item.fId + "&parkey=" + item.parkey;
        } else if (item.type === "link") {
            url += item.sId + "?mgmt=" + managed + "&form=" + item.fId + "&hrk=" + item.hrk;
        }
        url += "&tz=" + encodeURIComponent(globals.gTimezone);

        addHourglass();
        $.ajax({
            url: url,
            cache: false,
            dataType: 'json',
            success: function (data) {
                removeHourglass();
                showManagedData(globals.gCurrentSurvey)


            },
            error: function (xhr, textStatus, err) {
                removeHourglass();
                if (xhr.readyState == 0 || xhr.status == 0) {
                    return;  // Not an error
                } else {
                    alert(localise.set["c_error"] + ": " + url);
                }
            }
        });
    }

    function updateVisibleColumns(cols) {
        var i,
            hiddenColumns = [],
            visibleColumns = [];

        for (i = 0; i < cols.length; i++) {
            if (cols[i].hide) {
                hiddenColumns.push(i);
            } else {
                visibleColumns.push(i);
            }
        }

        globals.gMainTable.columns(hiddenColumns).visible(false, false);
        globals.gMainTable.columns(visibleColumns).visible(true, false);
        $('#trackingTable').width('auto');
        globals.gMainTable.columns.adjust().draw(); // adjust column sizing and redraw
    }

    /*
     * Save a filter setting
     */
    function saveFilter(column, value) {

        var
            config = gTasks.cache.surveyConfig[globals.gViewId],
            i;

        if (value == '') {
            value = undefined;
        }

        for (i = 0; i < config.columns.length; i++) {
            if (config.columns[i].colIdx == column) {
                config.columns[i].filterValue = value;
                break;
            }
        }

        saveConfig(config);
    }

    /*
     * Update the saved configuration
     *  This includes information on specific charts that are added to the survey whereas the report save below
     *  is for the base report.
     */
    function saveConfig() {
        var configColumns = [],
            columns = gTasks.cache.surveyConfig[globals.gViewId].columns,
            i;

        for (i = 0; i < columns.length; i++) {
            configColumns.push({
                name: columns[i].displayName,
                hide: columns[i].hide,
                barcode: columns[i].barcode,
                filterValue: columns[i].filterValue,
                chart_type: columns[i].chart_type,
                width: columns[i].width ? columns[i].width : 6
            });
        }

        var saveView = JSON.stringify(configColumns);
        var viewId = globals.gViewId || 0;
        var url = "/surveyKPI/surveyview/" + viewId;
        url += '?survey=' + globals.gCurrentSurvey;
        url += '&managed=' + 0;						// TODO
        url += '&query=' + 0;							// TODO

        addHourglass();
        $.ajax({
            type: "POST",
            dataType: 'json',
            cache: false,
            contentType: "application/json",
            url: url,
            data: {view: saveView},
            success: function (data, status) {
                removeHourglass();
                if(globals.gViewId != data.viewId) {  // Store data under new viewId
                    gTasks.cache.surveyConfig[data.viewId] = gTasks.cache.surveyConfig[globals.gViewId];
                    globals.gViewId = data.viewId;
                }
                $('#right-sidebar').removeClass("sidebar-open");
            }, error: function (data, status) {
                removeHourglass();
                alert(data.responseText);
            }
        });
    }

    /*
     * Perform initialisation after the data and the survey view configuration have been loaded
     */
    function initialise() {


        var columns = gTasks.cache.surveyConfig[globals.gViewId].columns,
            i,
            h = [],
            idx = -1,
            select_questions = {};

        /*
         * Add an indicator to columns if they can be used as a chart question
         * Merge choices in select multiples
         */

        for(i = 0; i < columns.length; i++) {
            var d = columns[i];

            if(
                d.displayName !== "prikey" &&
                d.displayName !== "_upload_time" &&
                d.displayName !== "_start" &&
                d.displayName !== "_end" &&
                d.type !== "geopoint" &&
                d.type !== "dateTime" &&
                d.type !== "time" &&
                d.type !== "date" &&
                d.type !== "image" && d.type !== "video" && d.type !== "audio") {
                d.chartQuestion = true;
            } else {
                d.chartQuestion = false;
            }

            if(d.type === "select") {
                var n = d.displayName.split(" - ");
                if (n.length > 1) {

                    if (!select_questions[n[0]]) {		// New choice

                        d.select_name = n[0];
                        d.choices = [];
                        d.choiceNames = [];
                        d.choices.push(d.displayName);
                        d.choiceNames.push(d.displayName);

                        select_questions[n[0]] = d;
                        d.chartQuestion = true;
                    } else {
                        var f = select_questions[n[0]];
                        f.choices.push(d.displayName);
                        f.choiceNames.push(d.displayName);
                        d.chartQuestion = false;
                    }
                }
            } else if(d.type === "dateTime" || d.type === "date") {

                    h[++idx] = '<option value="';
                    h[++idx] = i;
                    h[++idx] = '">';
                    h[++idx] = columns[i].displayName;
                    h[++idx] = '</option>';
            } else if (d.displayName === '_assigned') {
                gAssignedCol = i;
            }


        }
        
        $('#date_question').empty().html(h.join(''));
    }

    function exitEdit() {
        if(gTasks.gUpdate.length > 0) {
            if (!confirm(localise.set["c_unsav"])) {
                return;
            }
        }
        $('.overviewSection').show();
        $('.editRecordSection').hide();
    }

    /*
     * Respond to a map feature being selected
     */
    function featureSelected(event) {
        if(event.selected.length == 1) {
            var feature = event.selected[0];
            var index = feature.get('record');
            var indexes = [];
            indexes.push(index);
            recordSelected(indexes);
        } else {
            recordUnSelected();
        }
    }

    /*
     * Respond to a record of data being selected
     */
    function recordUnSelected() {
        gSelectedIndexes = [];
        gTasks.gSelectedRecord = undefined;
        $('.selectedOnly').hide();
    }

    function recordSelected(indexes) {
        gSelectedIndexes = indexes;
        gTasks.gSelectedRecord = globals.gMainTable.rows(gSelectedIndexes).data().toArray()[0];
        $('.selectedOnly').hide();
        if(gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned === globals.gLoggedInUser.ident) {
            $('.assigned').show();
        } else if(gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned !== globals.gLoggedInUser.ident) {
            $('.assigned_other').show();
        } else {
            $('.not_assigned').show();
        }

        if(globals.gIsAdministrator) {
            $('.assigned_admin').show();
        }
    }

    /*
     * Set up the user defaults on the page
     * TODO restore these from local session storage
     */
    function userDefaults() {
        $('#my_records').prop('checked', true);
        $('#unassigned_records').prop('checked', true);
        $('#other_records').prop('checked', true);
    }

    /*
	 * Get the list of users from the server
	 */
    function getEligibleUsers() {

        if(globals.gCurrentSurvey) {
            addHourglass();
            $.ajax({
                url: "/surveyKPI/userList/survey/" + globals.gCurrentSurvey,
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();

                    var h = [],
                        idx = -1,
                        $elem = $('#user_to_assign');

                    $elem.empty();
                    if(data && data.length > 0) {
                        for(i = 0; i < data.length; i++) {
                            h[++idx] = '<option value="';
                            h[++idx] = data[i].ident;
                            h[++idx] = '">';
                            h[++idx] = data[i].name;
                            h[++idx] = '</option>';
                        }
                        $elem.html(h.join(''));
                    }

                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(localise.set["error"] + ": " + err);
                    }
                }
            });
        }
    }

    /*
     * Get the list of changes to this record from the server
     */
    function getRecordChanges(record) {

        var hrk = record["Key"];
        var instanceId = record["instanceid"];
        var key;

        if(hrk && hk.trim.length > 0) {
            key = hrk;
        } else {
            key = instanceId;
        }

        if(globals.gCurrentSurvey) {
            addHourglass();
            $.ajax({
                url: "/api/v1/data/changes/" + globals.gCurrentSurvey + "/" + key,
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();

                    var h = [],
                        idx = -1,
                        $elem = $('#changes'),
                        i;

                    // Add header
                    h[++idx] = '<div class="row">';
                    h[++idx] = '<div class="col-sm-2">';
                    h[++idx] = localise.set["u_chg"];
                    h[++idx] = '</div>';    // User name
                    h[++idx] = '</div>';    // Header row
                    if(data && data.length > 0) {
                        for(i = 0; i < data.length; i++) {
                            h[++idx] = '<div class="row">';
                            h[++idx] = '<div class="col-sm-2">';    // user
                            h[++idx] = data[i].userName;
                            h[++idx] = '</div>';    // user
                            h[++idx] = '</div>';    // row
                        }
                    }
                    $elem.empty().html(h.join(''));


                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(localise.set["error"] + ": " + err);
                    }
                }
            });
        }
    }

});


