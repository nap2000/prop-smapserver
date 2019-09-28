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
        multiselect: '../../../../js/libs/bootstrap-multiselect',
        knockout: '../../../../js/libs/knockout',
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
        'inspinia': ['jquery'],
        'multiselect': ['jquery', 'knockout']
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
    'inspinia',
    'multiselect'

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
    var gGetSettings = false;       // Use the settings from the database rather than the client
    var gDeleteColumn = -1;         // The index of the column that indicates if the record is deleted
    var gDeleteReasonColumn = -1;   // The index of the column that has the reason for a delete
    var gBad;                       // A boolean indicating the direction of toggle of a deleted state
    var gLocalDefaults = {};

    var gOverallMapConfig = {       // overall map
        id: 'map',
        map: undefined,
        task: false
    };

    var gTags;                      // Task Map
    var gModalMapInitialised;
    var gTaskMapConfig = {
        id: 'mapModal',
        map: undefined,
        task: true
    };

    var gCurrentGroup,
        gCurrentLocation = '-1';

    window.gTasks = {
        cache: {
            surveyConfig: {},
            managedData: {},
            surveyList: {},
            surveyRoles: {},
            recordChanges: {},
            groupSurveys: {},
            currentData: undefined,
            data: {}
        },
        gSelectedRecord: undefined,
        gSelectedSurveyIndex: undefined,
        gUpdate: [],
        gCurrentIndex: undefined,
        gPriKey: undefined,
        gSort: undefined,
        gDirn: undefined
    };
    window.gCurrentTaskFeature; // Currently edited task feature, hack to support shared functions with console
    window.gUpdateFwdPassword = undefined;
    window.gSaveType = '';
    window.gNotifications = undefined;
    window.gChanges = [];


    $(document).ready(function () {

        window.chart = chart;
        window.moment = moment;
        setCustomManage();
	    setupUserProfile(true);
        localise.setlang();		// Localise HTML
        userDefaults();

        // Set page defaults
        var def = getFromLocalStorage("console");
        if(def) {
            try {
                gLocalDefaults = JSON.parse(def);

                if(gLocalDefaults) {
                    $('#my_records').prop('checked', gLocalDefaults.myRecords);
                    $('#unassigned_records').prop('checked', gLocalDefaults.unassignedRecords);
                    $('#other_records').prop('checked', gLocalDefaults.otherRecords);
                } else {
                    gLocalDefaults = {};
                }

            } catch (err) {
                gLocalDefaults = {};
            }
        }

        $('.editRecordSection, .selectedOnly').hide();

        // Get the parameters and start editing a survey if one was passed as a parameter
        var params = location.search.substr(location.search.indexOf("?") + 1);
        var pArray = params.split("&");
        var dont_get_current_survey = false;
        $('.srview').hide();
        for (i = 0; i < pArray.length; i++) {
            var param = pArray[i].split("=");
            if ( param[0] === "id" ) {
                dont_get_current_survey = true;		// Use the passed in survey id
                globals.gCurrentSurvey = param[1];
                saveCurrentProject(-1, globals.gCurrentSurvey, undefined);	// Save the current survey id
            } else if ( param[0] === "instanceid" ) {
                globals.gCurrentInstance = param[1];
                $('.mrview').hide();
                $('.srview').show();
            }
        }

        // Get the user details
        globals.gIsAdministrator = false;
        getLoggedInUser(refreshData, false, true, undefined, false, dont_get_current_survey);

        // Set change function on projects
        $('#project_name').change(function () {
            projectChanged();
        });

        // Get locations
        getLocations(processLocationList);

        // Get Notification Types for this server
        getNotificationTypes();

        // Set response to clearing single record view
        $('#clear_srview').click(function() {
            globals.gCurrentInstance = undefined;
            $('.srview').hide();
            $('.mrview').show();
            refreshData();
        });

        // Set change function on survey
        $('#survey_name').change(function () {
            gTasks.gSelectedSurveyIndex = $(this).val();
            globals.gCurrentSurvey = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].id;
            gGetSettings = true;
            surveyChanged();
        });

        // Set change function on group survey
        $('#group_survey').change(function () {
            globals.gGroupSurveys[globals.gCurrentSurvey] = $(this).val();
            groupSurveyChanged();
        });

        // Set change function on sub form
        $('#sub_form').change(function () {
            globals.gSubForms[globals.gCurrentSurvey] = $(this).val();
            subFormChanged();
        });

        // Set change function on advanced filter
        $('#advanced_filter').change(function () {
            showManagedData(globals.gCurrentSurvey, showTable, true);
        });

        // Set change function on limit
        $('#limit').change(function () {
            showManagedData(globals.gCurrentSurvey, showTable, true);
        });

        // Set change function on show deleted
        $('#include_bad').change(function () {
            showManagedData(globals.gCurrentSurvey, showTable, true);
        });

        /*
         * Setup dialog to change the current survey
         */
        $("#changeSurveys").click(function () {
            $("#surveySelect").modal("show");
        });

        $('.exitEditRecord').click(function() {
            showManagedData(globals.gCurrentSurvey, showTable, true);
            window.history.back();
        });

        setupTaskDialog();
        setupNotificationDialog();

        // Enable the save notifications function
        $('#saveNotification').click(function(){sendImmediateNotification();});

        /*
         * Update the properties of a task
         */
        $('#taskPropertiesSave').off().click(function () {
            var instance;
            if(typeof gTasks !== "undefined" && gTasks.gSelectedRecord) {
                instance = gTasks.gSelectedRecord.instanceid;
            }
            saveTask(true, gCurrentTaskFeature, gSaveType, instance, doneTaskSave, 0);
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
            showRecord(true);
        });

        /*
	     * View a record
	     */
        $('#m_view').click(function() {
            showRecord(false);
        });

        /*
         * Open the dialog to assign a user to a record
         */
        $('#m_assign_to').click(function() {
            if(gTasks.gSelectedRecord._assigned) {
                $('#user_to_assign').val(gTasks.gSelectedRecord._assigned);
            } else {
                $('#user_to_assign').val("_none");
            }
            $('#userAssign').modal("show");
        });

        /*
         * Delete a record
         */
        $('#m_delete').click(function() {
            toggleRecord(localise.set["c_del"], true);
        });

        /*
         * UnDelete a record
         */
        $('#m_undelete').click(function() {
            toggleRecord(localise.set["c_undel"], false);
        });

        $('#toggleRecordSave').click(function(){
            var url = "/surveyKPI/items/" + globals.gCurrentSurvey + "/survey/bad/" + gTasks.gSelectedRecord.instanceid;
            var reason = $('#toggle_reason').val();
            addHourglass();

            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/json",
                cache: false,
                url: url,
                data: {
                    value: gBad,
                    reason: reason
                },
                success: function (data, status) {
                    removeHourglass();
                    refreshData();
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
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
                data: {
                    record: gTasks.gSelectedRecord.instanceid
                },
                success: function (data, status) {
                    removeHourglass();
                    showManagedData(globals.gCurrentSurvey, showTable, true);
                }, error: function (data, status) {
                    removeHourglass();
                    alert(data.responseText);
                }
            });
        });

        /*
	     * Assign a user
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
                    showManagedData(globals.gCurrentSurvey, showTable, true);
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
                    showManagedData(globals.gCurrentSurvey, showTable, true);
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
                url: "/surveyKPI/managed/update_gs/" + globals.gCurrentSurvey + "/" + globals.gGroupSurveys[globals.gCurrentSurvey],
                data: {
                    updates: saveString,
                    instanceid: gTasks.gSelectedRecord.instanceid,
                    groupForm: globals.gSubForms[globals.gCurrentSurvey]
                },
                success: function (data, status) {
                    removeHourglass();
                    gTasks.gUpdate = [];
                    getRecordChanges(gTasks.gSelectedRecord);
                    $('.re_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
                }, error: function (data, status) {
                    removeHourglass();
                    $('.re_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + data.responseText);
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

            var groupSurvey = globals.gGroupSurveys[globals.gCurrentSurvey];

            var url = "/surveyKPI/managed/actionlink/" + globals.gCurrentSurvey + "/" + gTasks.gPriKey;
            if(groupSurvey && groupSurvey !== "") {
                url += "?groupSurvey=" + groupSurvey;
            }

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

        $('.genrecordpdf').click(function ()  {
            $('#genPdfPopup').modal("show");
        });

        $('#genPdf').click(function() {

            var language = $('#pdf_language option:selected').val();
            var orientation = $("#pdf_orientation").val();
            var include_references = $("#pdf_include_references").prop('checked');
            var launched_only = $("#pdf_launched_only").prop('checked');
            var sIdent = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].ident;
            var instanceId = gTasks.gSelectedRecord.instanceid;

            downloadPdf(language, orientation, include_references, launched_only, sIdent, instanceId);
        });

        /*
         * Save changes to the table columns that are shown
         */
        $('#applyColumns').click(function () {

            var
                config = gTasks.cache.currentData.schema,
                $this;

            $('input', '#tab-columns-content').each(function (index) {
                $this = $(this);
                config.columns[index + 1].hide = !$this.is(':checked');		// Ignore prikey

            });

            updateVisibleColumns(config.columns);
            saveColumns();

        });

        // Save changes to the barcodes that are shown
        $('#applyBarcodes').click(function () {

            var
                config = gTasks.cache.currentData.schema,
                $this;

            $('input', '#tab-barcode-content').each(function (index) {
                $this = $(this);
                config.columns[index + 1].barcode = $this.is(':checked');		// Ignore prikey

            });
            showManagedData(globals.gCurrentSurvey, showTable, false); // redraw
            saveConfig(config);

        });

        // Refresh menu
        $('#m_refresh').click(function (e) {
            e.preventDefault();
            if(window.location.hash === "#edit") {
                getRecordChanges(gTasks.gSelectedRecord);
            } else {
                refreshData();
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
            map.saveLayer(gOverallMapConfig.map);
        });

        // Respond to a new task location being clicked
        $('#taskPropertiesForm').on("smap_task::geopoint", function (event, config) {
            gCurrentTaskFeature.geometry = config.value;
            console.log("New task geopoint");
        });

        /*
         * Take action on tab change to initialise tab contents
         * Refer: http://stackoverflow.com/questions/20705905/bootstrap-3-jquery-event-for-active-tab-change
         */
        $('a[data-toggle="tab"]', '#mainTabs').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab

            console.log("tab:::: " + target);
            $('.targetSpecific').hide();
            gMapView = false;
            gChartView = false;
            gTimingView = false;
            if (target === '#map-view') {
                map.initDynamicMap(gOverallMapConfig, false, featureSelected, true);
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

        $('a[data-toggle="tab"]', '#editTabs').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab

            $('.historyView,.dataView').hide();

            if (target === '#data-view') {
                $('.dataView').show();
            } else if(target === '#changes-view') {
                $('.historyView').show();
            }

            $('.re_alert').hide();
        });


        /*
         * Respond to a location being selected
         */
        $('#location_select').change(function () {
            var idx = $(this).val();

            // Clear old values
            $('#nfc_uid').val("");
            $('#location_save_panel').hide();
            window.gSaveType = '';

            if(idx != -1) {
                $('#nfc_uid').val(gTags[idx].uid);
                var lat = gTags[idx].lat;
                var lon = gTags[idx].lon;
                if (lon || lat) {
                   map.setSelectedFeature(gTaskMapConfig, undefined, lon, lat, true);

                }
                gCurrentTaskFeature.geometry.coordinates[0] = lon;
                gCurrentTaskFeature.geometry.coordinates[1] = lat;
            }
        });

        /*
         * Callback when history filter changes
         */
        $('.changes_filter').change(function () {
            getRecordChanges(gTasks.gSelectedRecord);
        });

        /*
         * SHow and hide the controls
         */
        $('#hideFilters').click(function(){
            $('.filtersShown').hide();
            $('.filtersHidden').show();
            return false;
        });

        $('#showFilters').click(function(){
            $('.filtersShown').show();
            $('.filtersHidden').hide();
            return false;
        });


    });         // End of document ready

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
        if(gTasks.cache.currentData.schema &&  $groupBy.html().length == 0) {
            var cols = gTasks.cache.currentData.schema.columns;
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
            groupSurvey,
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
        settings.push({
            k: localise.set["c_deleted"],
            v: $('#include_bad').prop('checked') ? localise.set["c_yes"] : localise.set["c_no"]
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
                    v: gTasks.cache.currentData.schema.columns[groupIdx].displayName
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

        data = getTableData(globals.gMainTable, gTasks.cache.currentData.schema.columns, format);

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

        if(globals.gGroupSurveys[globals.gCurrentSurvey] && globals.gGroupSurveys[globals.gCurrentSurvey] != "") {
            groupSurvey = globals.gGroupSurveys[globals.gCurrentSurvey];
        }

        if (format !== "image") {

            if (format === "xlsx") {
                chartData = chart.getXLSData(alldata);
            }

            generateFile(url, filename, format, mime, data, globals.gCurrentSurvey, groupSurvey, title, project, charts, chartData, settings, tz);
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
                        generateFile(url, filename, format, mime, undefined, globals.gCurrentSurvey, groupSurvey, title, project, charts, chartData, settings, tz);
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
                //if(filterOutDate(aData)) {
                //    return false;
                //}
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
     * Function called when the current survey is changed
     */
    function surveyChanged() {


        globals.gViewId = 0;        // TODO remember views set for each survey and restore

        getEligibleUsers();

        $('.editRecordSection, .selectedOnly, .re_alert').hide();
        if (globals.gCurrentSurvey > 0 && typeof gTasks.gSelectedSurveyIndex !== "undefined") {

            getLanguageList(globals.gCurrentSurvey, undefined, false, '.language_sel', false, -1);
            saveCurrentProject(-1, globals.gCurrentSurvey);
            getGroupForms(globals.gCurrentSurvey);

        } else {
            // No surveys in this project
            $('#content').empty();
            gRefreshingData = false;
        }
    }

    /*
     * Function called when the current group survey is changed
     */
    function groupSurveyChanged() {

        if (globals.gCurrentSurvey > 0 && typeof gTasks.gSelectedSurveyIndex !== "undefined") {

            saveCurrentGroupSurvey(globals.gCurrentSurvey,
                globals.gGroupSurveys[globals.gCurrentSurvey],
                globals.gSubForms[globals.gCurrentSurvey]);

            showManagedData(globals.gCurrentSurvey, showTable, false);

        }
    }

    /*
     * Function called when the current sub form is changed
  */
    function subFormChanged() {

        if (globals.gCurrentSurvey > 0 && typeof gTasks.gSelectedSurveyIndex !== "undefined") {
            saveCurrentGroupSurvey(globals.gCurrentSurvey,
                globals.gGroupSurveys[globals.gCurrentSurvey],
                globals.gSubForms[globals.gCurrentSurvey]);
            showManagedData(globals.gCurrentSurvey, showTable, false);
        }
    }

    /*
     * Refresh the data used in this page
     */
    function refreshData() {

        if(!gRefreshingData) {
            gRefreshingData = true;
            //gTasks.cache.surveyConfig = {};
            gTasks.cache.managedData = {};
            gTasks.cache.surveyList = {};
            gTasks.cache.surveyRoles = {};
            gTasks.cache.recordChanges = {};
            gTasks.cache.groupForms = {};
            gTasks.cache.currentData = undefined;
            gTasks.cache.data = {};

            gGetSettings = true;

            // Get the list of available surveys
            loadManagedSurveys(globals.gCurrentProject, surveyChanged);
            getTaskUsers(globals.gCurrentProject);	// Get the users that have access to this project
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
     */
    function showManagedData(sId, callback, clearCache) {

        var groupSurvey,
            subForm;

        if(globals.gGroupSurveys[globals.gCurrentSurvey] && globals.gGroupSurveys[globals.gCurrentSurvey] != "") {
            groupSurvey = globals.gGroupSurveys[globals.gCurrentSurvey];
        }

        if(globals.gSubForms[globals.gCurrentSurvey] && globals.gSubForms[globals.gCurrentSurvey] != "") {
            subForm = globals.gSubForms[globals.gCurrentSurvey];
            if(subForm === '_none') {
                subForm = undefined;
            }
        }

        getData(sId, groupSurvey, subForm, callback, clearCache);
    }

    /*
     * Show the table
     */
    function showTable(dataSet) {

        var x = 1,
            columns = dataSet.schema.columns,
            parameters,
            shownColumns = [],
            hiddenColumns = [],
            visibleColumns = [],
            h = [],
            idx = -1,
            hfoot = [],
            foot_idx = -1,
            i, j,
            $table = $("#trackingTable"),
            doneFirst = false,
            headItem,
            hColSort = [],
            hDups = [],
            hColSortIdx = -1,
            hDupsIdx = -1;


        if ( $.fn.dataTable.isDataTable( $table) ) {
            globals.gMainTable.destroy();
        }

        // Add table
        h[++idx] = '<table id="trackingTable" class="table table-striped" width="100%">';

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
                "data": headItem.column_name
            });
            h[++idx] = '<th>';
            h[++idx] = '<span class="ch">';
            h[++idx] = headItem.displayName;
            h[++idx] = '</span>';
            h[++idx] = '</th>';
            hfoot[++foot_idx] = '<th></th>';

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

        $table.empty().html(h.join(''));

        /*
         * Apply data tables
         */
        $.fn.dataTable.ext.errMode = 'none';

        // Create data table
        globals.gMainTable = $table.DataTable({
            processing: true,
            scrollY: '70vh',
            scrollX: true,
            scrollCollapse: true,
            //fixedColumns: {
            //    leftColumns: 2
            //},
            select: {
                selector: 'td:not(:first-child)'
            },
            rowId: 'instanceid',
            data: dataSet.data,
            columns: shownColumns,
            order: [0],
            initComplete: function (settings, json) {

                if(parameters && parameters.form_data === 'off') {
                    $('.manageFormData').hide();
                    $('.showFormData').hide();
                    $('.showMgmtData').addClass('col-sm-12').removeClass('col-sm-6');
                }

                this.api().columns().every(function (colIdx) {
                    if (columns[colIdx].filter || columns[colIdx].type === "select1") {
                        var column = this;
                        var select = $('<select class="form-control"/>')
                            .appendTo( $(column.footer()).empty() )
                            .on('change', function () {
                                var val = $.fn.dataTable.util.escapeRegex(
                                    $(this).val()
                                );

                                column
                                    .search( val ? '^'+val+'$' : '', true, false )
                                    .draw();

                                saveFilter(colIdx, val);
                            });

                        column.data().unique().sort().each( function ( d, j ) {
                            select.append( '<option value="'+d+'">'+d+'</option>' )
                        } );

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
                }
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
        tableOnDraw();
        globals.gMainTable.off('draw').on('draw', function () {
            tableOnDraw();
        });

        // Respond to filter changes that require the sever to be queried
        $('.table_filter').focusout(function () {
            showManagedData(globals.gCurrentSurvey, showTable, true);
        });

        // Respond to changes that filter data on assignment
        $('.assign_filter').change(function () {
            globals.gMainTable.draw();

            gLocalDefaults.myRecords = $('#my_records').prop('checked');
            gLocalDefaults.unassignedRecords = $('#unassigned_records').prop('checked');
            gLocalDefaults.otherRecords = $('#other_records').prop('checked');
            setInLocalStorage("console", JSON.stringify(gLocalDefaults));
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

                        if (item.id == globals.gCurrentSurvey) {
                            gTasks.gSelectedSurveyIndex = i;
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
     * Get Forms in the current surveys group
     */
    function getGroupForms(surveyId) {

        groupSurveyChanged();       // Can finally retrieve the data

        if (typeof surveyId !== "undefined" && surveyId > 0) {

            if(gTasks.cache.groupSurveys[surveyId]) {
                groupsRetrieved(gTasks.cache.groupSurveys[surveyId]);
            } else {

                var url = "/surveyKPI/surveyResults/" + surveyId + "/groups",
                    survey = surveyId;

                addHourglass();
                $.ajax({
                    url: url,
                    dataType: 'json',
                    cache: false,
                    success: function (data) {
                        removeHourglass();
                        gTasks.cache.groupSurveys[survey] = data;
                        groupsRetrieved(data);
                    },
                    error: function (xhr, textStatus, err) {
                        removeHourglass();
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log(localise.set["c_error"] + ": " + err);
                        }
                    }
                });
            }
        }
    }

    /*
     * Update the group selector
     */
    function groupsRetrieved(data) {

        setOversightSelector(data);
        setGroupSelector(data);

    }

    /*
     * Update a selector that is used for ovesight forms and does not include current form
     */
    function setOversightSelector(data) {
        var $elemGroups = $('#group_survey');

        var i,
            item,
            h = [],
            idx = -1;

        h[++idx] = '<option value="';
        h[++idx] = '">';
        h[++idx] = localise.set["c_none"];
        h[++idx] = '</option>';

        for (i = 0; i < data.length; i++) {
            item = data[i];

            if (item.sId !== globals.gCurrentSurvey) {       // Don't include current survey

                h[++idx] = '<option value="';
                h[++idx] = item.surveyIdent;
                h[++idx] = '">';
                h[++idx] = item.surveyName;
                h[++idx] = '</option>';

            }
        }

        $elemGroups.empty().html(h.join(''));

        /*
		 * Set the value
		 */
        if(globals.gCurrentSurvey > 0 && globals.gGroupSurveys
            && globals.gGroupSurveys[globals.gCurrentSurvey]
            && globals.gGroupSurveys[globals.gCurrentSurvey] != "") {

            var val = globals.gGroupSurveys[globals.gCurrentSurvey];
            var exists = false;
            for(i = 0; i < data.length; i++) {
                if (data[i].surveyIdent === val) {
                    exists = true;
                    break;
                }
            }
            if(exists) {
                $elemGroups.val(val);
            } else {
                $elemGroups.val("");
                globals.gGroupSurveys[globals.gCurrentSurvey] = undefined;
                groupSurveyChanged();
            }
        } else {
            $elemGroups.val("");        // None
        }
    }

    /*
     * Update a selector that is used for any group form
     */
    function setGroupSelector(data) {
        var $elemGroups = $('#tp_form_name, #survey');


        var i,
            item,
            h = [],
            idx = -1;

        for (i = 0; i < data.length; i++) {
            item = data[i];

            h[++idx] = '<option value="';
            h[++idx] = item.surveyIdent;
            h[++idx] = '">';
            h[++idx] = item.surveyName;
            h[++idx] = '</option>';

        }

        $elemGroups.empty().html(h.join(''));

    }

    /*
     * Update the pick list of forms
     */
    function updateFormList(data) {
        var $elem = $('#sub_form');

        var i,
            h = [],
            idx = -1;

        h[++idx] = '<option value="_none">';
        h[++idx] = localise.set["c_none"];
        h[++idx] = '</option>';

        if(data && data.length) {
            for (i = 0; i < data.length; i++) {

                h[++idx] = '<option value="';
                h[++idx] = data[i];
                h[++idx] = '">';
                h[++idx] = data[i];
                h[++idx] = '</option>';
            }
        }

        $elem.empty().html(h.join(''));
        if(globals.gSubForms[globals.gCurrentSurvey]) {
            $elem.val(globals.gSubForms[globals.gCurrentSurvey]);
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
            config = gTasks.cache.currentData.schema,
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
     */
    function saveColumns() {
        var configColumns = {},
            columns = gTasks.cache.currentData.schema.columns,
            i;

        for (i = 0; i < columns.length; i++) {
            configColumns[columns[i].column_name] = {
                hide: columns[i].hide
            };
        }

        var saveView = JSON.stringify(configColumns);

        var url = "/surveyKPI/survey/" + globals.gCurrentSurvey + "/console_settings/columns";

        addHourglass();
        $.ajax({
            type: "POST",
            cache: false,
            contentType: "application/json",
            url: url,
            data: {columns: saveView},
            success: function (data, status) {
                removeHourglass();
                $('#right-sidebar').removeClass("sidebar-open");
            }, error: function (data, status) {
                removeHourglass();
                alert(data.responseText);
            }
        });
    }

    /*
     * Perform initialisation after the data has been loaded
     */
    function initialise() {


        var columns = gTasks.cache.currentData.schema.columns,
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
                    h[++idx] = columns[i].column_name;
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
            } else {
                gTasks.gUpdate = [];
            }
        }
        $('.overviewSection,.mrview').show();
        $('.editRecordSection,.srview,.re_alert').hide();
    }

    /*
     * Respond to a map feature being selected
     */
    function featureSelected(properties) {
        if(properties) {
            var index = properties.record;
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

        var assignedOther = false;

        gSelectedIndexes = indexes;
        gTasks.gSelectedRecord = globals.gMainTable.rows(gSelectedIndexes).data().toArray()[0];
        $('.selectedOnly').hide();
        if(gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned === globals.gLoggedInUser.ident) {
            $('.assigned').show();
        } else if(gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned !== globals.gLoggedInUser.ident) {
            $('.assigned_other').show();
            assignedOther = true;
        } else {
            $('.not_assigned').show();
        }

        var columns = gTasks.cache.currentData.schema.columns;
        if(!assignedOther && (gDeleteColumn < 0 || gTasks.gSelectedRecord[columns[gDeleteColumn].displayName] === 'f')) {
            $('.not_deleted').show();
        } else  if(!assignedOther && gDeleteColumn >= 0 && gTasks.gSelectedRecord[columns[gDeleteColumn].displayName] === 't') {
            $('.deleted').show();
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

                    h[++idx] = '<option value="_none">';
                    h[++idx] = localise.set["c_none"];
                    h[++idx] = '</option>';

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

        if(record && globals.gCurrentSurvey) {
            addHourglass();
            $.ajax({
                url: "/api/v1/data/changes/" + globals.gCurrentSurvey + "/" + record["instanceid"] +
                    '?tz=' + encodeURIComponent(globals.gTimezone),
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();
                    window.gChanges = data;
                    globals.gRecordChangeMaps = [];     // Initialise the list of maps we are going to show

                    var h = [],
                        idx = -1,
                        $elem = $('#changes'),
                        i,
                        finish,
                        statusClass;

                    var includeTasks = $('#er_show_tasks').is(':checked');
                    var includeNotifications = $('#er_show_notifications').is(':checked');
                    var includeChanges = $('#er_show_changes').is(':checked');

                    // Add header
                    h[++idx] = '<thead>';
                    h[++idx] = '<tr>';
                    h[++idx] = '<th></th>';     // icon
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_user"];
                    h[++idx] = '</th>';
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_survey"];
                    h[++idx] = '</th>';
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_date"];
                    //if(data.length > 0) {
                    //    h[++idx] = ' (';
                    //    h[++idx] = data[0].tz;
                    //    h[++idx] = ')';
                    //}
                    h[++idx] = '</th>';
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_event"];
                    h[++idx] = '</th>';
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_status"];
                    h[++idx] = '</th>';
                    h[++idx] = '<th>';
                    h[++idx] = localise.set["c_details"];
                    h[++idx] = '</th>';
                    h[++idx] = '<th class="mincol">';
                    h[++idx] = localise.set["c_action"];
                    h[++idx] = '</th>';
                    h[++idx] = '</tr>';
                    h[++idx] = '</thead>';

                    h[++idx] = '<tbody>';
                    if(data && data.length > 0) {
                        for(i = 0; i < data.length; i++) {

                            if((includeChanges && (data[i].event === 'changes' || data[i].event === 'created')) ||
                                (includeTasks && data[i].event === 'task') ||
                                (includeNotifications && data[i].event === 'notification')) {
                                h[++idx] = '<tr>';

                                h[++idx] = '<td>';
                                if (data[i].event === 'task') {
                                    h[++idx] = '<i class="fa fa-lg fa-tasks fa-2x"></i>';
                                } else if (data[i].event === 'created' || data[i].event === 'changes') {
                                    h[++idx] = '<i style="line-height: 1.5em;" class="fa fa-lg fa-inbox fa-2x"></i>';
                                } else if (data[i].event === 'notification') {
                                    if (data[i].notification && data[i].notification.target === 'sms') {
                                        // From http://jsfiddle.net/4Bacg/
                                        h[++idx] = '<span style="line-height: 1.5em; text-align: center; margin-top: -7px; margin-right: 0.3em;" class="fa-stack fa-lg pull-left">';
                                        h[++idx] = '<i class="fa fa-flip-horizontal fa-comment-o fa-stack-2x"></i>';
                                        h[++idx] = '<i style="font-size: 10px; line-height: 1em;">sms</i>';
                                        h[++idx] = '</span>';
                                    } else {
                                        h[++idx] = '<i class="fa fa-lg fa-envelope-o fa-2x"></i>';
                                    }
                                }

                                h[++idx] = '</td>';
                                h[++idx] = '<td class="mincol">';    // user
                                h[++idx] = data[i].userName;
                                h[++idx] = '</td>';

                                h[++idx] = '<td class="mincol">';    // Survey
                                h[++idx] = data[i].surveyName + ' (' + data[i].surveyVersion + ')';
                                h[++idx] = '</td>';

                                h[++idx] = '<td class="mincol">';    // when
                                h[++idx] = data[i].eventTime;
                                h[++idx] = '</td>';

                                h[++idx] = '<td class="mincol">';    // event
                                h[++idx] = localise.set[data[i].event];
                                h[++idx] = '</td>';

                                h[++idx] = '<td class="mincol ';    // status
                                finish = getFinish(data[i]);
                                statusClass = getStatusClass(data[i].status, finish);
                                h[++idx] = statusClass;
                                h[++idx] = '">';
                                if(statusClass == 'bg-danger') {
                                    h[++idx] = localise.set["c_late"];
                                } else {
                                    h[++idx] = localise.set[data[i].status];
                                }

                                h[++idx] = '</td>';

                                h[++idx] = '<td>';    // Changes
                                if (data[i].event === 'changes' && data[i].changes) {
                                    h[++idx] = getChangeCard(data[i].changes, i);
                                } else if (data[i].event === 'task' && data[i].task) {
                                    h[++idx] = getTaskCard(data[i].task, i);
                                } else if (data[i].event === 'notification' && data[i].notification) {
                                    h[++idx] = getNotificationInfo(data[i].notification, data[i].description);
                                } else {
                                    h[++idx] = data[i].description;
                                }
                                h[++idx] = '</td>';

                                h[++idx] = '<td class="mincol">';    // Action
                                if (data[i].event === 'notification' && data[i].notification) {
                                    h[++idx] = '<button class="btn btn-secondary edit_notification" data-idx="';
                                    h[++idx] = i;
                                    h[++idx] = '">';
                                    h[++idx] = localise.set["c_resend"];
                                    h[++idx] = '</button>';
                                } else  if (data[i].event === 'task' && data[i].task) {
                                    h[++idx] = '<button class="btn btn-secondary edit_task" data-idx="';
                                    h[++idx] = i;
                                    h[++idx] = '">';
                                    h[++idx] = localise.set["t_edit_task"];
                                    h[++idx] = '</button>';
                                }
                                h[++idx] = '</td>';

                                h[++idx] = '</tr>';    // row
                            }

                        }
                    }
                    h[++idx] = '</tbody>';
                    $elem.empty().html(h.join(''));

                    $('.change_card').on('shown.bs.collapse', function() {
                        var $this = $(this);
                        $('.card-body > .row > .small_map', $this).each(function(){
                           console.log($(this).attr("id"));
                            actioncommon.initialiseDynamicMaps(globals.gRecordChangeMaps, $(this).attr("id"));
                        });
                    });
                    $('.change_card').on('show.bs.collapse', function() {
                        $('.mincol').hide();
                    });
                    $('.change_card').on('hidden.bs.collapse', function() {
                        $('.mincol').show();
                    });

                    $('.edit_notification').click(function(){
                        var n = {
                            notifyDetails: {

                            }
                        };
                        var idx = $(this).data("idx");
                        var nMessage = window.gChanges[idx].notification
                        n.target = nMessage.target;
                        n.s_id = nMessage.survey_ident;     // Confusing yes - for notifications this is still id, wheras for console this is the ident
                        n.notifyDetails.subject = nMessage.subject;
                        n.notifyDetails.content = nMessage.content;
                        n.notifyDetails.attach = nMessage.attach;
                        n.notifyDetails.emails = nMessage.emails;
                        window.gNotifications = [];
                        window.gNotifications.push(n);

                        $('#saveNotification').html(localise.set["c_resend"]);
                        edit_notification(0, true);
                        $('#addNotificationPopup').modal("show");
                    });

                    $('.edit_task').click(function(){


                        var idx = $(this).data("idx");
                        var task = window.gChanges[idx].task;
                        var url = "/api/v1/tasks/assignment/" + task.assignmentId + "?taskid=" + task.taskId;
                        // Get the task details and then open the editor dialog

                        $.ajax({
                            url: url,
                            dataType: 'json',
                            cache: false,
                            success: function (data) {
                                var task = data,
                                    taskFeature = {
                                        geometry: {
                                            coordinates: [],
                                            type: 'Point'
                                        },
                                        properties: {}
                                    };
                                taskFeature.geometry.coordinates.push(task.lon);
                                taskFeature.geometry.coordinates.push(task.lat);
                                taskFeature.properties.form_id = task.survey_ident;
                                taskFeature.properties.assignee = task.assignee;
                                taskFeature.properties.emails = task.emails;
                                taskFeature.properties.repeat = task.repeat;
                                taskFeature.properties.id = task.id;
                                taskFeature.properties.a_id = task.a_id;

                                editTask(false, task, taskFeature);
                            },
                            error: function (xhr, textStatus, err) {
                                removeHourglass();
                                if (xhr.readyState == 0 || xhr.status == 0) {
                                    return;  // Not an error
                                } else {
                                    console.log(localise.set["c_error"] + ": " + err);
                                }
                            }
                        });

                        /*
                        var nMessage = window.gChanges[idx].notification
                        n.target = nMessage.target;
                        n.s_id = nMessage.survey_ident;     // Confusing yes - for notifications this is still id, wheras for console this is the ident
                        n.notifyDetails.subject = nMessage.subject;
                        n.notifyDetails.content = nMessage.content;
                        n.notifyDetails.attach = nMessage.attach;
                        n.notifyDetails.emails = nMessage.emails;
                        window.gNotifications = [];
                        window.gNotifications.push(n);

                        $('#saveNotification').html(localise.set["c_resend"]);
                        edit_notification(0, true);
                        $('#addNotificationPopup').modal("show");

                         */
                    });


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
     * Get the current schdule to date from a task
     */
    function getFinish(data) {
        var events,
            i,
            finish;

        if(data.task) {
            events = data.task.taskEvents;
            // Get the last set finish time
            for(i = events.length - 1; i >= 0; i--) {
                if(events[i].schedule_finish) {
                    finish = events[i].schedule_finish;
                    break;
                }
            }
        }
        return finish;
    }

    /*
     * Get task info
     */
    function getTaskCard(task, index) {
        var h = [],
            idx = -1,
            i,
            events = task.taskEvents,
            addBreak,
            state = getTaskState(task),
            current,
            taskHistory,
            event;

        current = state.current;
        taskHistory = state.history;


        h[++idx] = '<div class="card bg-white">';

        h[++idx] = '<div class="card-header" id="task_heading_';
        h[++idx] = index;
        h[++idx] = '">';
        h[++idx] = '<h5 class="mb-0">';
        h[++idx] = '<button class="btn btn-link card-button" data-toggle="collapse" data-target="#task_collapse_';
        h[++idx] = index;
        h[++idx] = '" aria-expanded="false" aria-controls="task_collapse_';
        h[++idx] = index;
        h[++idx] = '">';

        h[++idx] = localise.set["c_id"];
        h[++idx] = ': ';
        h[++idx] = task.assignmentId;
        if(current.assigned) {
            h[++idx] = '<br/>';
            h[++idx] = localise.set["t_assigned"];
            h[++idx] = ': ';
            h[++idx] = current.assigned;
        }
        if(current.name) {
            h[++idx] = '<br/>';
            h[++idx] = localise.set["c_name"];
            h[++idx] = ': ';
            h[++idx] = current.name;
        }

        h[++idx] = '</button>';
        h[++idx] = '</h5>';
        h[++idx] = '</div>';    // Header

        h[++idx] = '<div id="task_collapse_';
        h[++idx] = index;
        h[++idx] = '" class="collapse change_card" aria-labelledby="task_heading_';
        h[++idx] = index;
        h[++idx] = '">';
        h[++idx] = '<div class="card-body">';

        //----------------- Start card body
        if(taskHistory && taskHistory.length > 0) {
            for(i = events.length - 1; i >= 0; i--) {
                event = taskHistory[i];
                addBreak = false;
                h[++idx] = event.when;
                h[++idx] = '<div class="ml-4">';
                if(event.status) {
                    addBreak = true;
                    h[++idx] = localise.set["c_status"];
                    h[++idx] = ': ';
                    h[++idx] = localise.set[event.status];
                }
                if(event.assigned) {
                    if(addBreak) {
                        h[++idx] = '<br/>';
                    }
                    addBreak = true;
                    h[++idx] = localise.set["t_assigned"];
                    h[++idx] = ': ';
                    h[++idx] = event.assigned;
                }
                if(event.schedule_at) {
                    if(addBreak) {
                        h[++idx] = '<br/>';
                    }
                    addBreak = true;
                    h[++idx] = localise.set["c_from"];
                    h[++idx] = ': ';
                    h[++idx] = event.schedule_at;
                }
                if(event.schedule_finish) {
                    if(addBreak) {
                        h[++idx] = '<br/>';
                    }
                    addBreak = true;
                    h[++idx] = localise.set["c_to"];
                    h[++idx] = ': ';
                    h[++idx] = event.schedule_finish;
                }
                if(event.name) {
                    if(addBreak) {
                        h[++idx] = '<br/>';
                    }
                    addBreak = true;
                    h[++idx] = localise.set["c_name"];
                    h[++idx] = ': ';
                    h[++idx] = event.name;
                }
                h[++idx] = '</div>';
            }
        }
        // ------------ End card body


        h[++idx] = '</div>';        // body
        h[++idx] = '</div>';        // collapse

        h[++idx] = '</div>';        // card


        return h.join('');
    }

    /*
     * Convert task events into a task state
     */
    function getTaskState(task) {

        var i,
            events = task.taskEvents,
            event,
            historyItem,
            state = {
                current: {},
                history: []
            };


        if(events && events.length > 0) {

            // Set current starting from the latest
            for(i = events.length - 1; i >= 0; i--) {
                event = events[i];

                if (i == events.length - 1) {
                    state.current = JSON.parse(JSON.stringify(event))
                } else {
                    if (!state.current.status) {
                        state.current.status = event.status;
                    }
                    if (!state.current.assigned) {
                        state.current.assigned = event.assigned;
                    }
                    if (!state.current.name) {
                        state.current.name = event.name;
                    }
                }
            }

            if (state.current.name && state.current.name.indexOf(':') > 0) {
                state.current.name = state.current.name.substring(0, state.current.name.indexOf(':'));
            }

            // Set history starting from the first and only recording changes
            for(i = 0; i < events.length; i++) {

                event = events[i];
                historyItem = {};

                historyItem.when = localTime(event.when);

                if(i == 0 || event.status !== events[i - 1].status) {
                    historyItem.status = event.status;
                }
                if(i == 0 || event.assigned !== events[i - 1].assigned) {
                    historyItem.assigned = event.assigned;
                }
                if(i == 0 || event.schedule_at !== events[i - 1].schedule_at) {
                    historyItem.schedule_at = localTime(event.schedule_at);
                }
                if(i == 0 || event.schedule_finish !== events[i - 1].schedule_finish) {
                    historyItem.schedule_finish = localTime(event.schedule_finish);
                }

                // We only need the name up to the first ":".  If the name has colons in it then it has probably been created
                // automatically from existing data using project name and survey name.  However for the per record view just the
                // Task group name is enough
                if(i == 0 || event.name !== events[i - 1].name) {
                    historyItem.name = event.name;
                    if (historyItem.name && historyItem.name.indexOf(':') > 0) {
                        historyItem.name = historyItem.name.substring(0, historyItem.name.indexOf(':'));
                    }
                }

                state.history.push(historyItem);
            }
        }
        return state;
    }
    /*
     * Get notification info
     */
    function getNotificationInfo(n, description) {
        var h = [],
            idx = -1;

        h[++idx] = '<p>';
        h[++idx] = localise.set["c_target"];
        h[++idx] = ': ';
        h[++idx] = n.target;
        h[++idx] = '<br/>';

        h[++idx] = localise.set["c_to"];
        h[++idx] = ': ';
        h[++idx] = n.emails ? n.emails.join(',') : '';
        h[++idx] = '<br/>';

        if(description) {
            h[++idx] = description;
            h[++idx] = '<br/>';
        }
        h[++idx] = '</p>';

        return h.join('');

    }

    /*
     * Convert a list of changes into a bs4 card
     */
    function getChangeCard(changes, index) {
        var h = [],
            idx = -1,
            i, j;

        h[++idx] = '<div class="card bg-white">';

        h[++idx] = '<div class="card-header" id="heading_';
        h[++idx] = index;
        h[++idx] = '">';
        h[++idx] = '<h5 class="mb-0">';
        h[++idx] = '<button class="btn btn-link card-button" data-toggle="collapse" data-target="#collapse_';
        h[++idx] = index;
        h[++idx] = '" aria-expanded="false" aria-controls="collapse_';
        h[++idx] = index;
        h[++idx] = '">';
        h[++idx] = changes.length + ' '  + localise.set["c_changes"];
        h[++idx] = '</button>';
        h[++idx] = '</h5>';
        h[++idx] = '</div>';    // Header

        h[++idx] = '<div id="collapse_';
        h[++idx] = index;
        h[++idx] = '" class="collapse change_card" aria-labelledby="heading_';
        h[++idx] = index;
        h[++idx] = '">';
        h[++idx] = '<div class="card-body">';

        var baseUrl = window.location.protocol + "//" + window.location.host + "/";
        for(i = 0; i < changes.length; i++)  {

            h[++idx] = '<div class="row mt-1">';

            var type = changes[i].type;
            if(type === 'begin repeat') {
                var changeArray = changes[i].changes;
                var id;

                h[++idx] = '<div class="col-md-12">';

                // Add the tab nav links
                h[++idx] = '<ul class="nav nav-tabs" role="tablist">';
                for(j = 0; j < changeArray.length; j++) {
                    id = i + '_' + j;

                    h[++idx] = '<li class="nav-item">';
                        h[++idx] = '<a class="nav-link ';
                        if(j == 0) {
                            h[++idx] = 'active';
                        }
                        h[++idx] = '" id="chgtab_';
                        h[++idx] = id;
                        h[++idx] = '" data-toggle="tab" href="#chgpanel_';
                        h[++idx] = id;
                        h[++idx] = '" role="tab" aria-controls="chgpanel_';
                        h[++idx] = id;
                        h[++idx] = '" aria-selected="';
                        if(j == 0) {
                            h[++idx] = 'true';
                        } else {
                            h[++idx] = 'false';
                        }
                        h[++idx] = '">';
                        h[++idx] = j;
                        h[++idx] = '</a>';
                    h[++idx] = '</li>';
                }
                h[++idx] = '</ul>';

                // Add the tab panels
                h[++idx] = '<div class="tab-content">';

                for(j = 0; j < changeArray.length; j++) {
                    id = i + '_' + j;

                    h[++idx] = '<div class="tab-pane fade';
                    if(j == 0) {
                        h[++idx] = ' show active';
                    }
                    h[++idx] = '" id="chgpanel_';
                    h[++idx] = id;
                    h[++idx] = '" role="tabpanel" aria-labelledby="chgtab_';
                    h[++idx] = id;
                    h[++idx] = '">';
                    h[++idx] = getChangeCard(changeArray[j], id);
                    h[++idx] = '</div>';
                }
                h[++idx] = '</div>';        // Tab content
                h[++idx] = '</div>';        // The column


            } else {

                var newVal = changes[i].newVal;
                var oldVal = changes[i].oldVal;
                if(type === 'image') {
                    newVal = baseUrl + newVal;
                    oldVal = baseUrl + oldVal;
                }

                if(type === 'geopoint' || type === 'geoshape' || type === 'geotrace') {
                    h[++idx] = actioncommon.addCellMap(true, 'change_maps_',
                        globals.gRecordChangeMaps, changes[i], newVal, oldVal);
                } else {

                    h[++idx] = '<div class="col-md-3">';
                    if(changes[i].displayName) {
                        h[++idx] = changes[i].displayName;
                    } else {
                        h[++idx] = changes[i].col;
                    }
                    h[++idx] = '</div>';

                    h[++idx] = '<div class="col-md-4">';
                    h[++idx] = actioncommon.addCellMarkup(oldVal);
                    h[++idx] = '</div>';

                    h[++idx] = '<div class="col-md-1">';        // Separator
                    h[++idx] = '<i class="fa fa-arrow-right" aria-hidden="true"></i>';
                    h[++idx] = '</div>';

                    h[++idx] = '<div class="col-md-4">';
                    h[++idx] = actioncommon.addCellMarkup(newVal);
                    h[++idx] = '</div>';
                }
            }

            h[++idx] = '</div>';        // row
        }


        h[++idx] = '</div>';        // body
        h[++idx] = '</div>';        // collapse

        h[++idx] = '</div>';        // card

        return h.join('');
    }


    function getData(sId, groupSurvey, subForm, callback, clearCache) {

        var key = sId + "_" + groupSurvey + "_" + (typeof subForm === "undefind" ? "" : subForm);

        // First Check the Cache
        if(!clearCache && gTasks.cache.data[key]) {
            gTasks.cache.currentData = gTasks.cache.data[key];
            showTable(gTasks.cache.data[key]);
        } else {

            var url = '/api/v1/data/';
            url += sId;
            url += "?mgmt=true";

            if (groupSurvey) {
                url += "&groupSurvey=" + groupSurvey;
            }

            if(subForm) {
                url += "&form=" + subForm;
            }

            if (isDuplicates) {
                url += "&group=true";
            }

            if(globals.gCurrentInstance) {
                url += "&instanceid=" + globals.gCurrentInstance;
            }

            /*
             * date filtering
             */
            if(!gGetSettings) {
                var fromDate = document.getElementById('filter_from').value,
                    toDate = document.getElementById('filter_to').value,
                    dateName = $('#date_question').val();
                var dateSet = (fromDate && fromDate.trim().length) || (toDate && toDate.trim().length);

                if (dateSet && dateName && dateName.trim().length) {
                    url += "&dateName=" + dateName;
                    if (fromDate && fromDate.trim().length) {
                        url += "&startDate=" + fromDate;
                    }
                    if (toDate && toDate.trim().length) {
                        url += "&endDate=" + toDate;
                    }
                }

                if($('#include_bad').prop('checked')) {
                    url += "&bad=yes";
                }

                // Limit number of records returned
                var limit = $('#limit').val();
                var iLimit = 0;
                if (limit && limit.trim().length > 0) {
                    try {
                        iLimit = parseInt(limit);
                        url += "&limit=" + iLimit;
                    } catch (err) {
                        alert(err);
                    }
                }

                // Advanced filter
                var filter = $('#advanced_filter').val();
                if (filter && filter.trim().length > 0) {
                    url += "&filter=" + encodeURIComponent(filter);
                }
            } else {
                url += "&getSettings=true";
            }

            url += "&format=dt";
            url += "&schema=true";
            url += "&view=0";                       // TODO
            url += "&merge_select_multiple=yes";
            url += "&sort=prikey&dirn=desc";

            url += "&tz=" + encodeURIComponent(globals.gTimezone);

            addHourglass();
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();
                    gRefreshingData = false;
                    gGetSettings = false;

                    if(data && data.status === "error") {
                        alert(data.msg);
                    } else if(data && data.status === "ok") {
                        // Continue presumably there is no data
                    } else {
                        var theKey = key;
                        var theCallback = callback;

                        gTasks.cache.data[theKey] = data;
                        gTasks.cache.currentData = data;

                        updateSettings(gTasks.cache.currentData.settings);
                        map.setLayers(gTasks.cache.currentData.schema.layers);
                        chart.setCharts(gTasks.cache.currentData.schema.charts);
                        updateFormList(gTasks.cache.currentData.forms);

                        // Add a config item for the group value if this is a duplicates search
                        if (isDuplicates) {
                            gTasks.cache.currentData.schema.columns.unshift({
                                hide: true,
                                include: true,
                                name: "_group",
                                displayName: "_group"
                            });
                        }

                        // Initialise the column settings
                        initialise();

                        theCallback(data);
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();

                    if (globals.gMainTable) {
                        globals.gMainTable.destroy();
                        globals.gMainTable = undefined;
                    }
                    $("#trackingTable").empty();

                    gRefreshingData = false;
                    gGetSettings = false;

                    if (xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(localise.set["error"] + ": " + err);
                    }
                }
            });
        }


    }

    function tableOnDraw() {
        gDeleteColumn = -1;
        gDeleteReasonColumn = -1;

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

        var columns = gTasks.cache.currentData.schema.columns;

        for (i = 0; i < columns.length; i++) {
            var headItem = columns[i];

            // Highlighting
            if (headItem.markup) {
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this),
                        v = $this.text();

                    for (var j = 0; j < headItem.markup.length; j++) {
                        if (headItem.markup[j].value == v) {
                            $this.addClass(getColorClass(headItem.markup[j].classes));
                        }
                    }

                });
            }

            // Barcode
            if (headItem.barcode) {
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this),
                        opt = {
                            render: 'div',
                            size: 100,
                            text: $this.text()
                        }

                    $this.empty().qrcode(opt);

                });
            }

            // Deleted
            if(headItem.del_col) {
                gDeleteColumn = i;
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this);
                    if($this.text() === "t") {
                        $this.text(localise.set["c_yes"]);
                        $this.addClass('bg-danger');
                    } else {
                        $this.text(localise.set["c_no"]);
                    }
                });
            } else if(headItem.del_reason_col) {
                gDeleteReasonColumn = i;
            }
        }

        // Refresh the views that depend on the displayed rows
        map.refreshAllLayers(gMapView, gOverallMapConfig.map);
        chart.refreshAllCharts(gChartView, gTimingView, true);

        if(gTasks.gSelectedRecord && gTasks.gSelectedRecord.instanceid) {
            globals.gMainTable.row('#' + escSelector(gTasks.gSelectedRecord.instanceid)).select();      // Reselect the row, escape the :
        }
    }

    function getColorClass(color) {
        if(color === 'yellow') {
            return 'bg-warning';
        } else if(color === 'blue') {
            return 'bg-info';
        } else if(color === 'red') {
            return 'bg-danger';
        } else if(color === 'red') {
            return 'bg-danger';
        } else if(color === 'green') {
            return 'bg-success';
        }
    }

    /*
     * If settings were requested from the server then update the setting fields
     */
    function updateSettings(settings) {
        if(settings) {

            $('#filter_from').val(settings.startDate);
            $('#filter_to').val(settings.toDate);
            $('#date_question').val(settings.dateName);
            $('#limit').val(settings.limit);
            $('#advanced_filter').val(settings.filter);
            $('#include_bad').prop('checked', settings.include_bad === "yes");
        }
    }

    /*
     * Show a records details
     */
    function showRecord(editable) {

        window.location.hash="#edit";
        $('.shareRecordOnly, .role_select').hide();
        $('#srLink').val("");
        getSurveyRoles(globals.gCurrentSurvey);
        getRecordChanges(gTasks.gSelectedRecord);

        var sIdent = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].ident;
        var instanceId = gTasks.gSelectedRecord.instanceid;
        $('.launchwebform').prop("href", "/webForm/" + sIdent + "?datakey=instanceid&datakeyvalue=" + instanceId);

        $('.overviewSection').hide();
        $('.editRecordSection').show();

        if(editable) {
            $('#saveRecord').removeClass('disabled');
        } else {
            $('#saveRecord').addClass('disabled');
        }
        actioncommon.showEditRecordForm(gTasks.gSelectedRecord, gTasks.cache.currentData.schema, $('#editRecordForm'), $('#surveyForm'), editable);
    }


    /*
     * -------------------------------------------------------------------------------------
     * Task management functions copied from taskManagement.js
     * (Some of) this duplication should be fixed but will require selection of a single map API
     */

    /*
     * Add a task
	 */
    $('#addTask').click(function () {

        // TODO default location to location of record
        var task = {},
            taskFeature = {
                geometry: {
                    coordinates: [],
                    type: 'Point'
                },
                properties: {}
            };

        editTask(true, task, taskFeature);
    });

    $('#addNotification').click(function(){
        edit_notification();
        $('#addNotificationPopup').modal("show");
    });

    /*
	 * Edit an existing task or create a new one
	 */
    function editTask(isNew, task, taskFeature) {
        var scheduleDate,
            splitDate = [];

        console.log("open edit task: " + task.from);

        window.gCurrentTaskFeature = taskFeature;

        $('form[name="taskProperties"]')[0].reset();

        if (isNew) {
            $('#taskPropLabel').html(localise.set["t_add_task"]);
            $('#tp_pol').prop('checked', true);
        } else {
            $('#taskPropLabel').html(localise.set["t_edit_task"]);
            $('#tp_pol').prop('checked', task.complete_all);
        }

        /*
		 * Set up data
		 */
        $('#tp_repeat').prop('checked', task.repeat);
        $('#tp_pol').prop('checked', task.complete_all);
        $('#tp_name').val(task.name);		// name
        if(isNew) {
            $('#tp_form_name').val($('#tp_form_name option:first').val());
        } else {
            $('#tp_form_name').val(taskFeature.properties.form_id);	// form id
        }
        setupAssignType(taskFeature.properties.assignee, 0, taskFeature.properties.emails);
        $('#tp_user').val(taskFeature.properties.assignee);	// assignee
        $('#tp_assign_emails').val(taskFeature.properties.emails);
        $('#tp_repeat').prop('checked', taskFeature.properties.repeat);
        $('#tp_pol').prop('checked', taskFeature.properties.complete_all);

        // Set end date first as otherwise since it will be null, it will be defaulted when from date set
        if (task.to) {
            $('#tp_to').data("DateTimePicker").date(localTime(task.to));
        }
        if (task.from) {
            $('#tp_from').data("DateTimePicker").date(localTime(task.from));
        }

        $('#nfc_uid').val(task.location_trigger);
        gCurrentGroup = task.location_group;
        gCurrentLocation = getLocationIndex(task.location_name, gTags);
        if(gCurrentGroup && gCurrentGroup != '') {
            $('.location_group_list_sel').text(gCurrentGroup);
            setLocationList(gTags, gCurrentLocation, gCurrentGroup);
        }

        if(task.guidance) {
            $('#tp_guidance').val(task.guidance);
        } else {
            $('#tp_guidance').val(task.address);    // Initialise with address data
        }
        if (task.update_id && task.update_id.length > 0) {
            $('#initial_data').html(getInitialDataLink(taskFeature));
        }
        $('#tp_show_dist').val(task.show_dist);

        $('#location_save_panel').hide();
        $('#task_properties').modal("show");

        if (!gModalMapInitialised) {
            setTimeout(function () {
                map.initDynamicMap(gTaskMapConfig, true, undefined, false);
            }, 0);
            gModalMapInitialised = true;
        } else {
            //gClickOnMapenabled = false;     // TODO
            //modalMapReady();
        }

    }

    /*
	 * Callback after saving a task
	 */
    function doneTaskSave() {
        getRecordChanges(gTasks.gSelectedRecord);
        getLocations(processLocationList);
    }

    /*
	 * Process a list of locations
	 */
    function processLocationList(tags) {
        gTags = tags;
        refreshLocationGroups(tags, true);
        setLocationList(tags, gCurrentLocation, gCurrentGroup);

        // Respond to a location group being selected
        $('.dropdown-item', '#location_group').click(function () {
            gCurrentGroup = $(this).text();
            gCurrentLocation = '-1';
            $('.location_group_list_sel').text(gCurrentGroup);
            setLocationList(gTags, gCurrentLocation, gCurrentGroup);
        });
    }

    /*
     * Save a notification
     */
    function sendImmediateNotification() {

        var url,
            notification,
            $dialog,
            notificationString,
            target = $('#target').val();

        if(target === "email") {
            notification = saveEmail();
        } else if(target === "forward") {
            notification = saveForward();
        } else if(target === "sms") {
            notification = saveSMS();
        } else if(target === "document") {
            notification = saveDocument();
        }

        if(!notification.error) {

            notification.trigger = $('#trigger').val();
            notification.sIdent = $('#survey').val();
            notification.enabled = $('#nt_enabled').is(':checked');
            notification.filter = $('#not_filter').val();
            notification.name = $('#name').val();
            notification.instanceId = gTasks.gSelectedRecord.instanceid;

            if(notification.trigger === 'task_reminder') {
                var idx = $('#task_group').val();
                if(gTaskGroups.length > 0 && idx < gTaskGroups.length) {
                    notification.tgId = gTaskGroups[idx].tg_id;
                }
                var periodCount = $('#r_period').val();
                notification.period = periodCount + ' ' + $('#period_list_sel').val();

                // Validate
                if(!periodCount || periodCount <= 0) {
                    alert(localise.set["msg_pc"]);
                    return(-1);
                }
                console.log("Reminder for tg: " + notification.tgId + ' after ' + notification.period);
            }

            url = "/surveyKPI/notifications/immediate";


            notificationString = JSON.stringify(notification);
            $dialog = $(this);
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                cache: false,
                async: false,
                url: url,
                data: { notification: notificationString },
                success: function(data, status) {
                    removeHourglass();
                    $('#addNotificationPopup').modal("hide");
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();
                    if(xhr.readyState == 0 || xhr.status == 0) {
                        return;  // Not an error
                    } else {
                        alert(localise.set["msg_err_save"] + xhr.responseText);
                    }
                }
            });

        } else {
            alert(localise.set["msg_inv_email"]);
        }
    }

    function escSelector(input) {
        var output = input.replace(/:/g, '\\:');
        console.log(output);
        return output;
    }

    function toggleRecord(title, bad) {
        var columns = gTasks.cache.currentData.schema.columns;

        gBad = bad;

        if(gDeleteReasonColumn >= 0) {
            $('#toggle_reason').val(gTasks.gSelectedRecord[columns[gDeleteReasonColumn].displayName]);
        } else {
            $('#toggle_reason').val("");
        }
        $('#toggleRecordTitle, #toggleRecordSave').text(title);
        $('#toggleRecord').modal("show");
    }

});


