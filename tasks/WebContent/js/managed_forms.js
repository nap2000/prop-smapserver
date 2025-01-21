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
        svgsave: '../../../../js/libs/saveSvgAsPng',
        pace: '../../../../js/libs/wb/plugins/pace/pace.min',
        qrcode: '../../../../js/libs/jquery-qrcode-0.14.0.min',
        multiselect: '../../../../js/libs/bootstrap-multiselect.min',
        knockout: '../../../../js/libs/knockout',
	    slimscroll: '../../../../js/libs/wb/plugins/slimscroll/jquery.slimscroll.min'

    },
    shim: {

        'common': ['jquery'],
        'datetimepicker': ['moment'],
        'crf': ['jquery'],
        'file_input': ['jquery'],
        'app/summary_report': ['jquery'],
        'qrcode': ['jquery'],
	    'slimscroll': ['jquery'],
        'multiselect': ['jquery', 'knockout']
    }
});

require([
    'jquery',
    'common',
    'localise',
    'globals',
    'moment',
    'app/summary_report',
    'app/chart',
    'app/mapOL3',
    'svgsave',
    'app/actioncommon',
    'datetimepicker',
    'crf',
    'qrcode',
    'toggle',
	'slimscroll',
    'multiselect'

], function ($,
             common,
             localise,
             globals,
             moment,
             summary_report,
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
    var gAssignedCol = 0;           // Column that contains the assignment status
    var gGetSettings = false;       // Use the settings from the database rather than the client
    var gDeleteColumn = -1;         // The index of the column that indicates if the record is deleted
    var gDeleteReasonColumn = -1;   // The index of the column that has the reason for a delete
    var gBad;                       // A boolean indicating the direction of toggle of a deleted state
    var gLocalDefaults = {};
    var gPreviousUrl = "";
    var gEditUrl = '#';

    var gDrillDownNext;                 // Next drill down state if drill down is selected
    var gDrillDownStack = [];

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
            eligibleUsers: {},
            currentData: undefined,
            data: {},
        },
        charts: [
            {
                subject: "status",
                chart_type: 'bar',
                label: localise.set["c_status"],
                color: 'rgb(255, 99, 132)'
            },
            {
                subject: "assigned",
                chart_type: 'bar',
                label: localise.set["t_assigned"],
                color: 'rgb(0, 0, 255)'
            },
            {
                subject: "alert",
                chart_type: 'bar',
                label: localise.set["c_alert"],
                color: 'rgb(0, 255, 0)'
            },
            {
                subject: "criticality",
                chart_type: 'bar',
                label: localise.set["c_crit"],
                color: 'rgb(255, 255, 0)'
            }

        ],
        gSelectedRecord: undefined,
        gBulkInstances: [],
        gSelectedSurveyIndex: undefined,
        gUpdate: [],
        gPriKey: undefined,
        gSort: undefined,
        gDirn: undefined,
        gInitialInstance: undefined
    };
    window.gCurrentTaskFeature; // Currently edited task feature, hack to support shared functions with console
    window.gUpdateFwdPassword = undefined;
    window.gSaveType = '';
    window.gNotifications = undefined;
    window.gChanges = [];
    window.gSelectedChart = -1;
    window.gEditRecord = {};
    window.filters = [
        {
            id: 'filter_from',
            type: 'text'
        },
        {
            id: 'filter_to',
            type: 'text'
        },
        {
            id: 'include_bad',
            type: 'checkbox',
            value: false
        },
        {
            id: 'include_completed',
            type: 'checkbox',
            value: false      // default value
        },
        {
            id: 'limit',
            type: 'text',
            value: '1000'
        },
        {
            id: 'advanced_filter',
            type: 'text'
        },
        {
            id: 'my_records',
            type: 'checkbox',
            value: true      // default value
        },
        {
            id: 'unassigned_records',
            type: 'checkbox',
            value: true      // default value
        },
        {
            id: 'other_records',
            type: 'checkbox',
            value: true      // default value
        }
    ];

    $(document).ready(function () {

        window.summary_report = summary_report;
        window.moment = moment;
        setCustomManage();
        setTheme();
	    setupUserProfile(true);
        localise.setlang();		// Localise HTML
        userDefaults();

        // Set any default values saved from the last use of this page
        gTasks.gInitialInstance = localStorage.getItem("mfselected");   // Currently selected record

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

        $('.editRecordSection, .bulkEditSection, .selectOnly, .singleSelectOnly, .multiSelectOnly, .dd_only').hide();

        // Get the parameters and start editing a survey if one was passed as a parameter
        var params = location.search.substr(location.search.indexOf("?") + 1);
        var pArray = params.split("&");
        var dont_get_current_survey = false;
        var i;
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

        // Set custom menus
        var customMenuClass = getCustomMenuClass();
        if(customMenuClass) {
            $(customMenuClass).show();
        }

        // Get the user details
        globals.gIsConsoleAdmin = false;
        getLoggedInUser(refreshData, false, true, undefined, false, dont_get_current_survey);

        // Set change function on projects
        $('#project_name').change(function () {
            projectChanged();
        });

        // Get locations
        getLocations(processLocationList);

        // Get Notification Types for this server
        getNotificationTypes("console");

        // Set response to clearing single record view
        $('#clear_srview').click(function() {
            globals.gCurrentInstance = undefined;
            $('.srview').hide();
            $('.mrview').show();
            refreshData();
        });

        // Set change function on survey
        $('#survey_name').change(function () {
            var $this = $(this);
            checkLoggedIn(function() {
                gTasks.gSelectedSurveyIndex = $this.val();
                globals.gCurrentSurvey = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].id;
                gGetSettings = true;
                clearDrillDown();
                mfSurveyChanged();
                populatePdfSelect(globals.gCurrentSurvey, $('#select_pdf'));
            });
        });

        // Set change function on group survey
        $('#oversight_survey').change(function () {
            globals.gGroupSurveys[globals.gCurrentSurvey] = $(this).val();
            groupSurveyChanged();
        });

        // Set change function on sub form
        $('#sub_form').change(function () {
            globals.gSubForms[globals.gCurrentSurvey] = $(this).val();
            clearDrillDown();
            subFormChanged();
        });

        // Set change function on drill down
        $('#drill_down').click(function () {
          drillDown();
        });

        // Set change function on drill up
        $('#drill_up').click(function () {

            if(gDrillDownStack.length > 0) {
                gDrillDownNext = gDrillDownStack.pop();
            }
            subFormChanged();
        });

        // Set change function on controls
        $('#advanced_filter, #limit, #include_bad, #include_completed').change(function () {
            showManagedData(globals.gCurrentSurvey, showTable, true);
        });

        // Set change function on clearColumns
        $('#clearColumns').change(function() {
            $('.columnSelect').prop('checked', ($(this).prop('checked')));
        });

        /*
         * Setup dialog to change the current survey
         */
        $("#changeSurveys").click(function () {
            $("#surveySelect").modal("show");
        });

        $('.exitEditRecord').click(function(e) {
            e.preventDefault();
            showManagedData(globals.gCurrentSurvey, showTable, true);
            window.history.back();
        });

        $('.exitBulkEdit').click(function(e) {
            e.preventDefault();
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
            console.log("location: " + document.location + ", state: " + JSON.stringify(event.state));
            if(document.location.href.indexOf("#edit") == -1 && document.location.href.indexOf("#bulk") == -1) {
                exitEdit();
            }
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

        $('#resetFilters').click(function() {
            resetFilters();
            checkLoggedIn(function() {
                showManagedData(globals.gCurrentSurvey, showTable, false);  // update console with changed data
            });
        });

        /*
         * Show links
         */
        $('.linksOnly').hide();
        $('#m_links').click(function(e) {
            e.preventDefault();
            showLinks();
        });

        $('#m_bulk_edit').click(function(e) {
            e.preventDefault();
            showBulkEdit();
        });

        /*
	     * View a record
	     */
        $('#m_view').click(function(e) {
            e.preventDefault();
            showRecord();
        });

        /*
         * Open the dialog to assign a user to a record
         */
        $('#m_assign_to').click(function(e) {
            e.preventDefault();
            if(gTasks.gSelectedRecord._assigned) {
                $('#user_to_assign').val(gTasks.gSelectedRecord._assigned);
            } else {
                $('#user_to_assign').val("_none");
            }
            $('#userAssign').modal("show");
        });

        /*
         * add a chart
         */
        $('#m_add_chart').click(function(e) {
            e.preventDefault();

            $('#addChartForm')[0].reset();
            gSelectedChart = -1;
            setChartPopupControls();
            $('#chart_settings_popup').modal("show");
        });

        $('#cs_subject').change(function() {
            setChartPopupControls();
        });


        /*
         * Delete a record
         */
        $('#m_delete').click(function(e) {
            e.preventDefault();
            toggleRecord(localise.set["c_del"], true);
        });

        /*
         * UnDelete a record
         */
        $('#m_undelete').click(function(e) {
            e.preventDefault();
            toggleRecord(localise.set["c_undel"], false);
        });

        $('#toggleRecordSave').click(function(e){
            e.preventDefault(e);
            var url = "/surveyKPI/items/" + globals.gCurrentSurvey + "/survey/bad/" + gTasks.gSelectedRecord.instanceid;
            var reason = $('#toggle_reason').val();
            addHourglass();

            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: url,
                data: {
                    value: gBad,
                    reason: reason
                },
                success: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        refreshData();
                    }
                }, error: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        alert(data.responseText);
                    }
                }
            });
        });

        /*
         * Lock a record for editing by this user
         */
        $('#m_lock').click(function(e) {
            e.preventDefault();
            $('#m_lock').prop("disabled", true);     // debounce

            var url = "/surveyKPI/managed/lock/" + globals.gCurrentSurvey;
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: url,
                data: {
                    record: gTasks.gSelectedRecord.instanceid
                },
                success: function (data, status) {
                    removeHourglass();
                    $('#m_lock').prop("disabled", false);     // debounce
                    if(handleLogout(data)) {
                        showManagedData(globals.gCurrentSurvey, showTable, true);
                    }
                }, error: function (data, status) {
                    removeHourglass();
                    $('#m_lock').prop("disabled", false);     // debounce
                    if(handleLogout(data)) {
                        alert(data.responseText);
                    }
                }
            });
        });

        /*
	     * Assign a user
	     */
        $('#assignUserSave').click(function(e) {
            e.preventDefault();
            $('#assignUserSave').prop("disabled", true);     // debounce

            var url = "/surveyKPI/managed/assign/" + globals.gCurrentSurvey + "/" + $('#user_to_assign').val();

            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: url,
                data: {record: gTasks.gSelectedRecord.instanceid},
                success: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        $('#userAssign').modal("hide");
                        $('#assignUserSave').prop("disabled", false);     // debounce
                        showManagedData(globals.gCurrentSurvey, showTable, true);
                    }
                }, error: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        $('#assignUserSave').prop("disabled", false);     // debounce
                        alert(data.responseText);
                    }
                }
            });

        });

        /*
         * Release a record
         */
        $('#m_release').click(function(e) {
            e.preventDefault();
            $('#m_release').prop("disabled", true);     // debounce

            var url = "/surveyKPI/managed/release/" + globals.gCurrentSurvey;
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: url,
                data: {record: gTasks.gSelectedRecord.instanceid},
                success: function (data, status) {
                    removeHourglass();
                    $('#m_release').prop("disabled", false);     // debounce
                    if(handleLogout(data)) {
                        showManagedData(globals.gCurrentSurvey, showTable, true);
                    }
                }, error: function (data, status) {
                    removeHourglass();
                    $('#m_release').prop("disabled", false);     // debounce
                    if(handleLogout(data)) {
                        alert(data.responseText);
                    }
                }
            });
        });

        /*
         * Save a record of data in managed forms
         */
        $('.saverecord').click(function (e) {
            e.preventDefault();
            var saveString = JSON.stringify(gTasks.gUpdate);
            var biString;
            if(gTasks.gBulkInstances && gTasks.gBulkInstances.length > 1) {
                biString =  JSON.stringify(gTasks.gBulkInstances)
            }
            addHourglass();
            $.ajax({
                type: "POST",
                dataType: 'text',
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                url: "/surveyKPI/managed/update_gs/" + globals.gCurrentSurvey + "/" + globals.gGroupSurveys[globals.gCurrentSurvey],
                data: {
                    updates: saveString,
                    instanceid: gTasks.gSelectedRecord.instanceid,
                    prikey: gTasks.gSelectedRecord.prikey,
                    bulkInstances: biString,
                    groupForm: globals.gSubForms[globals.gCurrentSurvey],
                    tz: globals.gTimezone
                },
                success: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        // Update the current values
                        var i,
                            record = gTasks.gSelectedRecord,
                            columns = gTasks.cache.currentData.schema.columns;
                        for (i = 0; i < gTasks.gUpdate.length; i++) {
                            record[columns[gTasks.gUpdate[i].itemIndex].column_name] = gTasks.gUpdate[i].value;
                        }

                        gTasks.gUpdate = [];
                        $('.saverecord').prop("disabled", true);

                        getRecordChanges(gTasks.gSelectedRecord);
                        $('.re_alert').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_upd"]);
                    }
                }, error: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        $('.re_alert').show().removeClass('alert-success').addClass('alert-danger').html(localise.set["msg_err_upd"] + data.responseText);
                    }
                }
            });
        });


        $('.genrecordpdf').click(function (e)  {
            e.preventDefault();
            $('#genPdfPopup').modal("show");
        });

        $('#genPdf').click(function(e) {
            e.preventDefault();

            var language = $('#pdf_language option:selected').val();
            var pdfTemplate = $('#select_pdf option:selected').val();
            var orientation = $("#pdf_orientation").val();
            var include_references = $("#pdf_include_references").prop('checked');
            var launched_only = $("#pdf_launched_only").prop('checked');
            var sIdent = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].ident;
            var instanceId = gTasks.gSelectedRecord.instanceid;

            downloadPdf(language, orientation, include_references, launched_only, sIdent, instanceId, pdfTemplate);
        });

        /*
         * show the settings dialog
         */
        $('#show_settings').click(function(e) {
            e.preventDefault();
            $('#settingsPopup').modal("show");
        });

        /*
         * Save response to a message edit popup
         */
        $('#messageSave').click(function(e) {
            e.preventDefault();
            var action = {
                idx: window.gMessageIdx,
                sId: globals.gCurrentSurvey,
                groupSurvey: globals.gGroupSurveys[globals.gCurrentSurvey],
                instanceid: gTasks.gSelectedRecord.instanceid,
                comment: $('#mComment').val()
            }

            $.ajax({
                url: "/surveyKPI/message/newcase",
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                data: action,
                success: function (data) {
                    if(handleLogout(data)) {
                        $('#messagePopup').modal('hide');
                        getRecordChanges(gTasks.gSelectedRecord);
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log(localise.set["c_error"] + ": " + err);
                        }
                    }
                }
            });
        });

        /*
         * Save changes to the table columns that are shown
         */
        $('#saveSettings').click(function () {

            var
                config = gTasks.cache.currentData.schema,
                $this;

            $('input.columnSelect', '#tab-columns-content').each(function (index) {
                $this = $(this);
                config.columns[index].hide = !$this.is(':checked');
            });

            $('input.barcodeSelect', '#tab-columns-content').each(function (index) {
                $this = $(this);
                config.columns[index].barcode = $this.is(':checked');

            });

            $('input.includeText', '#tab-columns-content').each(function (index) {
                $this = $(this);
                config.columns[index].includeText = $this.is(':checked');

            });

            updateVisibleColumns(config.columns);
            saveColumns();

        });

        // Refresh menu
        $('#m_refresh').click(function (e) {
            e.preventDefault();
            checkLoggedIn(function() {
                if(window.location.hash === "#edit") {
                    getRecordChanges(gTasks.gSelectedRecord);
                } else {
                    refreshData();
                }
            })
        });

        // Add a new map layer
        $('#m_add_layer').click(function (e) {
            e.preventDefault();
            $('#layerInfo').hide();
            $('#ml_title').val("");
            $('#layerEdit').modal("show");
        });

        // Respond to save on a layer edit dialog
        $('#addLayerSave').click(function (e) {
            e.preventDefault();
            map.saveLayer(gOverallMapConfig.map);
        });

        // Respond to a new task location being clicked
        $('#taskPropertiesForm').on("smap_task::geopoint", function (event, config) {
            gCurrentTaskFeature.geometry = config.value;
            console.log("New task geopoint");
        });

        /*
         * Take action on tab change to initialiseColumns tab contents
         * Refer: http://stackoverflow.com/questions/20705905/bootstrap-3-jquery-event-for-active-tab-change
         */
        $('a[data-toggle="tab"]', '#mainTabs').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab
            var trigger;

            $('.targetSpecific').hide();
            gMapView = false;
            gChartView = false;
            gTimingView = false;

            if (target === '#tablePanel') {
                $('.tableOnly').removeClass('d-none').show();
                trigger = '#table-view';
            } else if (target === '#mapPanel') {
                $('.mapOnly').removeClass('d-none').show();
                gMapView = true;
                try {       // will fail if there is no data
                    map.initDynamicMap(gOverallMapConfig, false, featureSelected, true);
                } catch(err) {

                }
                trigger = '#map-view';

            } else if(target === '#chartPanel') {
                chart.refresh();
                $('.chartOnly').removeClass('d-none').show();
                gChartView = true;
                trigger = '#chart-view';
            } else if(target === '#timingPanel') {
                //chart.init(false, true);
                $('#m_add_chart').removeClass('d-none').show();
                gTimingView = true;
                trigger = '#timing-view';
            }
            setInLocalStorage("currentTab" + page, trigger);
        });

        $('a[data-toggle="tab"]', '#editTabs').on('shown.bs.tab', function (e) {
            var target = $(e.target).attr("href") // activated tab

            $('.historyView,.dataView').hide();

            if (target === '#data-view') {
                $('.dataView').removeClass('d-none').show();
            } else if(target === '#changes-view') {
                $('.historyView').removeClass('d-none').show();
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
            showHistory(window.gChanges);
        });

        /*
         * SHow and hide the controls
         */
        $('.filtersShown').show();
        $('.filtersHidden').hide();
        $('#hideFilters').click(function(e){
            e.preventDefault();
            $('.filtersShown').hide();
            $('.filtersHidden').show();
            return false;
        });

        $('#showFilters').click(function(e){
            e.preventDefault();
            $('.filtersShown').show();
            $('.filtersHidden').hide();
            return false;
        });

	    /*
         * Custom reports
         */
	    $('.server_specific').hide();
	    var ssd = getServerSubDomainName();
	    if(ssd !== '') {
            $('.' + ssd).removeClass('d-none').show();
        }
	    $('#m_tdh_individual').click(function() {
		    $('#tdh_individual_report_popup').modal("show");
	    });
	    $('#tdh_individual_report_save').click(function() {
		    var bc = $('#tdh_rep_bc').val();
		    var link = "/surveyKPI/tdh/individual/";
		    link += $('#tdh_rep_bc').val().trim();
		    link += '/individual_report';

		    if(!bc || bc.trim().length == 0) {
			    alert("Please enter a beneficiary code");
			    return;
		    }

		    downloadFile(link);
		    $('#tdh_individual_report_popup').modal("hide");
	    });

        $('#chart_settings_save').click(function() {
            if(gSelectedChart >= 0) {   // edit
                gTasks.cache.currentData.settings.charts[gSelectedChart].subject = $('#cs_subject').val();
                gTasks.cache.currentData.settings.charts[gSelectedChart].chart_type = $('#cs_chart_type').val();
                gTasks.cache.currentData.settings.charts[gSelectedChart].question = $('#cs_question').val();
                chart.replace(gTasks.cache.currentData.settings.charts[gSelectedChart], gSelectedChart);
            } else {
                if(gTasks.cache.currentData) {
                    var item = {
                        subject: $('#cs_subject').val(),
                        chart_type: $('#cs_chart_type').val(),
                        question: $('#cs_question').val(),
                        color: 'rgb(0, 0, 255)'
                    }
                    gTasks.cache.currentData.settings.charts.push(item);
                    chart.add(item);
                    setupChartEdit();
                }
            }
            $('#chart_settings_popup').modal("hide");
            chart.refresh();
            saveCharts();
        });

        // Set page defaults
        var currentTab = getFromLocalStorage("currentTab" + page);
        if(currentTab) {
            $(currentTab).trigger('click');
        } else {
            $('#table-view').trigger('click');
        }

        // Respond to clicking of edit button
        $('#m_edit').click(function() {
            gEditUrl = $(this).data("url");
            checkLoggedIn(editRecord);
        });
    });         // End of document ready

    // Generate a file based on current console data
    $('.genfile').click(function (e) {
        e.preventDefault();
        var format,
            $this = $(this);

        if(!$this.hasClass("disabled")) {
            $('.genfile').addClass("disabled");
            if ($this.hasClass("xls")) {
                format = "xlsx";
            } else if ($this.hasClass("pdf")) {
                format = "pdf";
            } else if ($this.hasClass("docx")) {
                format = "docx";
            } else {
                format = "image";
            }

            $('#dashboardInfo').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["msg_ds_s"]);
            setTimeout(function () {
                $('#dashboardInfo').hide();
                $('.genfile').removeClass("disabled");
            }, 5000);
            setTimeout(function () {
                genFile(false, format);         // allow message to be displayed
            }, 0);
        }
    });

    // Generate an xls file of basic counts for all data
    $('.genxlsfileall').click(function (e) {
        e.preventDefault();
        var $groupBy = $('#srf_group');
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
                    || cols[i].type === "prikey" || cols[i].type === "geopoint" || cols[i].type === "geoshape" || cols[i].type === "geotrace"
                    || cols[i].type === "geocompound") {

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

    $('#overviewReportSave').click(function(e) {
        e.preventDefault();
        genFile(true, "xlsx");
        $('#overviewReport').modal("hide");
    });

    function editRecord() {
        if(gEditUrl !== '#') {
            window.location.href = gEditUrl;
        } else {
            alert(localise.set["n_no_oversight"]);
        }
    }
    /*
     * Load the chart definitions from the server
     */
    function updateCharts(charts) {
        var i;
        chart.clear();
        for(i = 0; i < charts.length; i++) {
            chart.add(charts[i]);
        }
        setupChartEdit();
    }

    function setupChartEdit() {
        $('.fa-cog','#chartcontent').click(function(){
            gSelectedChart = $(this).data("idx");
            $('#addChartForm')[0].reset();
            $('#cs_subject').val(gTasks.cache.currentData.settings.charts[gSelectedChart].subject);
            $('#cs_chart_type').val(gTasks.cache.currentData.settings.charts[gSelectedChart].chart_type);
            $('#cs_question').val(gTasks.cache.currentData.settings.charts[gSelectedChart].question);
            $('#cs_chart_label').val(gTasks.cache.currentData.settings.charts[gSelectedChart].label);

            setChartPopupControls();
            $('#chart_settings_popup').modal("show");
        });

        $('.fa-trash','#chartcontent').click(function(){
            chart.remove($(this).data("idx"));
            gTasks.cache.currentData.settings.charts.splice($(this).data("idx"), 1);
            saveCharts();
            updateCharts(gTasks.cache.currentData.settings.charts);
            chart.refresh();
        });
    }

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
            subForm,
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
        settings.push({
            k: localise.set["mf_cc"],
            v: $('#include_completed').prop('checked') ? localise.set["c_yes"] : localise.set["c_no"]
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
        var sId = globals.gCurrentSurvey;

        data = getTableData(globals.gMainTable, gTasks.cache.currentData.schema.columns, format);

        if (format === "xlsx") {
            filename = title + ".xlsx";
            mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        } else if (format === "pdf") {
            filename = title + ".pdf";
            mime = "application/pdf";
        } else if (format === "docx") {
            filename = title + ".docx";
            mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else {
            // image
            filename = title + ".zip"
            mime = "application/zip";
        }

        if(globals.gGroupSurveys[globals.gCurrentSurvey] && globals.gGroupSurveys[globals.gCurrentSurvey] != "") {
            groupSurvey = globals.gGroupSurveys[globals.gCurrentSurvey];
        }
        if(globals.gSubForms[globals.gCurrentSurvey] && globals.gSubForms[globals.gCurrentSurvey] != "") {
            subForm = globals.gSubForms[globals.gCurrentSurvey];
            if(subForm === '_none') {
                subForm = undefined;
            }
        }
        if(!subForm) {
            // Check that we have not drilled down
            var drillDownState;

            if(gDrillDownStack.length > 0) {
                drillDownState = gDrillDownStack[gDrillDownStack.length  - 1];
            }

            if(drillDownState) {
                sId = drillDownState.survey;

                // Set subform
                if(drillDownState.type === "sub_form") {
                    subForm = drillDownState.form;
                }
            }
        }

        if (format === "xlsx") {
            chartData = summary_report.getXLSData(alldata);
        }

        generateFile(url, filename, format, mime, data, sId, groupSurvey, title, project, charts, chartData,
            settings,
            tz,
            subForm);      // formName
    }

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
     * Test if this record should be filtered out based on its assignment
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
    function mfSurveyChanged() {


        globals.gViewId = 0;        // TODO remember views set for each survey and restore

        getEligibleUsers(globals.gCurrentSurvey, false);

        $('.editRecordSection, .bulkEditSection, .selectedOnly, .singleSelectOnly, .multiSelectOnly, .re_alert, .dd_only').hide();
        if (globals.gCurrentSurvey > 0 && typeof gTasks.gSelectedSurveyIndex !== "undefined") {

            getLanguageList(globals.gCurrentSurvey, undefined, false, '.language_sel', false, -1);
            saveCurrentProject(-1, globals.gCurrentSurvey);
            getGroupSurveys(globals.gCurrentSurvey,  groupsRetrieved);
            groupSurveyChanged();

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
            loadManagedSurveys(globals.gCurrentProject, mfSurveyChanged);
            populatePdfSelect(globals.gCurrentSurvey, $('#select_pdf'));
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
            subForm,
	        drillDownState;

        if(gDrillDownStack.length > 0) {
        	drillDownState = gDrillDownStack[gDrillDownStack.length  - 1];
        }

        if(drillDownState) {
            sId = drillDownState.survey;
        }

        // Set subform
        if(drillDownState && drillDownState.type === "sub_form") {
            subForm = drillDownState.form;
        } else {
            if (globals.gSubForms[sId] && globals.gSubForms[sId] != "") {
                subForm = globals.gSubForms[sId];
                if (subForm === '_none') {
                    subForm = undefined;
                }
            }
        }


        // Set Group survey
	    if (globals.gGroupSurveys[sId] && globals.gGroupSurveys[sId] != "") {
		    groupSurvey = globals.gGroupSurveys[sId];
	    }

        getData(sId, groupSurvey, subForm, callback, clearCache);
        checkFilters();
    }

    /*
     * Show the table
     */
    function showTable(dataSet) {

        var x = 1,
            columns,
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
            hSelect = [],
            hColSortIdx = -1,
            hDupsIdx = -1,
            hSelectIdx = -1;


        if ( $.fn.dataTable.isDataTable( $table) && globals.gMainTable) {
            globals.gMainTable.destroy();
        }

        if(dataSet.schema) {
            columns = dataSet.schema.columns;
        } else {
            columns = [];
        }

        // Add table
        //h[++idx] = '<table id="trackingTable" style="width:100%">';

        // Add head
        h[++idx] = '<thead>';
        h[++idx] = '<tr>';

        for (i = 0; i < columns.length; i++) {
            headItem = columns[i];

            hColSort[++hColSortIdx] = addToColumnSort(headItem);
            hSelect[++hSelectIdx] = addToColumnSelect(headItem);
            if(isDuplicates) {
                hDups[++hDupsIdx] = addToDuplicateReportSelect(headItem);
            }

            shownColumns.push({
                "data": headItem.column_name
            });
            h[++idx] = '<th>';
            h[++idx] = '<span class="ch">';
            h[++idx] = htmlEncode(headItem.displayName);
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
       // h[++idx] = '</table>';

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
                            .appendTo( $(column.footer()).empty())
                            .on('change', function () {
                                var val = $.fn.dataTable.util.escapeRegex(
                                    $(this).val()
                                );

                                column
                                    .search( val ? '^'+val+'$' : '', true, false )
                                    .draw();

                                saveFilter(colIdx, val);
                            });

                        select.append( '<option value=""></option>' );
                        column.data().unique().sort().each( function ( d, j ) {
                            if(d && d.length > 0) {
                                select.append('<option value="' + d + '">' + htmlEncode(d) + '</option>')
                            }
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
            recordSelected(globals.gMainTable.rows('.selected').data());
        });
        globals.gMainTable.off('deselect').on('deselect', function (e, dt, type, indexes) {
            recordSelected(globals.gMainTable.rows('.selected').data());
        });

        // Highlight data conditionally, set barcodes
        tableOnDraw();
        globals.gMainTable.off('draw').on('draw', function () {
            tableOnDraw();
        });

        $('.table_filter').off().on('blur', function (e) {
            e.preventDefault();
            showManagedData(globals.gCurrentSurvey, showTable, false);  // update console with changed data
        });

        // Respond to changes that filter data on assignment
        $('.assign_filter:checkbox').change(function () {
            globals.gMainTable.draw();

            checkFilters();
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
        $('#tab-columns-content').html(hColSort.join(''));
        $('#cs_question').html(hSelect.join(''));

        /*
         * Duplicates modal
         */
        if(isDuplicates) {
            $('#duplicateSelect').html(hDups.join(''));
        }

    }

    /*
     * Set context specific controls in chart dialog
     */
    function setChartPopupControls() {
        var subject = $('#cs_subject').val();

        $('.qonly').hide();

        if(subject === 'question') {
            $('.qonly').show();
        }
    }

    /*
     * Show duplicates data
     */
    function showDuplicateData(sId) {

        var searchCriteria = getSearchCriteria();
        var url = '/surveyKPI/api/data/similar/' + sId + '/' + searchCriteria + "?format=dt";
        url += "&tz=" + encodeURIComponent(globals.gTimezone);

        if(searchCriteria && searchCriteria.length > 0) {
            globals.gMainTable.ajax.url(url).load();
        }

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

        if (item.include || item.column_name === "prikey") {
            h[++idx] = '<div class="row">';
            h[++idx] = '<div class="col-sm-6">';
            h[++idx] = htmlEncode(item.displayName);
            h[++idx] = '</div>';

            h[++idx] = '<div class="col-sm-2">';
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

            h[++idx] = '<div class="col-sm-2">';
            h[++idx] = '<div class="switch">';
            h[++idx] = '<input type="checkbox" name="barcodeSelect"';
            h[++idx] = ' class="barcodeSelect" value="';
            h[++idx] = item.displayName;
            h[++idx] = '"';
            if(item.barcode) {
                h[++idx] = ' checked';
            }
            h[++idx] = '>';
            h[++idx] = '</div>';
            h[++idx] = '</div>';

            h[++idx] = '<div class="col-sm-2">';
            h[++idx] = '<div class="switch">';
            h[++idx] = '<input type="checkbox" name="includeText"';
            h[++idx] = ' class="includeText" value="';
            h[++idx] = item.displayName;
            h[++idx] = '"';
            if(item.includeText) {
                h[++idx] = ' checked';
            }
            h[++idx] = '>';
            h[++idx] = '</div>';
            h[++idx] = '</div>';

            h[++idx] = '</div>';
        }
        return h.join('');
    }

    /*
     * Add the column to column select
    */
    function addToColumnSelect(item) {
        var h = [],
            idx = -1;

        if (item.include) {
            h[++idx] = '<option value="';
            h[++idx] = item.displayName;
            h[++idx] = '">';
            h[++idx] = htmlEncode(item.displayName);
            h[++idx] = '</option>';
        }
        return h.join('');
    }

    /*
     * Add the column to the select list for duplicate searches
     */
    function addToDuplicateReportSelect(item) {
        var h = [],
            idx = -1;

        if (item.include && !item.mgmt) {
            h[++idx] = '<div class="row">';
            //h[++idx] = '<div class="setings-item">';

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

            h[++idx] = '</div>';		// Row

        }
        return h.join('');
    }

    /*
     * Get surveys and update the survey lists on this page
     *  This is a different function from the common loadSurveys function as it only loads data surveys
     *  and not oversight surveys
     */
    function loadManagedSurveys(projectId, callback) {

        var url = "/surveyKPI/surveys?projectId=" + projectId + "&blocked=true",
            $elemSurveys = $('#survey_name');


        if (typeof projectId !== "undefined" && projectId != -1 && projectId != 0) {

            addHourglass();
            gRefreshingData = false;
            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();
                    if(handleLogout(data)) {

                        var i,
                            item,
                            h = [],
                            idx = -1,
                            firstSurvey = true,
                            firstSurveyId = undefined,
                            firstSurveyIndex = undefined;

                        gTasks.cache.surveyList[globals.gCurrentProject] = data;
                        gTasks.gSelectedSurveyIndex = undefined;

                        for (i = 0; i < data.length; i++) {
                            item = data[i];

                            if (item.dataSurvey) {
                                h[++idx] = '<option value="';
                                h[++idx] = i;
                                h[++idx] = '">';
                                h[++idx] = htmlEncode(item.displayName);
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
                        }
                    }
                },
                error: function (xhr, textStatus, err) {

                    removeHourglass();
                    gRefreshingData = false;
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log(localise.set["c_error"] + ": " + err);
                        }
                    }
                }
            });
        } else {
            gRefreshingData = false;
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
     * Update a selector that is used for oversight forms and does not include current form
     */
    function setOversightSelector(data) {
        var $elemGroups = $('#oversight_survey');

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

            if (item.sId !== globals.gCurrentSurvey && item.oversightSurvey) {       // Don't include current survey

                h[++idx] = '<option value="';
                h[++idx] = item.surveyIdent;
                h[++idx] = '">';
                h[++idx] = htmlEncode(item.surveyName);
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

                if(data[i].type === 'sub_form') {
                    h[++idx] = '<option value="';
                    h[++idx] = data[i].name;
                    h[++idx] = '">';
                    h[++idx] = data[i].name;
                    h[++idx] = '</option>';
                }
            }
        }

        $elem.empty().html(h.join(''));
        if(globals.gSubForms[globals.gCurrentSurvey]) {
            $elem.val(globals.gSubForms[globals.gCurrentSurvey]);
        }

    }

    /*
     * Update the drill down list of forms
     */
    function updateDrillDownFormList() {
        var $drillDown = $('#drill_down_list'),
            data = gTasks.cache.currentData.forms;

        var i,
            h = [],
            idx = -1,
            setDefault = false,
	        parentForm,
	        drillDownState;

        if(gDrillDownStack.length > 0) {
        	drillDownState = gDrillDownStack[gDrillDownStack.length - 1];
        }

        if(drillDownState) {
            if(drillDownState.type === 'sub_form') {
                parentForm = drillDownState.form;
            } else {
                parentForm = "main";
            }
        } else {
		    parentForm = $('#sub_form').val();
		    if(parentForm === "_none") {
			    parentForm = "main";
		    }
	    }

	    $('#dd_form').html("");
	    gDrillDownNext = undefined;

        if(data && data.length) {

            for (i = 0; i < data.length; i++) {
                // Add to drill down
                if (parentForm && data[i].parentName == parentForm) {
                    h[++idx] = '<a class="dropdown-item dd_form" href="#" data-form="';
                    h[++idx] = data[i].name;
                    h[++idx] = '"';
                    h[++idx] = ' data-type="';
                    h[++idx] = data[i].type;
	                h[++idx] = '"';

                    if(data[i].surveyId) {
	                    h[++idx] = ' data-survey="';
	                    h[++idx] = data[i].surveyId;
	                    h[++idx] = '"';
                    }

	                if(data[i].keyQuestion) {
		                h[++idx] = ' data-key="';
		                h[++idx] = data[i].keyQuestion;
		                h[++idx] = '"';
	                }

                    h[++idx] = '>';
                    h[++idx] = data[i].name;
                    h[++idx] = '</a>';

                    if(!setDefault) {
                        $('#dd_form').html(data[i].name);

                        gDrillDownNext = {
	                        form: data[i].name,
	                        type: data[i].type,
	                        survey: data[i].surveyId,
	                        key: data[i].keyQuestion
                        }
                        setDefault = true;
                    }
                }
            }

        }

        $drillDown.empty().html(h.join(''));

        // Respond to selection of a form to drill down to:
        $('.dd_form', $drillDown).click(function(){
            var $this = $(this);
            $('#dd_form').html($this.data("form"));
            gDrillDownNext = {
	            form: $this.data("form"),
	            type: $this.data("type"),
	            survey: $this.data("survey"),
	            key: $this.data("key")
            }
            drillDown();
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
        saveColumns();
    }

    /*
     * Save the current charts configuration
     */
    function saveCharts() {

        var saveView = JSON.stringify(gTasks.cache.currentData.settings.charts);

        var url = "/surveyKPI/charts/save/" + globals.gCurrentSurvey;

        addHourglass();
        $.ajax({
            type: "POST",
            cache: false,
            contentType: "application/x-www-form-urlencoded",
            url: url,
            data: {chartArray: saveView},
            success: function (data, status) {
                removeHourglass();
                handleLogout(data);
            }, error: function (data, status) {
                removeHourglass();
                if(handleLogout(data)) {
                    alert(data.responseText);
                }
            }
        });
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
                hide: columns[i].hide,
                barcode: columns[i].barcode,
                includeText: columns[i].includeText

            };
        }

        var saveView = JSON.stringify(configColumns);

        var url = "/surveyKPI/survey/" + globals.gCurrentSurvey + "/console_settings/columns";

        addHourglass();
        $.ajax({
            type: "POST",
            cache: false,
            contentType: "application/x-www-form-urlencoded",
            url: url,
            data: {columns: saveView},
            success: function (data, status) {
                removeHourglass();
                if(handleLogout(data)) {
                    showManagedData(globals.gCurrentSurvey, showTable, false); // redraw
                    $('#right-sidebar').removeClass("sidebar-open");
                }
            }, error: function (data, status) {
                removeHourglass();
                if(handleLogout(data)) {
                    alert(data.responseText);
                }
            }
        });
    }

    /*
     * Perform initialisation after the data has been loaded
     */
    function initialiseColumns() {


        var columns = gTasks.cache.currentData.schema.columns,
            i,
            h = [],
            idx = -1,
            select_questions = {};

        /*
         * Add an indicator to columns if they can be used as a chart question in summary reports
         * Merge choices in select multiples
         */
        var firstDate = undefined;
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

                if(!firstDate) {
                    firstDate = columns[i].column_name;
                }
                    h[++idx] = '<option value="';
                    h[++idx] = columns[i].column_name;
                    h[++idx] = '">';
                    h[++idx] = htmlEncode(columns[i].displayName);
                    h[++idx] = '</option>';
            } else if (d.displayName === '_assigned') {
                gAssignedCol = i;
            }

        }
        var dq = $('#date_question').val();
        if(!dq) {
            dq = firstDate;
        }
        $('#date_question').empty().html(h.join('')).val(dq);
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
        $('.editRecordSection,.bulkEditSection,.srview,.re_alert').hide();
    }

    /*
     * Respond to a map feature being selected
     */
    function featureSelected(properties) {
        var data = [];
        var indexes = [];
        var i;
        if(properties && properties.length > 0) {
            for(i = 0; i < properties.length; i++) {
                indexes.push(properties[i].record);
            }
            data = globals.gMainTable.rows(indexes).data().toArray();

            showSelectedMapData(properties);

        } else {
            $('#features').hide().empty();
        }
        recordSelected(data);

    }

    /*
     * Show data from features selected on a map
     */
    function showSelectedMapData(properties) {

        var schema = gTasks.cache.currentData.schema,
            $element = $('#features'),
            columns = schema.columns,
            configItem,
            i, j,
            h = [],
            idx = -1,
            records = [];

        h[++idx] = '<img id="fDel" src="/app/fieldAnalysis/img/delete.png"/><br/>';
        h[++idx] = '<div id="feature_data">';
        if(properties.length > 0) {

            for(i = 0; i < properties.length; i++) {
                records.push(globals.gMainTable.rows(properties[i].record).data().toArray()[0]);
            }
            h[++idx] = '<div class="row">';
            h[++idx] = '<div class="col-md-12 col-xs-12 table-responsive billing_enabled">';
            h[++idx] = '<table class="table table-striped">';
            h[++idx] = '<tbody>';
            // Add data
            for (i = 0; i < columns.length; i++) {
                configItem = columns[i];
                if(configItem.type === 'geopoint' || configItem.type === 'geotrace' || configItem.type === 'geoshape'
                    || configItem.type === 'geocompound') {
                    continue;
                }
                h[++idx] = '<tr>';
                h[++idx] = addCell(translateKey(configItem.displayName));
                for(j = 0; j < properties.length; j++) {
                    h[++idx] = addCell(translateKeyValue(configItem.displayName, records[j][configItem.column_name]));
                }
                h[++idx] = '</tr>';
            }
            // End data
            h[++idx] = '</tbody>';
            h[++idx] = '</table>';
            h[++idx] = '</div>';
            h[++idx] = '</div>';
        }
        h[++idx] = '</div>';

        $element.html(h.join('')).show();
        $('#fDel', $element).off().click(function() {	// Closing the panel manually
            $("#features").hide().empty();
        });


    }

    /*
	 * Get the markup to show features
	 */
    function addCell(item) {

        var h = [],
            idx = -1;

        // Add form group and label
        h[++idx] = '<td>';
        h[++idx] = addAnchors(item, true);
        h[++idx] = '</td>';


        return h.join('');
    }

    /*
     * Respond to a record of data being selected
     */
    function recordSelected(records) {

        var assignedOther = false,
            i;

        $('.selectOnly, .multiSelectOnly, .singleSelectOnly').hide();
        $('.dd_only,.du_only').hide();

        gTasks.gSelectedRecord = undefined;
        gTasks.gBulkInstances = [];

        for(i = 0; i < records.length; i++) {
            gTasks.gBulkInstances.push(records[i].instanceid);
        }

        if(records.length === 0) {
            /*
			 * No records are selected
			 */
            $('.selectOnly, .dd_only').hide();

        } else if(records.length > 1) {
            /*
             * Multiple records are selected
             */

            // Set selected record to first record selected
            //gTasks.gSelectedRecord = globals.gMainTable.rows(gTasks.gSelectedIndexes).data().toArray()[0];
            gTasks.gSelectedRecord = records[0];

            // Store the record indexes that will need to be updated
            //var records = globals.gMainTable.rows(gTasks.gSelectedIndexes).data().toArray();
            //for(i = 0; i < gTasks.gSelectedIndexes.length; i++) {
            //    gTasks.gBulkInstances.push(records[i].instanceid);
            //}
            for(i = 0; i < records.length; i++) {
                gTasks.gBulkInstances.push(records[i].instanceid);
            }

            $('.multiSelectOnly').show();

        } else {
            /*
			 * Only a single record is selected
			 */
            //gTasks.gSelectedRecord = globals.gMainTable.rows(gTasks.gSelectedIndexes).data().toArray()[0];
            gTasks.gSelectedRecord = records[0];
            if (gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned === globals.gLoggedInUser.ident) {
                $('.assigned').show();
            } else if (gTasks.gSelectedRecord._assigned && gTasks.gSelectedRecord._assigned !== globals.gLoggedInUser.ident) {
                $('.assigned_other').show();
                assignedOther = true;
            } else {
                $('.not_assigned').show();
            }

            // Set up the record edit button if there is an oversight form
            var oversightIdent = $('#oversight_survey').val();
            if(oversightIdent && oversightIdent.length > 0) {
                var instanceId = gTasks.gSelectedRecord.instanceid;
                var url = "/app/myWork/webForm/" + oversightIdent + "?datakey=instanceid&datakeyvalue=" + instanceId;
                url += addCacheBuster(url)
                $('#m_edit').data("url", url);
                localStorage.setItem("mfselected", instanceId);
            } else {
                $('#m_edit').data("url", "#");
            }

            // Set up the drill down
            if(gDrillDownStack.length > 0) {
                $('.du_only').show();
            }

            updateDrillDownFormList();
            if(gDrillDownNext) {
                $('.dd_only').show();
            }

            var columns = gTasks.cache.currentData.schema.columns;
            if(!assignedOther) {
                if ((gDeleteColumn < 0 || gTasks.gSelectedRecord[columns[gDeleteColumn].question_name] === 'f')) {
                    $('.not_deleted').show();
                } else if (gDeleteColumn >= 0 && gTasks.gSelectedRecord[columns[gDeleteColumn].question_name] === 't') {
                    $('.deleted').show();
                }
            }

            if(globals.gIsAdministrator) {
                $('.assigned_admin').show();
            }

            if(globals.gIsAdministrator || globals.gIsConsoleAdmin) {
                $('.assigned_console_admin').show();
            }

            if(!globals.gIsLinkFollower) {
                $('.linksOnly').hide();
            }
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
     * Get the list of changes to this record from the server
     */
    function getRecordChanges(record) {

        if(record && globals.gCurrentSurvey) {
            addHourglass();
            $.ajax({
                url: "/surveyKPI/api/data/changes/" + globals.gCurrentSurvey + "/" + record["instanceid"] +
                    '?tz=' + encodeURIComponent(globals.gTimezone),
                dataType: 'json',
                cache: false,
                success: function (data) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        window.gChanges = data;
                        globals.gRecordChangeMaps = [];     // Initialise the list of maps we are going to show

                        showHistory(data);
                    }

                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert(localise.set["error"] + ": " + err);
                        }
                    }
                }
            });
        }
    }

    function showHistory(data) {
        var h = [],
            idx = -1,
            $elem = $('#changes'),
            i,
            finish,
            statusClass;

        $('#dashboardInfo').hide();
        var includeTasks = $('#er_show_tasks').is(':checked');
        var includeNotifications = $('#er_show_notifications').is(':checked');
        var includeChanges = $('#er_show_changes').is(':checked');
        var includeAssignments = $('#er_show_assignments').is(':checked');

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

                if((includeChanges && (data[i].event === 'changes' || data[i].event === 'created' || data[i].event === 'deleted'
                        || data[i].event === 'restored'
                        || data[i].event === 'inbound_msg'
                        || data[i].event === 'new_case')) ||
                    (includeTasks && data[i].event === 'task') ||
                    (includeAssignments && data[i].event === 'assigned') ||
                    (includeNotifications && data[i].event === 'notification')) {
                    h[++idx] = '<tr>';

                    h[++idx] = '<td>';
                    if (data[i].event === 'task') {
                        h[++idx] = '<i class="fa fa-lg fa-tasks fa-2x"></i>';
                    } else if (data[i].event === 'created' || data[i].event === 'changes' || data[i].event === 'deleted' || data[i].event === 'restored') {
                        h[++idx] = '<i style="line-height: 1.5em;" class="fa fa-lg fa-inbox fa-2x"></i>';
                    } else if (data[i].event === 'inbound_msg') {
                        h[++idx] = '<i style="line-height: 1.5em;" class="fa fa-lg fa-phone fa-2x"></i>';
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
                    if(data[i].userName) {
                        h[++idx] = htmlEncode(data[i].userName);
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="mincol">';    // Survey
                    if(data[i].surveyName) {
                        h[++idx] = htmlEncode(data[i].surveyName) + ' (' + data[i].surveyVersion + ')';
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="mincol">';    // when
                    h[++idx] = htmlEncode(data[i].eventTime);
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="mincol">';    // event
                    if(data[i].event === 'assigned') {
                        h[++idx] = htmlEncode(localise.set['t_assign']);
                    } else {
                        h[++idx] = htmlEncode(localise.set[data[i].event]);
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="mincol ';    // status
                    finish = getFinish(data[i]);
                    statusClass = getStatusClass(data[i].status, data[i].assign_auto);
                    h[++idx] = statusClass;
                    h[++idx] = '">';
                    if(statusClass == 'bg-danger') {
                        h[++idx] = localise.set["c_late"];
                    } if(statusClass == 'bg-orange') {
                        h[++idx] = localise.set["t_auto2"];
                    } else {
                        h[++idx] = localise.set[data[i].status];
                    }

                    h[++idx] = '</td>';

                    h[++idx] = '<td>';    // Details
                    if (data[i].event === 'changes' && data[i].changes) {
                        h[++idx] = getChangeCard(data[i].changes, i);
                    } else if (data[i].event === 'task' && data[i].task) {
                        h[++idx] = getTaskCard(data[i].task, i);
                    } else if (data[i].event === 'notification' && data[i].notification) {
                        h[++idx] = getNotificationInfo(data[i].notification, data[i].description);
                    } else {
                        h[++idx] = htmlEncode(data[i].description);
                    }
                    h[++idx] = '</td>';

                    h[++idx] = '<td class="mincol">';    // Action
                    if (data[i].event === 'notification' && data[i].notification) {
                        h[++idx] = '<button class="btn btn-secondary edit_notification" data-idx="';
                        h[++idx] = i;
                        h[++idx] = '">';
                        h[++idx] = localise.set["c_resend"];
                        h[++idx] = '</button>';
                    } else  if (data[i].event === 'task' && data[i].task && data[i].status !== 'cancelled') {
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
            $('#dashboardInfo').hide();
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
            edit_notification(true,0, true);
            $('#addNotificationPopup').modal("show");
        });

        $('.edit_task').click(function(){

            $('#dashboardInfo').hide();
            var idx = $(this).data("idx");
            var task = window.gChanges[idx].task;
            var url = "/surveyKPI/api/tasks/assignment/" + task.assignmentId + "?taskid=" + task.taskId;
            // Get the task details and then open the editor dialog

            $.ajax({
                url: url,
                dataType: 'json',
                cache: false,
                success: function (data) {
                    if(handleLogout(data)) {
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
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            console.log(localise.set["c_error"] + ": " + err);
                        }
                    }
                }
            });
        });
    }

    /*
     * Get the current schedule to date from a task
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
        } else if(n.content) {
            h[++idx] = n.content;
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

                if(type === 'geopoint' || type === 'geoshape' || type === 'geotrace' || type === 'geocompund') {
                    h[++idx] = actioncommon.addCellMap(true, 'change_maps_',
                        globals.gRecordChangeMaps, changes[i], newVal, oldVal);
                } else {

                    h[++idx] = '<div class="col-md-3">';
                    if(changes[i].displayName) {
                        h[++idx] = htmlEncode(changes[i].displayName);
                    } else {
                        h[++idx] = htmlEncode(changes[i].col);
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


    function getData(sId, oversightSurvey, subForm, callback, clearCache) {

    	var filter;

	    var url = '/surveyKPI/api/data/';
	    url += sId;
	    url += "?mgmt=true";

	    if (oversightSurvey) {
		    url += "&oversightSurvey=" + oversightSurvey;
	    }

	    if(subForm) {
		    url += "&form=" + subForm;

		    // Check for drill down
		    if(gDrillDownStack.length > 0) {
			    url += "&parkey=" + gDrillDownStack[gDrillDownStack.length - 1].record;
		    }
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

		    if (dateName && dateName.trim().length) {
                url += "&dateName=" + dateName;
            }
            if (fromDate && fromDate.trim().length) {
                url += "&startDate=" + fromDate;
            }
            if (toDate && toDate.trim().length) {
                url += "&endDate=" + toDate;
            }

		    if($('#include_bad').prop('checked')) {
			    url += "&bad=yes";
		    }
            if($('#include_completed').prop('checked')) {
                url += "&completed=yes";
            } else {
                url += "&completed=no";
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
		    filter = $('#advanced_filter').val();
		    // Apply combined filter
		    if (filter && filter.trim().length > 0) {
			    url += "&filter=" + encodeURIComponent(filter);
		    }

		    // Drill Down Filters for launched forms
		    if(gDrillDownStack.length > 0) {
			    var stackObj = gDrillDownStack[gDrillDownStack.length - 1];

			    if(stackObj.type === "child_form" && stackObj.key) {
			        /*
			         * The filter will select those records where the key question is equal to either the
			         * primary key of this survey or its key
			         */
			        var filter = "(${" + stackObj.key + "} = '" + stackObj.record + "'";
			        if(stackObj.key_value) {
			            filter += "or ${" + stackObj.key + "} = '" + stackObj.key_value + "')"
                    } else {
			            filter += ")";
                    }
				    url += "&dd_filter=" + encodeURIComponent(filter);
			    } else if(stackObj.type === "parent_form" && stackObj.key) {
			        var keyValue = gTasks.gSelectedRecord[stackObj.key];

			        if(keyValue) {
                        if (stackObj.key_value) {
                            url += "&dd_hrk=" + keyValue;
                        }
                    }
                }
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

        if(gTasks.gInitialInstance) {
            url += "&selectedrow=" + encodeURIComponent(gTasks.gInitialInstance);
        }

	    // First Check the Cache
	    if(!clearCache && gTasks.cache.data[url]) {
            if(url !== gPreviousUrl) {
                // URL has changed update views
                gPreviousUrl = url;
                gTasks.cache.currentData = gTasks.cache.data[url];
                callback(gTasks.cache.data[url]);
                updateSettings(gTasks.cache.currentData.settings);
                map.setLayers(gTasks.cache.currentData.schema.layers);
                updateFormList(gTasks.cache.currentData.forms);
                updateCharts(gTasks.cache.currentData.settings.charts);
                updateConversationalSMS(gTasks.cache.currentData.sms);
            }
	    } else {

            gPreviousUrl = url;

		    addHourglass();
		    $.ajax({
			    url: url,
			    dataType: 'json',
			    cache: false,
			    success: function (data) {
				    removeHourglass();
                    gRefreshingData = false;
                    gGetSettings = false;
                    if(handleLogout(data)) {

                        var theCallback = callback;
                        if (data && data.status === "error") {
                            alert(data.msg);
                            clearTable();
                            return;
                        } else if (data.data && data.data[0] && data.data[0].status === "error") {
                            alert(data.data[0].msg);
                            clearTable();
                            return;
                        } else if (data && data.status === "ok") {
                            // Continue presumably there is no data
                            clearTable();
                            return;
                        } else {
                            var theKey = url;

                            gTasks.cache.data[theKey] = data;
                            gTasks.cache.currentData = data;

                            updateSettings(gTasks.cache.currentData.settings);
                            map.setLayers(gTasks.cache.currentData.schema.layers);
                            updateFormList(gTasks.cache.currentData.forms);
                            updateCharts(gTasks.cache.currentData.settings.charts);
                            updateConversationalSMS(gTasks.cache.currentData.sms);

                            // Add a config item for the group value if this is a duplicates search
                            if (isDuplicates) {
                                gTasks.cache.currentData.schema.columns.unshift({
                                    hide: true,
                                    include: true,
                                    column_name: "_group",
                                    displayName: "_group"
                                });
                            }

                            // Initialise the column settings
                            initialiseColumns();

                            theCallback(data);
                        }
                    }
			    },
			    error: function (xhr, textStatus, err) {
				    removeHourglass();
                    gRefreshingData = false;
                    gGetSettings = false;

                    if(handleLogout(xhr.responseText)) {
                        if (globals.gMainTable) {
                            globals.gMainTable.destroy();
                            globals.gMainTable = undefined;
                        }
                        $("#trackingTable").empty();

                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            err += " : ";
                            if (xhr.responseText.indexOf("<head>") >= 0) {
                                err += localise.set["c_error"];
                            } else {
                                err += xhr.responseText;
                            }

                            alert(localise.set["error"] + ": " + err);
                        }
                    }
			    }
		    });
        }


    }

    /*
     * Set the reset filters link
     */
    function checkFilters() {
        var filtersOn = false,
            i;

        for(i = 0; i < window.filters.length; i++) {

            if(window.filters[i].type === 'text') {
                var v = $('#' + window.filters[i].id).val();
                if(window.filters[i].value) {
                    if(window.filters[i].value !== v) {
                        filtersOn = true;
                    }
                } else {
                    if(v && v.trim().length > 0) {
                        filtersOn = true;
                    }
                }
            } else  if(window.filters[i].type === 'checkbox') {
                filtersOn = ($('#' + window.filters[i].id).prop('checked') !== window.filters[i].value);
            }

            if(filtersOn) {
                break;
            }
        }

        if(filtersOn) {
            $('.filtersChanged').show();
        } else {
            $('.filtersChanged').hide();
        }
    }

    /*
     * Reset the filters
     */
    function resetFilters() {
        var i;

        for(i = 0; i < window.filters.length; i++) {

            if(window.filters[i].type === 'text') {
                $('#' + window.filters[i].id).val(window.filters[i].value);
            } else  if(window.filters[i].type === 'checkbox') {
                $('#' + window.filters[i].id).prop('checked', window.filters[i].value);
            }
        }

        globals.gMainTable.draw();
        $('.filtersChanged').hide();

    }

    function tableOnDraw() {
        var i;

        console.log("tableOnDraw");
        if(!globals.gMainTable) {
            return;     // Table not ready
        }

        gDeleteColumn = -1;
        gDeleteReasonColumn = -1;

        if (isDuplicates) {

            var rows = globals.gMainTable.rows({page: 'current'}).nodes();
            var last = null;

            globals.gMainTable.column(0, {page: 'current'}).data().each(function (group, i) {
                if (group && last !== group) {
                    $(rows).eq(i).before(
                        '<tr class="group" style="background-color: #CCC;"><td colspan="5">' + group + '</td></tr>'
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
            } else if (headItem.barcode) {
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this),
                        opt = {
                            render: 'div',
                            size: 100,
                            text: $this.text()
                        }

                    $this.empty().qrcode(opt);

                });
            } else if(headItem.del_col) {  // Deleted
                gDeleteColumn = i;
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this);
                    if($this.text() === "t") {
                        $this.text(localise.set["c_yes"]);
                        $this.addClass('bg-danger');
                    } else  if($this.text() === "f") {
                        $this.text(localise.set["c_no"]);
                    }
                });
            } else if(headItem.del_reason_col) {  // Deleted reason
                gDeleteReasonColumn = i;
            } else if(headItem.type === 'conversation') {
                $(globals.gMainTable.column(i).nodes()).each(function (index) {
                    var $this = $(this);
                    if($this[0] && $this[0].innerHTML && $this[0].innerHTML.startsWith("[")) {  // Only format if this is a json array
                        $this.html(actioncommon.formatConversation(htmlEncode($this.text()),false));
                    }
                });
            }
        }

        // Refresh the views that depend on the displayed rows
        map.refreshAllLayers(gMapView, gOverallMapConfig.map);
        chart.refresh();

        if(gTasks.gBulkInstances && gTasks.gBulkInstances.length) {
            for(i = 0; i < gTasks.gBulkInstances.length; i++ ) {
                if(gTasks.gBulkInstances[i]) {
                    globals.gMainTable.row('#' + escSelector(gTasks.gBulkInstances[i])).select();      // Reselect the row, escape the :
                }
            }
        }

        // Set an initial selection if one has been set
        if(gTasks.gInitialInstance) {
            globals.gMainTable.row('#' + escSelector(gTasks.cache.currentData.selectedRow)).select();
            gTasks.gInitialInstance = undefined;
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

            $('#filter_from').val(settings.fromDate);
            $('#filter_to').val(settings.toDate);
            $('#date_question').val(settings.dateName);
            $('#limit').val(settings.limit);
            $('#advanced_filter').val(settings.filter);
            $('#include_bad').prop('checked', settings.include_bad === "yes");
            $('#include_completed').prop('checked', settings.include_completed === "yes");
        }
    }

    /*
     * Show links
     */
    function showLinks() {
        var sIdent = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].ident;
        var instanceId = gTasks.gSelectedRecord.instanceid;
        window.location.href = '/app/tasks/linkages.html?survey=' + sIdent + '&record=' + instanceId;
    }

    /*
     * Show a records details
     */
    function showRecord() {

        window.location.hash="#edit";
        $('.shareRecordOnly, .role_select').hide();
        $('#srLink').val("");
        checkLoggedIn(function(){
            getSurveyRoles(globals.gCurrentSurvey, undefined, false, false);
            getRecordChanges(gTasks.gSelectedRecord);
            getOurNumbers();
        });

        $('.overviewSection').hide();
        $('.editRecordSection').show();

        actioncommon.showEditRecordForm(gTasks.gSelectedRecord, gTasks.cache.currentData.schema, $('#surveyForm'), true);
    }

    /*
     * Open a page for bulk editing
     */
    function showBulkEdit() {

        window.location.hash="#bulk";
        $('.shareRecordOnly, .role_select').hide();
        $('#srLink').val("");
        getSurveyRoles(globals.gCurrentSurvey, undefined, false, false);

        //var sIdent = gTasks.cache.surveyList[globals.gCurrentProject][gTasks.gSelectedSurveyIndex].ident;


        $('.overviewSection').hide();
        $('.bulkEditSection').show();

        actioncommon.showBulkEditForm(gTasks.gSelectedRecord, gTasks.cache.currentData.schema, $('#bulkEditForm'));
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

        $('#dashboardInfo').hide();
        editTask(true, task, taskFeature);
    });

    $('#addNotification').click(function(){
        $('#dashboardInfo').hide();
        edit_notification(false, -1, true);
        $('#addNotificationPopup').modal("show");
    });

    /*
	 * Edit an existing task or create a new one
	 */
    function editTask(isNew, task, taskFeature) {
        var scheduleDate,
            splitDate = [];

        console.log("open edit task: " + task.from);
        $('#dashboardInfo').hide();

        window.gCurrentTaskFeature = taskFeature;

        $('form[name="taskProperties"]')[0].reset();

        if (isNew) {
            $('#taskPropLabel').html(localise.set["t_add_task"]);
            $('#tp_pol').prop('checked', true);
            $('#tp_assign_auto').prop('checked', false);

        } else {
            $('#taskPropLabel').html(localise.set["t_edit_task"]);
            $('#tp_pol').prop('checked', task.complete_all);
            $('#tp_assign_auto').prop('checked', task.assign_auto);
        }

        /*
		 * Set up data
		 */
        $('#tp_repeat').prop('checked', task.repeat);
        $('#tp_pol').prop('checked', task.complete_all);
        $('#tp_assign_auto').prop('checked', task.assign_auto);
        $('#tp_name').val(task.name);		// name
        if(isNew) {
            $('#tp_form_name').val($('#tp_form_name option:first').val());
        } else {
            $('#tp_form_name').val(taskFeature.properties.form_id);	// form id
        }
        setupAssignType(taskFeature.properties.assignee, 0, taskFeature.properties.emails, taskFeature.properties.assign_data);
        $('#tp_user').val(taskFeature.properties.assignee);	// assignee
        $('#tp_assign_emails').val(taskFeature.properties.emails);
        $('#tp_repeat').prop('checked', taskFeature.properties.repeat);
        $('#tp_pol').prop('checked', taskFeature.properties.complete_all);
        $('#tp_assign_auto').prop('checked', taskFeature.properties.assign_auto);

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
        gCurrentGroup = refreshLocationGroups(tags, true, gCurrentGroup);
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
            notificationString,
            target = $('#target').val(),
            theirNumber = $('#msg_cur_nbr').val(),
            ourNumber = $('#msg_our_nbr').val(),
            msgChannel = $('#msg_channel').val();

        if(theirNumber === 'other') {
            theirNumber = $('#msg_nbr_other').val();
        }

        $('#saveNotification').prop("disabled", true);  // debounce

        if(target === "email") {
            notification = saveEmail();
        } else if(target === "sms") {
            notification = saveSMS();
        } else if(target === "document") {
            notification = saveDocument();
        } else if(target === "conversation") {
            notification = saveConversation(gTasks.cache.currentData.schema.columns,
                theirNumber,
                ourNumber,
                msgChannel,
                gTasks.gSelectedRecord);
        }

        if(!notification.error) {

            notification.trigger = $('#trigger').val();
            notification.sIdent = $('#not_form_name').val();
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
                    $('#saveNotification').prop("disabled", false);  // debounce
                    return(-1);
                }
                console.log("Reminder for tg: " + notification.tgId + ' after ' + notification.period);
            }

            url = "/surveyKPI/notifications/immediate";

            notificationString = JSON.stringify(notification);
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
                    $('#saveNotification').prop("disabled", false);  // debounce
                    if(handleLogout(data)) {
                        $('#dashboardInfo').show().removeClass('alert-danger').addClass('alert-success').html(localise.set["n_sent"]);
                        $('#addNotificationPopup').modal("hide");
                    }
                },
                error: function(xhr, textStatus, err) {
                    removeHourglass();
                    $('#saveNotification').prop("disabled", false);  // debounce
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            alert(localise.set["msg_err_save"] + " " + xhr.responseText);  // alerts htmlencode
                        }
                    }
                }
            });

        } else {
            $('#saveNotification').prop("disabled", false);  // debounce
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

    function clearTable() {
        if ( $.fn.dataTable.isDataTable( $("#trackingTable")) && globals.gMainTable) {
            globals.gMainTable.destroy();
        }
        $("#trackingTable").empty()
    }

    function clearDrillDown() {
	    $('.dd_only,.du_only').hide();
        gDrillDownNext = undefined;
	    gDrillDownStack = [];
    }

    function drillDown() {
        var form = $('#dd_form').html();
        if(form !== "") {

            gDrillDownNext.record = gTasks.gSelectedRecord.prikey;
            if (gDrillDownNext.type === 'child_form') {
                gDrillDownNext.key_value = gTasks.gSelectedRecord._hrk;     // Drill down to child using HRK of this, the parent form
            } else {
                gDrillDownNext.key_value = gTasks.gSelectedRecord[gDrillDownNext.key];     // Drill down to parent using its HRK, this is the child form
            }

            // Set the key_value to undefined if it is zero length
	        if(gDrillDownNext.key_value && gDrillDownNext.key_value.length === 0) {
                gDrillDownNext.key_value = undefined;
            }

            gDrillDownStack.push(gDrillDownNext);

	        updateDrillDownFormList();
	        if(gDrillDownNext) {
	        	$('.dd_only').show();
	        }

            subFormChanged();

            $('.du_only').show();
        }
    }

});


