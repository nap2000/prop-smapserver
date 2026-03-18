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
 * Global error handler — catches runtime JS errors and unhandled promise
 * rejections and POSTs them to /surveyKPI/log.
 * Intended to surface issues from the AMD→ESM migration such as missing
 * functions or unresolved imports.
 */

(function () {

	var _posting = false;  // guard against recursive errors from the POST itself

	function postError(payload) {
		if (_posting) return;
		_posting = true;
		fetch("/surveyKPI/clientlog", {
			method: "POST",
			headers: { "Content-Type": "application/json",
				"X-Requested-With": "XMLHttpRequest"},
			body: JSON.stringify(payload)
		}).finally(function () {
			_posting = false;
		});
	}

	window.onerror = function (message, source, lineno, colno, error) {
		postError({
			level: "error",
			message: message || "Unknown error",
			source: source || "",
			line: lineno || 0,
			col: colno || 0,
			stack: (error && error.stack) ? error.stack : "",
			url: window.location.href,
			userAgent: navigator.userAgent,
			ts: new Date().toISOString()
		});
		return false;  // allow default browser handling to continue
	};

	window.addEventListener("unhandledrejection", function (event) {
		var reason = event.reason;
		var message = (reason instanceof Error) ? reason.message : String(reason);
		var stack = (reason instanceof Error) ? (reason.stack || "") : "";
		postError({
			level: "error",
			message: "Unhandled promise rejection: " + message,
			source: "",
			line: 0,
			col: 0,
			stack: stack,
			url: window.location.href,
			userAgent: navigator.userAgent,
			ts: new Date().toISOString()
		});
	});

}());
