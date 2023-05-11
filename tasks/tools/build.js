({
    appDir: '../WebContent',
    locale: "en",
//    optimize: 'none',
    wrapShim: false,
    waitSeconds: 60,
    baseUrl: 'js/libs',
    paths: {
    	app: '../app',
     	jquery: '../../../../smapServer/WebContent/js/libs/jquery-3.5.1.min',
     	i18n: '../../../../smapServer/WebContent/js/libs/i18n',
     	async: '../../../../smapServer/WebContent/js/libs/async',
     	localise: '../../../../smapServer/WebContent/js/app/localise',
    	modernizr: '../../../../smapServer/WebContent/js/libs/modernizr',
    	common: '../../../../smapServer/WebContent/js/app/common',
    	globals: '../../../../smapServer/WebContent/js/app/globals',
    	mapbox_app: '../../../../smapServer/WebContent/js/app/mapbox_app',
    	crf: '../../../../smapServer/WebContent/js/libs/commonReportFunctions',
    	lang_location: '../../../../smapServer/WebContent/js',
	toggle: '../../../../smapServer/WebContent/js/libs/bootstrap-toggle.min',
	qrcode: '../../../../smapServer/WebContent/js/libs/jquery-qrcode-0.14.0.min',
	svgsave: '../../../../smapServer/WebContent/js/libs/saveSvgAsPng',
	popper: '../../../../smapServer/WebContent/js/libs/popper.v1.16.1.min',
	bootstrap: '../../../../smapServer/WebContent/js/libs/bootstrap.bundle.v4.5.min',
    	bootstrapfileinput: '../../../../smapServer/WebContent/js/libs/bootstrap.file-input',
	bootbox: '../../../../smapServer/WebContent/js/libs/bootbox.min',
	file_input: '../../../../smapServer/WebContent/js/libs/bootstrap.file-input',
	moment: '../../../../smapServer/WebContent/js/libs/moment-with-locales.2.24.0',
	datetimepicker: '../../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker-4.17.47',
	rmm: '../../../../smapServer/WebContent/js/libs/responsivemobilemenu',
        multiselect: '../../../../smapServer/WebContent/js/libs/bootstrap-multiselect.min',
        knockout: '../../../../smapServer/WebContent/js/libs/knockout',

	mapbox: '../../../../smapServer/WebContent/js/libs/mapbox/js/mapbox',

	jquery_ui: '../../../../smapServer/WebContent/js/libs/wb/jquery-ui-1.13.2.min',
	slimscroll: '../../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll.min',
	sweetalert: '../../../../smapServer/WebContent/js/libs/wb/plugins/sweetalert/sweetalert.min',
	pace: '../../../../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min',
	footable: '../../../../smapServer/WebContent/js/libs/wb/plugins/footable/footable.all.min',
	peity: '../../../../smapServer/WebContent/js/libs/wb/plugins/peity/jquery.peity.min',
	icheck: '../../../../smapServer/WebContent/js/libs/wb/plugins/iCheck/icheck.min',
	calendar: '../../../../smapServer/WebContent/js/libs/wb/plugins/fullcalendar/fullcalendar.min',
	es: '../../../../smapServer/WebContent/js/libs/wb/plugins/fullcalendar/es'
    },
    dir: '../tasks',
    modules: [
        {
            name: '../taskManagement',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../managed_forms',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../linkages',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../log',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../contacts',
	    exclude: ['jquery', 'bootstrap']
	},
        {
            name: '../campaign',
	    exclude: ['jquery', 'bootstrap']
	}

    ]
})
