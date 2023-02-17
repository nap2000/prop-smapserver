({
    appDir: '../WebContent',
//    optimize: 'none',
    wrapShim: false,
    waitSeconds: 0,
    baseUrl: 'js/libs',
    paths: {
    	app: '../app',
     	i18n: '../../../../smapServer/WebContent/js/libs/i18n',
     	async: '../../../../smapServer/WebContent/js/libs/async',
     	localise: '../../../../smapServer/WebContent/js/app/localise',
    	modernizr: '../../../../smapServer/WebContent/js/libs/modernizr',
    	common: '../../../../smapServer/WebContent/js/app/common',
    	globals: '../../../../smapServer/WebContent/js/app/globals',
    	crf: '../../../../smapServer/WebContent/js/libs/commonReportFunctions',
    	openlayers: '../../../../smapServer/WebContent/js/libs/OpenLayers/OpenLayers',
    	lang_location: '../../../../smapServer/WebContent/js',
	bootstrap: '../../../../smapServer/WebContent/js/libs/bootstrap.min',
    	bootstrapfileinput: '../../../../smapServer/WebContent/js/libs/bootstrap.file-input',
    	bootstrapcolorpicker: '../../../../smapServer/WebContent/js/libs/bootstrap-colorpicker.min',
	bootbox: '../../../../smapServer/WebContent/js/libs/bootbox.min',
	bootbox: '../../../../smapServer/WebContent/js/libs/bootbox.min',
	file_input: '../../../../smapServer/WebContent/js/libs/bootstrap.file-input',
	moment: '../../../../smapServer/WebContent/js/libs/moment-with-locales.min',
	datetimepicker: '../../../../smapServer/WebContent/js/libs/bootstrap-datetimepicker.min',
	rmm: '../../../../smapServer/WebContent/js/libs/responsivemobilemenu',
        slimscroll: '../../../../smapServer/WebContent/js/libs/wb/plugins/slimscroll/jquery.slimscroll',
        pace: '../../../../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min',


    },
    dir: '../fieldManager',
    modules: [
 	{
            name: '../surveymanagement_main',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../usermanagement_main',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../settings_main',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../monitor_main',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../notifications_main',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../billing_main',
	    exclude: ['jquery', 'bootstrap']
        }

    ]
})
