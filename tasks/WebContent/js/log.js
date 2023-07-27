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

requirejs.config({
    baseUrl: 'js/libs',
    locale: gUserLocale,
    waitSeconds: 0,
    paths: {
     	app: '../app',
     	i18n: '../../../../js/libs/i18n',
     	async: '../../../../js/libs/async',
     	localise: '../../../../js/app/localise',
	    globals: '../../../../js/app/globals',
	    moment: '../../../../js/libs/moment-with-locales.2.24.0',
	    datetimepicker: '../../../../js/libs/bootstrap-datetimepicker-4.17.47',
    	modernizr: '../../../../js/libs/modernizr',
    	common: '../../../../js/app/common',
    	lang_location: '../../../../js',
    	pace: '../../../../js/libs/wb/pace/pace.min'
    },
    shim: {
	    'datetimepicker': ['moment'],
    	'common': ['jquery']
    	}
    });

require([
         'jquery',
         'common',
         'localise',
		 'globals',
		 'moment',
		 'datetimepicker',
         'pace'

         ], function($,
        		 common,
        		 localise,
        		 globals,
		         moment) {

	var table;
	var gSelectedRecord;
	
	$(document).ready(function() {

		window.moment = moment;		// Make moment global for use by common.js
        setCustomLogs();
		setTheme();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML
		registerForServiceWorkerMessages();

		/*
  	     * Add date time picker to usage date
  		 */
		moment.locale();
		$('#logMonth').datetimepicker({
			useCurrent: false,
			format: "MM/YYYY",
			viewMode: "months",
			locale: gUserLocale || 'en'
		}).data("DateTimePicker").date(moment());

		$('.table_filter').on('blur', function () {
			table.ajax.url("/api/v1/log/dt?month=" + $('#logMonth').data("DateTimePicker").date()).load();
		});

		getLoggedInUser(undefined, false, true, undefined);

		var url = "/api/v1/log/dt?month=" + $('#logMonth').data("DateTimePicker").date();
		table = $('#log_table').DataTable({
			 processing: true,
			 scrollY: '70vh',
			 scrollX: true,
			 scrollCollapse: true,
			 select: {
			    	selector: 'td:not(:first-child)'
			 },
			 deferRender: true,
		     ajax: url,
		     columns: [
		                 { "data": "id" },
		                 { "data": "log_time" },
		                 { "data": "sName", "width": "200px"  },
		                 { "data": "userIdent" },
		                 { "data": "event" },
		                 { "data": "note" },
			             { "data": "server" }
		             ],
		      order: [[ 0, "desc" ]],
		      columnDefs: [{
                  targets: [1],
                  render: function (data, type, full, meta) {
                      return localTime(data);
                  }
              }
		     ],
			initComplete: function () {
				this.api().columns().every( function () {
					var column = this;
					if (column.index() === 2 || column.index() === 3 || column.index() === 4 || column.index() === 6) {
						var select = $('<select style="width:100%;"><option value=""></option></select>')
							.appendTo($(column.footer()).empty())
							.on('change', function () {
								var val = $.fn.dataTable.util.escapeRegex(
									$(this).val()
								);

								column
									.search(val ? '^' + val + '$' : '', true, false)
									.draw();
							});

						column.data().unique().sort().each(function (d, j) {
							select.append('<option value="' + d + '">' + d + '</option>')
						});
					}
				} );

			}
		});

        $('#log_table').find('td').css('white-space','initial').css('word-wrap', 'break-word');
		
		$('#m_refresh').click(function(e) {	// Add refresh action
			table.ajax.reload();
		});

		// Respond to selection of a row
		$(".row_selected").attr('aria-disabled', true).addClass("disabled");
		table.off('select').on('select', function (e, dt, type, indexes) {
			var records = table.rows('.selected').data();
			if(records.length > 0 && records[0].sId > 0) {
				$(".row_selected").attr('aria-disabled', false).removeClass("disabled");
				gSelectedRecord = records[0].sId;
			}
		});
		table.off('deselect').on('deselect', function (e, dt, type, indexes) {
			gSelectedRecord = undefined;
			$('#details_btn').addClass("disabled");
		});

		$('#details_btn').click(function(){
			showDetails();
		});

		/*
		 * Reports
		 */
		moment.locale();
		$('#usageDate').datetimepicker({
			useCurrent: false,
			locale: gUserLocale || 'en'
		}).data("DateTimePicker").date(moment());

		$('#m_hourly_sr').click(function(){
			$('#hourly_sr_popup').modal("show");
		});

		$('#hourly_sr_save').click(function() {
			var usageMsec = $('#usageDate').data("DateTimePicker").date(),
				d = new Date(usageMsec),
				month = d.getMonth() + 1,
				year = d.getFullYear(),
				day = d.getDate(),
				url;


			var tz = globals.gTimezone;
			url = "/surveyKPI/adminreport/logs/hourly/" + year + "/" + month + "/" + day + '?tz=' + tz;


			downloadFile(url);

		});
		
	});

	function showDetails() {

		addHourglass();
		$.ajax({
			url: "/surveyKPI/surveys/summary/id/" + gSelectedRecord,
			dataType: 'json',
			cache: false,
			success: function(data) {
				removeHourglass();
				$('#survey_project').val(data.projectName);
				$('#surveyDetails').modal("show");

				console.log(JSON.stringify(data));
			},
			error: function(xhr, textStatus, err) {
				removeHourglass();
				if(xhr.readyState == 0 || xhr.status == 0) {
					return;  // Not an error
				} else {
					alert(localise.set["c_error"] + ": " + err);
				}
			}
		});

	}

});

