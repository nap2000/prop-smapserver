({
    appDir: '../WebContent',
    locale: "en",
    waitSeconds: 0,
    wrapShim: false,
    baseUrl: 'js/libs',
//    optimize: 'none',
    fileExclusionRegExp: /^build$/,
    paths: {
    	jquery: 'jquery-2.1.1',
    	jquery_ui: 'empty:',
    	app: '../app',
    	wfapp: '../app/webform',
    	lang_location: '..',
	bootbox: 'bootbox.min',
	moment: 'moment-with-locales.min',
	d3: 'd3.v4.min',
	chart: 'chart.min.3.8.0',
	toggle: 'bootstrap-toggle.min',
	bootstrap: 'bootstrap.min',
        bootstrapfileinput: 'bootstrap.file-input',
    	bootstrapcolorpicker: '../../../../smapServer/WebContent/js/libs/bootstrap-colorpicker.min',
	slimscroll: 'wb/plugins/slimscroll/jquery.slimscroll.min',
        pace: 'wb/plugins/pace/pace.min',
	icheck: 'wb/plugins/iCheck/icheck.min'
    },
    dir: '../smapServer',
    modules: [
        {
            name: '../index',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../edit',
        },
        {
            name: '../reports',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../api',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../passwords',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../resources',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../login',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../subscriptions',
	    exclude: ['jquery', 'bootstrap']
        },
        {
            name: '../userTrail',
	    exclude: ['jquery', 'bootstrap', 'ol3/ol']
        }

    ]
})
