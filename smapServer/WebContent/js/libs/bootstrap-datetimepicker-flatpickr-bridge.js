import "./flatpickr.min.js";

(function initDatetimepickerBridge() {
	if (!window.$ || !window.flatpickr) {
		return;
	}

	var $ = window.$;

	function toFlatpickrFormat(format) {
		if (!format) {
			return "Y-m-d";
		}
		return format
			.replace(/YYYY/g, "Y")
			.replace(/YY/g, "y")
			.replace(/MM/g, "m")
			.replace(/DD/g, "d")
			.replace(/HH/g, "H")
			.replace(/hh/g, "h")
			.replace(/mm/g, "i")
			.replace(/ss/g, "S");
	}

	function toDate(input) {
		if (!input) {
			return null;
		}
		if (window.moment && window.moment.isMoment(input)) {
			return input.toDate();
		}
		if (input instanceof Date) {
			return input;
		}
		if (typeof input === "number") {
			return new Date(input);
		}
		if (typeof input === "string") {
			if (window.moment) {
				return window.moment(input).toDate();
			}
			return new Date(input);
		}
		return null;
	}

	function asMoment(date) {
		if (!date) {
			return null;
		}
		if (window.moment) {
			return window.moment(date);
		}
		return date;
	}

	$.fn.datetimepicker = function datetimepickerBridge(options) {
		var opts = options || {};
		return this.each(function eachDatetimepicker() {
			var element = this;
			var existing = $(element).data("DateTimePicker");
			if (existing) {
				return;
			}

			var fpOptions = {
				allowInput: true,
				dateFormat: toFlatpickrFormat(opts.format || "YYYY-MM-DD"),
				onChange: function onChange(selectedDates) {
					var dateValue = selectedDates && selectedDates.length > 0 ? selectedDates[0] : null;
					$(element).trigger("dp.change", { date: asMoment(dateValue) });
				}
			};

			if (opts.format === "MM/YYYY" || opts.viewMode === "months") {
				fpOptions.dateFormat = "m/Y";
			}

			if (opts.format === "MM/YYYY/DD") {
				fpOptions.dateFormat = "m/Y/d";
			}

			var instance = window.flatpickr(element, fpOptions);

			var api = {
				date: function date(value) {
					if (typeof value === "undefined") {
						var selected = instance.selectedDates && instance.selectedDates.length > 0
							? instance.selectedDates[0]
							: null;
						return asMoment(selected);
					}

					if (value === null) {
						instance.clear();
						return api;
					}

					var parsed = toDate(value);
					if (parsed) {
						instance.setDate(parsed, true);
					}
					return api;
				},
				viewMode: function viewMode() {
					return api;
				},
				destroy: function destroy() {
					instance.destroy();
				}
			};

			$(element).data("DateTimePicker", api);
		});
	};
})();
