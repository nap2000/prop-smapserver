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
 * Quick solution to issue of legacy globals after migrating to AMD / require.js
 */
const globals = {

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
        
        model: typeof Model !== "undefined" ? new Model() : undefined

    }


    function Selector() {

        this.dataItems = {};
        this.surveys = {};
        this.surveysExtended = {};
        this.surveyLanguages = {};
        this.surveyQuestions = {};
        this.surveyMeta = {};
        this.surveyAlerts = {};
        this.questions = {};
        this.allSurveys = undefined;			// Simple list of surveys
        this.allRegions = undefined;
        this.sharedMaps = undefined;
        this.views = [];			// Simple list of views
        this.maps = {};				// map panels indexed by the panel id
        this.changed = false;
        this.SURVEY_KEY_PREFIX = "surveys";
        this.TASK_KEY = "tasks";
        this.TASK_COLOR = "#dd00aa";
        this.SURVEY_COLOR = "#00aa00";
        this.SELECTED_COLOR = "#0000aa";
        this.currentPanel = "map";

        this.getAll = function () {
            return this.dataItems;
        };

        this.getItem = function (key) {
            return this.dataItems[key];
        };

        this.addDataItem = function (key, data) {
            this.dataItems[key] = data;
        };

        this.clearDataItems = function () {
            this.dataItems = {};
        };

        this.addSurvey = function (sId, data) {
            this.surveys[sId] = data;
        };

        this.addSurveyExtended = function (sId, data) {
            this.surveysExtended[sId] = data;
        };

        this.getSurvey = function (sId) {
            return this.surveysExtended[sId] || this.surveys[sId];
        };

        this.clearSurveys = function () {
            this.surveys = {};
            this.surveysExtended = {};
            this.surveyLanguages = {};
            this.surveyQuestions = {};
            this.surveyMeta = {};
            this.surveyAlerts = {};
            this.allSurveys = undefined;
        };

        this.setSurveyList = function (data) {
            this.allSurveys = data;
        };

        this.getSurveyList = function () {
            return this.allSurveys;
        };

        this.setSurveyLanguages = function (sId, data) {
            this.surveyLanguages[sId] = data;
        };

        this.getSurveyLanguages = function (sId) {
            return this.surveyLanguages[sId];
        };

        this.setSurveyQuestions = function (sId, language, data) {
            if (!this.surveyQuestions[sId]) {
                this.surveyQuestions[sId] = {};
            }
            this.surveyQuestions[sId][language] = data;
        };

        this.getSurveyQuestions = function (sId, language) {
            if (!this.surveyQuestions[sId]) {
                return undefined;
            }
            if (typeof language === "undefined") {
                return this.surveyQuestions[sId];
            }
            return this.surveyQuestions[sId][language];
        };

        this.getQuestion = function (qId, language) {
            return this.getQuestionDetails(globals.gCurrentSurvey, qId, language);
        };

        this.getQuestionDetails = function (sId, qId, language) {
            var questions = this.getSurveyQuestions(sId, language);
            if (!questions) {
                return undefined;
            }
            for (var i = 0; i < questions.length; i++) {
                if (questions[i].id == qId) {
                    return questions[i];
                }
            }
            return undefined;
        };

        this.setSurveyMeta = function (sId, data) {
            this.surveyMeta[sId] = data;
        };

        this.getSurveyMeta = function (sId) {
            return this.surveyMeta[sId];
        };

        this.setSurveyAlerts = function (sId, data) {
            this.surveyAlerts[sId] = data;
        };

        this.getSurveyAlerts = function (sId) {
            return this.surveyAlerts[sId];
        };

        this.setRegionList = function (data) {
            this.allRegions = data;
        };

        this.getRegionList = function () {
            return this.allRegions;
        };

        this.setSharedMaps = function (data) {
            this.sharedMaps = data;
        };

        this.getSharedMaps = function () {
            return this.sharedMaps;
        };

        this.setViews = function (data) {
            this.views = data || [];
        };

        this.getViews = function () {
            return this.views;
        };

        this.setMap = function (idx, map) {
            this.maps[idx] = map;
        };

        this.getMap = function (idx) {
            return this.maps[idx];
        };

    }

    export default globals;
