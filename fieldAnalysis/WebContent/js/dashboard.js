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

import "../../../smapServer/WebContent/js/app/localise";
import "../../../smapServer/WebContent/js/app/globals";
import "../../../smapServer/WebContent/js/app/common";
import "../../../smapServer/WebContent/js/app/data";
import "./libs/pace-shim";
import "./libs/jqplot-main-shim";
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
import "./libs/crf-shim";

const moment = window.moment;
const localise = window.localise;
const globals = window.globals;
const initialiseDialogs = window.initialiseDialogs;
window.globals = window.globals || globals;

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
	window.globals = window.globals || globals;

	import(/* webpackMode: "eager" */ "./dashboard_main").then(function () {
		setCustomDashboard();
		window.localise = localise;
		initialiseDialogs();
		localise.setlang();
	});
});
