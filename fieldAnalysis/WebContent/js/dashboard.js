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

"use strict";

import localise from "localise";
import globals from "globals";
import { initialiseDialogs } from "./app/script";
import { setGraph } from "./app/graph-functions";
import { newSetGraphQuestion, setGraphSurvey } from "./app/graph-view2";
import { setMap } from "./app/map-ol";
import { setMediaQuestion, setMediaSurvey } from "./app/media-view";
import { setTableQuestion, setTableSurvey } from "./app/table-view";
import "pace";
import "jqplot/jquery.jqplot.min";
import "main/jqplot_main";
import "jqplot/plugins/jqplot.highlighter";
import "jqplot/plugins/jqplot.cursor";
import "jqplot/plugins/jqplot.dateAxisRenderer";
import "jqplot/plugins/jqplot.barRenderer";
import "jqplot/plugins/jqplot.categoryAxisRenderer";
import "jqplot/plugins/jqplot.canvasAxisLabelRenderer";
import "jqplot/plugins/jqplot.canvasAxisTickRenderer";
import "jqplot/plugins/jqplot.canvasTextRenderer";
import "jqplot/plugins/jqplot.enhancedLegendRenderer";
import "./app/jqplot_image";
import "./app/map-functions";
import "./app/map-ol";
import "./app/graph-functions";
import "./app/graph-view2";
import "./app/table-functions";
import "./app/table-view";
import "./app/media-view";
import "./app/survey_control";
import "./app/plugins";
import "./app/script";
import "./app/panels";

const moment = window.moment;

var gUserLocale = navigator.language;
if (typeof localStorage !== "undefined") {
	try {
		gUserLocale = localStorage.getItem('user_locale') || navigator.language;
	} catch (error) {
		gUserLocale = navigator.language;
	}
}
window.gUserLocale = gUserLocale;

localise.initLocale(gUserLocale).then(function () {
	window.moment = window.moment || moment;

	import(/* webpackMode: "eager" */ "./dashboard_main").then(function () {
		setCustomDashboard();
		window.localise = localise;
		initialiseDialogs();
		localise.setlang();
	});
});

