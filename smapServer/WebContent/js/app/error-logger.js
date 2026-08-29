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
		}).catch(function () {
			// A failed report must not itself become an unhandled rejection
		}).then(function () {
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

	/*
	 * Rejection reasons are often not Errors - jqXHR objects, DOM events or
	 * plain objects all used to be logged as "[object Object]" which said
	 * nothing about the cause.  Describe whatever we are given.
	 */
	function safeString(value) {
		try {
			return String(value);
		} catch (e) {
			return "[unprintable]";   // e.g. an object with a null prototype
		}
	}

	function describeReason(reason) {

		if (reason === null || typeof reason === "undefined") {
			return { message: safeString(reason), stack: "" };
		}

		// Errors, including cross realm ones where instanceof fails
		if (typeof reason.message === "string" && typeof reason.stack === "string") {
			return { message: (reason.name ? reason.name + ": " : "") + reason.message,
				stack: reason.stack };
		}

		// jQuery jqXHR / XMLHttpRequest
		if (typeof reason.readyState !== "undefined" && typeof reason.status !== "undefined") {
			var body = "";
			try {
				body = (reason.responseText || "").substring(0, 200);
			} catch (e) { /* responseText not always readable */ }
			return { message: "ajax " + reason.status + " " + (reason.statusText || "") +
					(body ? " " + body : ""),
				stack: "" };
		}

		if (typeof Event !== "undefined" && reason instanceof Event) {
			return { message: "event " + reason.type +
					(reason.target && reason.target.src ? " " + reason.target.src : ""),
				stack: "" };
		}

		if (typeof reason === "object") {
			var text;
			try {
				var seen = [];
				text = JSON.stringify(reason, function (key, value) {
					if (value && typeof value === "object") {
						if (seen.indexOf(value) > -1) {
							return "[circular]";
						}
						seen.push(value);
					}
					return value;
				});
			} catch (e) {
				text = "";
			}
			var name = (reason.constructor && reason.constructor.name) || "Object";
			return { message: name + " " + (text && text !== "{}" ? text.substring(0, 500) : safeString(reason)),
				stack: typeof reason.stack === "string" ? reason.stack : "" };
		}

		return { message: safeString(reason), stack: "" };
	}

	window.addEventListener("unhandledrejection", function (event) {
		var described;
		try {
			described = describeReason(event.reason);
		} catch (e) {
			described = { message: "unable to describe rejection reason", stack: "" };
		}
		postError({
			level: "error",
			message: "Unhandled promise rejection: " + described.message,
			source: "",
			line: 0,
			col: 0,
			stack: described.stack,
			url: window.location.href,
			userAgent: navigator.userAgent,
			ts: new Date().toISOString()
		});
	});

}());
