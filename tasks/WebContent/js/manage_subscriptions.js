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
    	modernizr: '../../../../js/libs/modernizr',
	    moment: '../../../../js/libs/moment-with-locales.2.24.0',
    	common: '../../../../js/app/common',
    	lang_location: '../../../../js',
    	metismenu: '../../../../js/libs/wb/metisMenu/jquery.metisMenu',
    	pace: '../../../../js/libs/wb/pace/pace.min'
    },
    shim: {

    	'common': ['jquery'],
    	'bootstrap': ['jquery'],
    	'metismenu': ['jquery']
    	}
    });

require([
         'jquery',
         'common',
         'localise',
		 'globals',
		 'moment',
         'metismenu',
         'pace'

         ], function($,
        		 common,
        		 localise,
        		 globals,
		         moment) {

	var table;
	
	$(document).ready(function() {

        setCustomSubs();
		setupUserProfile(true);
		localise.setlang();		// Localise HTML

		$("#side-menu").metisMenu()

		getLoggedInUser(undefined, false, false, undefined);

		table = $('#sub_table').DataTable({
			 processing: true,
			 deferRender: true,
		     ajax: "/api/v1/subscriptions?dt=true",
		     columns: [
		     	    { "data": "email" },
			        { "data": "name" },
			        { "data": "status"  }
			     ],
		      order: [[ 0, "asc" ]],
			  initComplete: function () {
				this.api().columns().every( function () {
					var column = this;
					var select = $('<select><option value=""></option></select>')
						.appendTo( $(column.footer()).empty() )
						.on( 'change', function () {
							var val = $.fn.dataTable.util.escapeRegex(
								$(this).val()
							);

							column
								.search( val ? '^'+val+'$' : '', true, false )
								.draw();
						} );

					column.data().unique().sort().each( function ( d, j ) {
						select.append( '<option value="'+d+'">'+d+'</option>' )
					} );
				} );

			}

		});

        $('#sub_table').find('td').css('white-space','initial').css('word-wrap', 'break-word');
		
		$('#m_refresh').click(function(e) {	// Add refresh action
			table.ajax.reload();
		});
			
		
	});
	


});

