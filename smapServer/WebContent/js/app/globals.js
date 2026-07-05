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

import { addHourglass, handleLogout, htmlEncode, removeHourglass } from "./common.js";
import localise from "./localise.js";

/*
 * Quick solution to issue of legacy globals after migrating to AMD / require.js
 */
(function () {
    var globals;

    globals = window.globals = {

        // Security groups
        GROUP_ADMIN: 1,
        GROUP_ANALYST: 2,
        GROUP_ENUM: 3,
        GROUP_ORG_ADMIN : 4,
        GROUP_MANAGE: 5,
        GROUP_SECURITY: 6,
        GROUP_VIEW_DATA: 7,
        GROUP_ENTERPRISE : 8,
        GROUP_OWNER : 9,
		GROUP_VIEW_OWN_DATA : 10,
	    GROUP_MANAGE_TASKS : 11,
	    GROUP_DASHBOARD : 12,
        GROUP_LINKAGES : 13,
        GROUP_CONSOLE_ADMIN : 14,
        GROUP_MCP_ACCESS : 15,
        GROUP_DPO : 16,

        REC_LIMIT: 200,     // Page size for table views in analysis
	    MAP_REC_LIMIT: 10000,    // Max size for map views in analysis

        gProjectList: undefined,
        gRoleList: undefined,
        gCmSettings: undefined,
        gCurrentProject: 0,
        gCurrentSurvey: 0,
        gCurrentSurveyIdent: undefined,
	    gGroupSurveys: {},
	    gSubForms: {},
        gCurrentForm: 0,
        gCurrentLayer: undefined,
        gLoggedInUser: undefined,
        gEditingReportProject: undefined,   		// Set if fieldAnalysis called to edit a report
        gIsAdministrator: false,
        gIsEnum: false,
        gIsAnalyst: false,
	    gIsDashboard: false,
        gIsManage: false,
        gIsOrgAdministrator: false,
        gIsSecurityAdministrator: false,
        gIsEnterpriseAdministrator: false,
        gIsLinkFollower: false,
        gIsServerOwner: false,
        gIsConsoleAdmin: false,
        gViewData: false,
	    gManageTasks: false,
        gBillingData: false,
        gOrgBillingData: false,
        gSendTrail: 'off',
        gViewIdx: 0,
        gSelector: new Selector(),
        gOrgId: 0,
        gTimezone: undefined,
	    gEnterpriseName: undefined,
	    gSetAsTheme: undefined,
	    gNavbarColor: undefined,
	    gNavbarTextColor: undefined,

        gRegions: undefined,
        gRegion: {},

        gServerCanSendEmail: false,

        // Reports
        gEmailEnabled: false,
        gFacebookEnabled: false,
        gTwitterEnabled: false,

        // Tasks
        gCurrentUserId: undefined,
        gCurrentUserName: undefined,
        gAssignmentsLayer: undefined,
        gPendingUpdates: [],
        gCurrentTaskGroup: undefined,
	    gCurrentTaskFeature: undefined,
	    gCurrentMailout: undefined,
        gTaskList: undefined,
        gCurrentSurveyIndex: 0,
	    gCurrentInstance: undefined,
        gAlertSeen: false,
        gLastAlertTime: undefined,

        // Editor
        gExistingSurvey: false,		// Set true if modifying an existing survey
        gElementIndex: 0,			// Manage creation of unique identifier for each element (question, option) in editor
        gHasItems: false,			// Set true if there are questions or choice lists in the survey
        gNewQuestionButtonIndex: 0,	// Manage creation of unique identifier for buttons that add new questions
        gNewOptionButtonIndex: 0,
        gSId: 0,
        gLanguage: 0,
        gLanguage1: 0,
        gLanguage2: 0,
        errors: [],
        changes: [],
        gErrorPosition: 0,
        gSelProperty: 'label',
        gSelLabel: 'Question Text',
        gSelQuestionProperty: 'label',
        gSelQuestionLabel: 'Question Text',
        gSelChoiceProperty: 'label',
        gSelChoiceLabel: 'Question Text',
        gIsQuestionView: true,
        gShowingChoices: false,
        gMaxOptionList: 0,
        gLatestOptionList: undefined,	// Hack to record the last option list name added
	    gCsvFiles: undefined,
	    gSpListMaps: undefined,

        gListName: undefined,					// Choice Modal parameters, Set if started from choice list view
        gOptionList: undefined,					// The option list name applying to this set of choices
        gSelOptionId: undefined,				// Selected option index
        gFormIndex: undefined,					// Selected form index
        gItemIndex: undefined,					// Selected question index
        gSelectedFilters: undefined,
        gFilterArray: undefined,

        gSaveInProgress: false,

        // Dashboard
        gMainTable: undefined,			// Data tables
        gReports: undefined,			// reports
        gCharts: {},					// charts
	    gRecordMaps: [],                // Maps shown when editing a record
	    gRecordChangeMaps: [],          // Maps shown when viewing change history
        gMapLayersShown: false,
        gViewId: 0,						// Current survey view

	    gTraining: undefined,
	    gRefreshRate: 0,

        gMapboxDefault: undefined,		// Mapbox key

        gMetaInProgress: 0,             // Count of in-progress async meta calls

        model: new Model()

    }


    function Selector() {

        this.dataItems = new Object();
        this.surveys = new Object();
        this.surveysExtended = new Object();
        this.surveyLanguages = new Object();
        this.surveyQuestions = new Object();
        this.surveyMeta = new Object();
        this.surveyAlerts = new Object();
        this.questions = new Object();
        this.allSurveys;				// Simple list of surveys
        this.allRegions;
        this.sharedMaps;
        this.views = [];			// Simple list of views
        this.maps = {};				// map panels indexed by the panel id
        this.changed = false;
        this.SURVEY_KEY_PREFIX = "surveys";
        this.TASK_KEY = "tasks";
        this.TASK_COLOR = "#dd00aa";
        this.SURVEY_COLOR = "#00aa00";
        this.SELECTED_COLOR = "#0000aa";
        this.currentPanel = "map";

        /*
         * Get Functions
         */
        this.getAll = function () {
            return this.dataItems;
        };

        this.getItem = function (key) {
            return this.dataItems[key];
        };

        // Return all the table data available for a survey
        this.getFormItems = function (sId) {
            var tableItems = new Object();
            for (var key in this.dataItems) {
                var item = this.dataItems[key];
                if (item.table == true && item.sId == sId) {
                    tableItems[key] = item;
                }
            }
            return tableItems;
        };

        this.getSurvey = function (key) {
            return this.surveys[key];
        };

        this.getSurveyExtended = function (key) {
            return this.surveysExtended[key];
        };

        this.getSurveyQuestions = function (sId, language) {
            var langQ = this.surveyQuestions[sId];
            if (langQ) {
                return langQ[language];
            } else {
                return null;
            }
        };

        this.getSurveyMeta = function (key) {
            return this.surveyMeta[key];
        };

        this.getSurveyAlerts = function (key) {
            return this.surveyAlerts[key];
        };

        this.getSurveyLanguages = function (key) {
            return this.surveyLanguages[key];
        };

        // Returns the list of surveys on the home server
        this.getSurveyList = function () {
            return this.allSurveys;
        };

        this.getRegionList = function () {
            return this.allRegions;
        };

        this.getSharedMaps = function () {
            return this.sharedMaps;
        };

        // deprecate question meta should be replaced by all question details in the question list
        this.getQuestion = function (qId, language) {
            var langQ = this.questions[qId];
            if (langQ) {
                return langQ[language];
            } else {
                return null;
            }
        };

        /*
         * Get the question details that came with the question list
         * This approach should replace the concept of "question meta"
         */
        this.getQuestionDetails = function (sId, qId, language) {
            var qList = this.getSurveyQuestions(sId, language),
                i;

            if (qList) {
                for (i = 0; i < qList.length; i++) {
                    if (qList[i].id == qId) {
                        return qList[i];
                    }
                }
            }
            return null;
        };

        this.hasQuestion = function (key) {
            if (this.questions[key] != undefined) {
                return true;
            } else {
                return false;
            }
        };

        // Return the list of current views
        this.getViews = function () {
            return this.views;
        };

        // Return a map if it exists
        this.getMap = function (key) {
            return this.maps[key];
        };


        /*
         * Set Functions
         */
        this.addDataItem = function (key, value) {
            this.dataItems[key] = value;
            this.changed = true;
        };

        this.clearDataItems = function () {
            this.dataItems = new Object();
        };

        this.clearSurveys = function () {
            this.surveys = new Object();
            this.surveyLanguages = new Object();
            this.surveyQuestions = new Object();
            this.surveyMeta = new Object();
            this.surveyAlerts = new Object();
            this.questions = new Object();
            this.allSurveys = undefined;
            this.allRegions = undefined;
        };

        this.setSurveyList = function (list) {
            this.allSurveys = list;
            if (typeof list[0] !== "undefined") {
                this.selectedSurvey = list[0].sId;
            }
        };

        this.setSurveyLanguages = function (key, value) {
            this.surveyLanguages[key] = value;
        };

        this.setSurveyQuestions = function (sId, language, value) {
            var langQ = new Object();
            langQ[language] = value;
            this.surveyQuestions[sId] = langQ;
        };

        this.setSurveyMeta = function (key, value) {
            this.surveyMeta[key] = value;
        };

        this.setSurveyAlerts = function (key, value) {
            this.surveyAlerts[key] = value;
        };

        this.setRegionList = function (list) {
            this.allRegions = list;
        };

        this.setSharedMaps = function (list) {
            this.sharedMaps = list;
        };

        this.addSurvey = function (key, value) {
            this.surveys[key] = value;
        };

        this.addSurveyExtended = function (key, value) {
            this.surveysExtended[key] = value;
        };

        this.setSelectedSurvey = function (survey) {
            this.selectedSurvey = survey;
        };

        this.setSelectedQuestion = function (id) {
            this.selectedQuestion = id;
        };

        this.addQuestion = function (qId, language, value) {
            var langQ = this.questions[qId];
            if (!langQ) {
                this.questions[qId] = new Object();
                langQ = this.questions[qId];
            }
            langQ[language] = value;
        };

        // Set the list of views to the passed in array
        this.setViews = function (list) {
            this.views = list;
        };

        // Set the passed in map into the maps object indexed by key
        this.setMap = function (key, value) {
            this.maps[key] = value;
        };

    }

    /*
     * Model for Survey editing
     */
    function Model() {

        this.survey = undefined;
        this.translateChanges = [];
        this.currentTranslateChange = 0;
        this.savedSettings = undefined;
        this.forceSettingsChange = false;

	    // A list of valid appearances for each question type
	    this.qAppearances = {
		    'begin group': ['page', 'w', 'no-collapse'],
            'begin repeat': ['extendable', 'no-collapse'],
		    string: ['numbers', 'thousands-sep', 'w', 'url'],
		    note: ['w'],
            select1: ['select1_type', 'search', 'likert', 'no-buttons', 'w'],
            select: ['select_type', 'search', 'no-buttons', 'w'],
            image: ['image_type', 'selfie', 'new', 'w'],
            int:['thousands-sep', 'w'],
		    geopoint:['placement-map', 'w'],
		    audio:['w', 'new'],
		    video:['selfie', 'w', 'new'],
		    barcode:['read_nfc', 'w'],
		    date:['date_type', 'w'],
		    dateTime:['date_type', 'no-calendar', 'w'],
		    time:['w'],
            decimal:['thousands-sep', 'bearing', 'w'],
		    geotrace:['placement-map', 'w'],
		    geoshape:['placement-map', 'w'],
		    acknowledge:['w'],
		    range:['w', 'rating', 'vertical', 'picker'],
		    file:['w'],
		    rank:['w'],
            geocompound:['w', 'placement-map']
	    };

	    this.appearanceDetails = {
		    'page': {
			    field: 'a_page',
			    type: 'select',
                rex: 'field-list|table-list',
                valIsAppearance: true,
			    value_offset: 0,
                undef_value: ''
		    },
		    'image_type': {
			    field: 'a_image_type',
			    type: 'select',
			    rex: 'annotate|draw|signature',
			    valIsAppearance: true,
			    value_offset: 0,
			    undef_value: ''
		    },
		    'select1_type': {
			    field: 'a_select1_type',
			    type: 'form',
			    rex: 'minimal|quick$|autocomplete|columns|quickcompact|image-map|compact'
		    },
		    'select_type': {
			    field: 'a_select_type',
			    type: 'form',
			    rex: 'minimal|autocomplete|columns|image-map|compact|autocomplete-minimal'
		    },
		    'date_type': {
			    field: 'a_date_type',
			    type: 'select',
			    rex: 'no-calendar|month-year|year|coptic|ethiopian|islamic|myanmar|persian|bikram-sambat',
			    valIsAppearance: true,
			    value_offset: 0,
			    undef_value: ''
		    },
		    'no-calendar': {
			    field: 'a_no_calendar',
			    type: 'boolean',
			    rex: 'no-calendar'
		    },
		    'placement-map': {
			    field: 'a_placement-map',
			    type: 'boolean',
			    rex: 'placement-map'
		    },
		    'search': {
			    field: 'a_search',
			    type: 'form',
			    rex: 'search\\(|lookup_choices\\('
		    },
		    'rating': {
			    field: 'a_rating',
			    type: 'boolean',
			    rex: 'rating'
		    },
		    'likert': {
			    field: 'a_likert',
			    type: 'boolean',
			    rex: 'likert'
		    },
		    'no-buttons': {
			    field: 'a_no_buttons',
			    type: 'boolean',
			    rex: 'no-buttons'
		    },
		    'selfie': {
			    field: 'a_selfie',
			    type: 'boolean',
			    rex: 'selfie'
		    },
		    'new': {
			    field: 'a_new',
			    type: 'boolean',
			    rex: 'new'
		    },
		    'read_nfc': {
			    field: 'a_read_nfc',
			    type: 'boolean',
			    rex: 'read_nfc'
		    },
		    'vertical': {
			    field: 'a_vertical',
			    type: 'boolean',
			    rex: 'vertical'
		    },
		    'picker': {
			    field: 'a_picker',
			    type: 'boolean',
			    rex: 'picker'
		    },
		    'bearing': {
			    field: 'a_bearing',
			    type: 'boolean',
			    rex: 'bearing'
		    },
            'thousands-sep': {
                field: 'a_sep',
                type: 'boolean',
                rex: 'thousands-sep'
            },
		    'no-collapse': {
			    field: 'a_no_collapse',
			    type: 'boolean',
			    rex: 'no-collapse',
                value_offset: 0
		    },
            'extendable': {
                field: 'a_extendable',
                type: 'boolean',
                rex: 'extendable'
            },
		    'numbers': {
			    field: 'a_numbers',
			    type: 'boolean',
			    rex: 'numbers'
		    },
		    'url': {
			    field: 'a_url',
			    type: 'boolean',
			    rex: 'url'
		    },
		    'w': {
			    field: 'a_width',
			    type: 'select',
                rex: 'w10|w[1-9]',
                value_offset: 1,
                undef_value: ''
		    }
	    };

        // A list of valid parameters for each question type
        this.qParams = {
            string: ['rows', 'auto_annotate', 'source', 'from_lang', 'to_lang', 'medical', 'med_type'],
	        calculate: ['auto_annotate', 'source', 'from_lang', 'to_lang', 'medical', 'med_type'],
	        barcode: ['auto'],
            image: ['max-pixels', 'auto'],
	        video: ['auto'],
	        audio: ['auto', 'quality'],
            range: ['start', 'end', 'step'],
            select: ['randomize'],
            select1: ['randomize'],
            rank: ['randomize'],
            parent_form: ['form_identifier', 'key_question', 'auto'],
	        child_form: ['form_identifier', 'key_question', 'auto'],
	        geopoint: ['auto'],
            geotrace: ['geotextlength'],
            geoshape: ['geotextlength'],
            geocompound: ['geotextlength'],
            'begin repeat':['ref', 'instance_order', 'instance_count', 'key_policy'],
	        chart: ['chart_type', 'stacked', 'normalized']
        };

        this.paramDetails = {
	        rows: {
	            field: 'p_rows',
                type: 'integer'
            },
            geotextlength: {
                field: 'p_geotextlength',
                type: 'integer'
            },
            'max-pixels': {
	            field: 'p_max_pixels',
                type: 'integer'
            },
            start: {
	            field: 'p_start',
                type: 'number'
            },
	        end: {
		        field: 'p_end',
		        type: 'number'
	        },
	        step: {
		        field: 'p_step',
		        type: 'number'
	        },
	        randomize: {
		        field: 'p_randomize',
		        type: 'boolean'
	        },
	        auto: {
		        field: 'p_auto',
		        type: 'boolean'
	        },
	        quality: {
		        field: 'p_quality',
		        type: 'select'
	        },
	        auto_annotate: {
		        field: 'p_auto_annotate',
		        type: 'boolean'
	        },
	        medical: {
		        field: 'p_medical',
		        type: 'boolean'
	        },
	        med_type: {
		        field: 'p_med_type',
		        type: 'select'
	        },
	        source: {
		        field: 'p_source',
		        type: 'select'
	        },
	        from_lang: {
		        field: 'from_lang',
		        type: 'select'
	        },
	        to_lang: {
		        field: 'to_lang',
		        type: 'select'
	        },
	        form_identifier: {
		        field: 'p_form_identifier',
		        type: 'select'
	        },
	        key_question: {
		        field: 'p_key_question',
                type: 'select'
            },
	        ref: {
		        field: 'p_ref',
		        type: 'select'
	        },
	        instance_order: {
		        field: 'p_instance_order',
		        type: 'select'
	        },
	        instance_count: {
		        field: 'p_instance_count',
		        type: 'integer'
	        },
	        key_policy: {
		        field: 'p_key_policy',
		        type: 'select'
	        },
	        chart_type: {
		        field: 'p_chart_type',
		        type: 'select'
	        },
	        stacked: {
		        field: 'p_stacked',
		        type: 'boolean'
	        },
	        normalized: {
		        field: 'p_normalized',
		        type: 'boolean'
	        },
	        _other: {
		        field: 'p_other',
		        type: 'text'
	        }
        };

        this.qTypes = [{
	            name: "Text",
	            trans: "rev_text",
	            type: "string",
	            icon: "font",
	            canSelect: true,
	            visible: true,
		        source: "user",
		        compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Note",
                type: "note",
                trans: "c_note",
                icon: "pencil-alt",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Select One",
                type: "select1",
                trans: "ed_s1",
                image: "/images/select1_64.png",
                canSelect: true,
                visible: true,
				source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Select Multiple",
                type: "select",
                trans: "ed_s",
                image: "/images/select_64.png",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation", "phone"]
            },
            {
                name: "Form",
                type: "begin repeat",
                trans: "c_rep_type",
                icon: "redo-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Group",
                type: "begin group",
                trans: "sr_g",
                icon: "folder-open",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Image",
                type: "image",
                trans: "ed_image",
                icon: "camera",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Integer",
                type: "int",
                trans: "ed_int",
                text: "#",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["pdf_field"]
            },
            {
                name: "Phone Number",
                type: "phone",
                trans: "c_phone",
                icon: "phone",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "conversation"]
            },
            {
                name: "Conversation",
                type: "conversation",
                trans: "ed_mat_c",
                icon: "sms",
                canSelect: true,
                visible: true,
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field", "phone"]
            },
            {
                name: "GPS Point",
                type: "geopoint",
                trans: "ed_gps",
                icon: "map-marker-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Calculation",
                type: "calculate",
                trans: "ed_calc",
                calculation: true,
                image: "/images/calc_64.png",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Audio",
                type: "audio",
                trans: "ed_audio",
                icon: "volume-up",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Video",
                type: "video",
                trans: "ed_video",
                icon: "video",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Barcode",
                type: "barcode",
                trans: "ed_bc",
                icon: "barcode",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Date",
                type: "date",
                trans: "c_date",
                icon: "calendar-alt",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Date and Time",
                type: "dateTime",
                trans: "ed_dt",
                icon: "calendar-alt, clock",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Time",
                type: "time",
                trans: "ed_t",
                icon: "clock",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Decimal",
                type: "decimal",
                trans: "ed_dec",
                text: "#.#",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "GPS Line",
                type: "geotrace",
                trans: "ed_gps_line",
                image: "/images/linestring_64.png",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "GPS Area",
                type: "geoshape",
                trans: "ed_gps_area",
                image: "/images/polygon_64.png",
                canSelect: true,
                visible: true,
                source: "user"
            },
            {
                name: "Acknowledge",
                type: "acknowledge",
                trans: "ed_ack",
                text: "OK",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Range",
                type: "range",
                trans: "ed_range",
                icon: "arrows-alt-h",
                text: "Range",
                canSelect: true,
                visible: true,
                source: "user",
	            compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Chart",
                type: "chart",
                trans: "c_chart",
                icon: "chart-bar",
                text: "Chart",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
	        {
		        name: "Parent Form",
		        type: "parent_form",
		        trans: "c_parent_form",
		        icon: "file-upload",
		        text: "Parent Form",
		        canSelect: true,
		        visible: true,
		        source: "user"
	        },
	        {
		        name: "Child Form",
		        type: "child_form",
		        trans: "c_child_form",
		        icon: "file-download",
		        text: "Child Form",
		        canSelect: true,
		        visible: true,
		        source: "user"
	        },
            {
                name: "File",
                type: "file",
                trans: "c_file",
                icon: "file",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
            {
                name: "Rank",
                type: "rank",
                trans: "c_rank",
                icon: "sort-amount-down-alt",
                canSelect: true,
                visible: true,
                source: "user",
                compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
            },
	        {
		        name: "Server Calculation",
		        type: "server_calculate",
		        trans: "ed_s_calc",
		        calculation: true,
		        image: "/images/server_calc_64.png",
		        canSelect: true,
		        visible: true,
		        source: "user",
		        compatTypes: ["string", "select1", "select", "calculate", "rank", "calculate_server", "note", "pdf_field"]
	        },
            {
                name: "Compound Pdf Image",
                type: "pdf_field",
                trans: "ed_ci",
                calculation: false,
                icon: "pallet",
                canSelect: true,
                visible: false,
            },
            {
                name: "Compound map",
                type: "geocompound",
                trans: "ed_cm",
                calculation: false,
                icon: "map-pin",
                canSelect: true,
                visible: false,
                compatTypes: ["geotrace"]
            },
            {
                name: "Unknown Type",
                icon: "ellipses-h",
                canSelect: false
            }
        ];

        // Set the survey model
        this.setSurveyData = function (data) {
            this.survey = data;
            this.survey.forms_orig = $.extend(true, {}, data.forms);
            this.survey.optionLists_orig = $.extend(true, {}, data.optionLists);
        }

        // Save the settings for the survey
        this.save_settings = function () {

            // Build a list of the settings that actually changed (old -> new) before the model is updated
            var oldSettings = {};
            try {
                oldSettings = JSON.parse(this.savedSettings);
            } catch (e) {
                oldSettings = {};
            }
            var newSettings = this.getSettings(true);     // Also updates the model
            var changeList = this.buildSettingsChangeList(oldSettings, newSettings);

            var settings = JSON.stringify(newSettings);

            addHourglass();
            $.ajax({
                type: "POST",
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                data: { settings: settings, changeList: JSON.stringify(changeList) },
                url: "/surveyKPI/surveys/save_settings/" + globals.gCurrentSurvey,
                success: function (data, status) {
                    removeHourglass();
                    if(handleLogout(data)) {
                        globals.model.savedSettings = settings;
                        globals.model.survey.pdfTemplateName = data;
                        globals.model.forceSettingsChange = false;
                        $('#save_settings').prop("disabled", true);

                        $('.formName').text(globals.model.survey.displayName);
                        $('#m_media').prop('href', '/app/resources.html?survey=true&survey_name=' + globals.model.survey.displayName);

                        window.bsModalHide('#settingsModal');
                    }
                },
                error: function (xhr, textStatus, err) {
                    removeHourglass();
                    if(handleLogout(xhr.responseText)) {
                        if (xhr.readyState == 0 || xhr.status == 0) {
                            return;  // Not an error
                        } else {
                            bootbox.alert("Error saving settings. " + htmlEncode(xhr.responseText));
                        }
                    }
                }
            });

        };

        // Definition of every survey setting: model key, its localisation key and value type.
        // Used to diff the settings dialog so the change log lists only what changed.
        this.settingsFields = [
            { key: "displayName",          label: "c_form",        type: "text" },
            { key: "instanceNameDefn",     label: "ed_in",         type: "text" },
            { key: "surveyClass",          label: "c_style",       type: "text" },
            { key: "p_id",                 label: "c_project",     type: "project" },
            { key: "def_lang",             label: "ed_dl",         type: "text" },
            { key: "default_logo",         label: "ed_drl",        type: "text" },
            { key: "task_file",            label: "ed_ld",         type: "bool" },
            { key: "timing_data",          label: "ed_td",         type: "bool" },
            { key: "audit_location_data",  label: "ed_rl",         type: "bool" },
            { key: "track_changes",        label: "ed_rc",         type: "bool" },
            { key: "hideOnDevice",         label: "ed_hod",        type: "bool" },
            { key: "searchLocalData",      label: "ed_sld",        type: "bool" },
            { key: "dataSurvey",           label: "ed_ds",         type: "bool" },
            { key: "oversightSurvey",      label: "ed_os",         type: "bool" },
            { key: "myReferenceData",      label: "ed_mr",         type: "bool" },
            { key: "readOnlySurvey",       label: "ed_ro",         type: "bool" },
            { key: "exclude_empty",        label: "ed_ee",         type: "bool" },
            { key: "compress_pdf",         label: "ed_cpdf",       type: "bool" },
            { key: "turnstile",            label: "ed_turnstile",  type: "bool" },
            { key: "showFormIndex",        label: "ed_sfi",        type: "bool" },
            { key: "maxReferenceRecords",  label: "ed_mrr",        type: "number" }
        ];

        // Format a single setting value for display in the change log
        this.formatSettingValue = function (val, type) {
            if (type === "bool") {
                return val ? localise.set["c_yes"] : localise.set["c_no"];
            } else if (type === "project") {
                var name = $('#set_project_name option[value="' + val + '"]').text();
                return (name && name.length > 0) ? name : ("" + val);
            } else {    // text
                if (val === undefined || val === null || ("" + val).trim().length === 0 || val === "none") {
                    return localise.set["c_none"];
                }
                return "" + val;
            }
        };

        // Compare old and new settings, returning an array of { label, oldVal, newVal } for changed fields only
        this.buildSettingsChangeList = function (oldSettings, newSettings) {
            var changes = [],
                i,
                field,
                oldRaw,
                newRaw,
                differs;

            for (i = 0; i < this.settingsFields.length; i++) {
                field = this.settingsFields[i];
                oldRaw = oldSettings[field.key];
                newRaw = newSettings[field.key];

                if (field.type === "bool") {
                    differs = (!!oldRaw !== !!newRaw);
                } else if (field.type === "project") {
                    differs = (oldRaw !== newRaw);
                } else {    // text - treat undefined/null as empty string
                    differs = ((oldRaw === undefined || oldRaw === null ? "" : "" + oldRaw) !==
                               (newRaw === undefined || newRaw === null ? "" : "" + newRaw));
                }

                if (differs) {
                    changes.push({
                        label: localise.set[field.label],
                        oldVal: this.formatSettingValue(oldRaw, field.type),
                        newVal: this.formatSettingValue(newRaw, field.type)
                    });
                }
            }

            return changes;
        };

        // Modify a label for a question or an option called from translate where multiple questions can be modified at once if the text is the same
        this.modLabel = function (language, changedQ, newVal, element, prop) {

            var labelMod = {
                changeType: prop,
                action: "update",
                items: []
            }

            var i,
                label = {},
                item,
                item_orig,
                qname,
                translation;


            for (i = 0; i < changedQ.length; i++) {
                translation = {
                    changeType: prop,
                    action: "update",
                    source: "editor"

                };

                // For questions
                if (typeof changedQ[i].form !== "undefined") {

                    label.formIndex = changedQ[i].form;
                    label.itemIndex = changedQ[i].question;
                    item = this.survey.forms[label.formIndex].questions[label.itemIndex];
                    item_orig = this.survey.forms_orig[label.formIndex].questions[label.itemIndex];

                    label.type = "question";
                    label.name = item.name;
                    label.prop = "label";
                    label.qId = item.id;

	                if(changedQ[i].constraint_msg) {
		                label.propType = "constraint_msg";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].required_msg) {
		                label.propType = "required_msg";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].guidance_hint) {
		                label.propType = "guidance_hint";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else if(changedQ[i].hint) {
		                label.propType = "hint";
		                label.oldVal = item_orig.labels[language][label.propType];
	                } else {
		                label.propType = "text";
		                label.oldVal = item_orig.labels[language][element];
	                }

                } else {
	                // For options
                    label.optionList = changedQ[i].optionList;
                    label.optionIdx = changedQ[i].option;

                    item = this.survey.optionLists[label.optionList].options[label.optionIdx];
                    item_orig = this.survey.optionLists_orig[label.optionList].options[label.optionIdx];

                    label.type = "option";
                    label.name = item.value;
	                label.propType = "text";
	                label.oldVal = item_orig.labels[language][element];
                }

                label.newVal = newVal;

                label.element = element;
                label.languageName = language;
                label.allLanguages = false;

                label.languageName = this.survey.languages[language].name;			// For logging the event
                var form = this.survey.forms[label.formIdx];

                if (item.text_id) {
                    label.key = item.text_id;
                } else {
                    // Create reference for this new Label
                    if (typeof changedQ[i].form !== "undefined") {
                        label.key = "/" + form.name + "/" + item.name + ":label";	// TODO hint
                    } else {
                        label.key = "/" + form.name + "/" + qname + "/" + item.name + ":label";
                    }
                }

                translation.property = label;

                labelMod.items.push(translation);
            }

            this.removeDuplicateTranslateChange(this.translateChanges, labelMod);
            if (labelMod.items[0].property.newVal !== labelMod.items[0].property.oldVal) {		// Add if the value has changed
                this.currentTranslateChange = this.translateChanges.push(labelMod) - 1;
                //this.doChange();				// Apply the current change
            }

            $('.m_save_survey').find('.badge').html(this.translateChanges.length);
            if (this.translateChanges.length > 0) {
                $('.m_save_survey').removeClass('disabled').prop('disabled', false);
	            $('#m_auto_translate').closest('li').addClass("disabled").prop("disabled", true);
            } else {
                $('.m_save_survey').addClass('disabled').prop('disabled', true);
	            $('#m_auto_translate').closest('li').removeClass("disabled").prop("disabled", false);
            }
        }

        // Clear the change list
        this.clearChanges = function () {
            this.translateChanges = [];
            $('.m_save_survey').find('.badge').html(this.translateChanges.length);
            if (this.translateChanges.length > 0) {
                $('.m_save_survey').removeClass('disabled').prop('disabled', false);
            } else {
                $('.m_save_survey').addClass('disabled').prop('disabled', true);
	            $('#m_auto_translate').closest('li').removeClass("disabled").prop("disabled", false);
            }
        }

        /*
         * If the label has been modified before then remove it from the change list
         */
        this.removeDuplicateTranslateChange = function () {
            // TODO
        }

        /*
         * Functions for managing settings
         */
        this.getSettings = function (save) {
            var current = this.createSettingsObject(
                $('#set_survey_name').val(),
                $('#set_instance_name').val(),
                $('#set_style').val(),
                $('#set_project_name option:selected').val(),
                $('#set_default_language option:selected').text(),
                $('#task_file').prop('checked'),
                $('#timing_data').prop('checked'),
	            $('#audit_location_data').prop('checked'),
	            $('#track_changes').prop('checked'),
	            $('#hide_on_device').prop('checked'),
	            $('#search_local_data').prop('checked'),
	            $('#data_survey').prop('checked'),
	            $('#oversight_survey').prop('checked'),
                $('#read_only_survey').prop('checked'),
                $('#my_reference_data').prop('checked'),
                $('#exclude_empty').prop('checked'),
                $('#compress_pdf').prop('checked'),
                globals.model.survey.hrk,
                globals.model.survey.key_policy,
	            $('#default_logo').val(),
                $('#turnstile').prop('checked'),
                $('#showFormIndex').prop('checked'),
                parseInt($('#maxReferenceRecords').val(), 10) || 0
            );

            // Update the model to reflect the current values
            if (save) {
                this.survey.displayName = current.displayName;
                this.survey.instanceNameDefn = current.instanceNameDefn;
                this.survey.surveyClass = current.surveyClass;
                this.survey.p_id = current.p_id;
                this.survey.def_lang = current.def_lang;
                this.survey.task_file = current.task_file;
                this.survey.timing_data = current.timing_data;
	            this.survey.audit_location_data = current.audit_location_data;
	            this.survey.track_changes = current.track_changes;
	            this.survey.hideOnDevice = current.hideOnDevice;
	            this.survey.searchLocalData = current.searchLocalData;
	            this.survey.dataSurvey = current.dataSurvey;
	            this.survey.oversightSurvey = current.oversightSurvey;
                this.survey.myReferenceData = current.myReferenceData;
                this.survey.readOnlySurvey = current.readOnlySurvey;
                this.survey.exclude_empty = current.exclude_empty;
                this.survey.compress_pdf = current.compress_pdf;
	            this.survey.default_logo = current.default_logo;
                this.survey.turnstile = current.turnstile;
                this.survey.showFormIndex = current.showFormIndex;
                this.survey.maxReferenceRecords = current.maxReferenceRecords;
            }

            return current;
        }

        this.setSettings = function () {
            this.savedSettings = JSON.stringify(
                this.createSettingsObject(
                    this.survey.displayName,
                    this.survey.instanceNameDefn,
                    this.survey.surveyClass,
                    this.survey.p_id,
                    this.survey.def_lang,
                    this.survey.task_file,
                    this.survey.timing_data,
	                this.survey.audit_location_data,
	                this.survey.track_changes,
                    this.survey.hideOnDevice,
	                this.survey.searchLocalData,
	                this.survey.dataSurvey,
	                this.survey.oversightSurvey,
                    this.survey.myReferenceData,
                    this.survey.readOnlySurvey,
                    this.survey.exclude_empty,
                    this.survey.compress_pdf,
                    this.survey.hrk,
                    this.survey.key_policy,
	                this.survey.default_logo,
                    this.survey.turnstile,
                    this.survey.showFormIndex,
                    this.survey.maxReferenceRecords
                ));

            this.forceSettingsChange = false;
        }

        this.createSettingsObject = function (displayName, instanceNameDefn,
                                              surveyClass,
                                              p_id,
                                              def_lang,
                                              task_file,
                                              timing_data,
                                              audit_location_data,
                                              track_changes,
                                              hideOnDevice,
                                              searchLocalData,
                                              dataSurvey,
                                              oversightSurvey,
                                              readOnlySurvey,
                                              myReferenceData,
                                              exclude_empty,
                                              compress_pdf,
                                              hrk,
                                              key_policy,
                                              default_logo,
                                              turnstile,
                                              showFormIndex,
                                              maxReferenceRecords) {

            var projId;
            if (typeof p_id === "string") {
                projId = parseInt(p_id);
            } else {
                projId = p_id;
            }
            return {
                displayName: displayName,
                instanceNameDefn: instanceNameDefn,
                surveyClass: surveyClass,
                p_id: projId,
                def_lang: def_lang,
                task_file: task_file,
                timing_data: timing_data,
	            audit_location_data: audit_location_data,
	            track_changes: track_changes,
                hideOnDevice: hideOnDevice,
                searchLocalData: searchLocalData,
	            dataSurvey: dataSurvey,
	            oversightSurvey: oversightSurvey,
                myReferenceData: myReferenceData,
                readOnlySurvey: readOnlySurvey,
                exclude_empty: exclude_empty,
                compress_pdf: compress_pdf,
                hrk: hrk,
                key_policy: key_policy,
	            default_logo: default_logo,
                turnstile: turnstile,
                showFormIndex: showFormIndex,
                maxReferenceRecords: maxReferenceRecords
            }
        }

        this.settingsChange = function () {
            var current = globals.model.getSettings(false);

            if (JSON.stringify(current) !== globals.model.savedSettings || globals.model.forceSettingsChange) {
                $('#save_settings').prop("disabled", false);
            } else {
                $('#save_settings').prop("disabled", true);
            }
        }

    }

    return globals;
})();

export default window.globals;
