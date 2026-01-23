const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    dashboard: "./WebContent/js/dashboard.js",
    review: "./WebContent/js/review.js",
    audit: "./WebContent/js/audit.js",
    jqplot: "./WebContent/js/jqplot.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/app/fieldAnalysis/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery",
    moment: "moment",
    OpenLayers: "OpenLayers"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      jquery: path.resolve(__dirname, "../smapServer/WebContent/js/libs/jquery-3.5.1.min.js"),
      jquery_ui: path.resolve(__dirname, "../smapServer/WebContent/js/libs/jquery-ui-1.13.2.min.js"),
      moment: path.resolve(__dirname, "../smapServer/WebContent/js/libs/moment-with-locales.2.24.0.js"),
      common: path.resolve(__dirname, "../smapServer/WebContent/js/app/common.js"),
      localise: path.resolve(__dirname, "../smapServer/WebContent/js/app/localise.js"),
      globals: path.resolve(__dirname, "../smapServer/WebContent/js/app/globals.js"),
      commonReportFunctions: path.resolve(__dirname, "../smapServer/WebContent/js/libs/commonReportFunctions.js"),
      modernizr: path.resolve(__dirname, "WebContent/js/libs/modernizr.custom.js"),
      rmm: path.resolve(__dirname, "../smapServer/WebContent/js/libs/responsivemobilemenu.js"),
      tablesorter: path.resolve(__dirname, "../smapServer/WebContent/js/libs/jquery.tablesorter.min.js"),
      data: path.resolve(__dirname, "../smapServer/WebContent/js/app/data.js"),
      pace: path.resolve(__dirname, "../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min.js"),
      "main/jqplot_main": path.resolve(__dirname, "WebContent/js/jqplot_main.js"),
      "jqplot/jquery.jqplot.min": path.resolve(__dirname, "WebContent/js/libs/jqplot/jquery.jqplot.min.js"),
      "jqplot/plugins/jqplot.highlighter": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.highlighter.js"),
      "jqplot/plugins/jqplot.cursor": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.cursor.js"),
      "jqplot/plugins/jqplot.dateAxisRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.dateAxisRenderer.js"),
      "jqplot/plugins/jqplot.barRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.barRenderer.js"),
      "jqplot/plugins/jqplot.categoryAxisRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.categoryAxisRenderer.js"),
      "jqplot/plugins/jqplot.canvasAxisLabelRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.canvasAxisLabelRenderer.js"),
      "jqplot/plugins/jqplot.canvasAxisTickRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.canvasAxisTickRenderer.js"),
      "jqplot/plugins/jqplot.canvasTextRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.canvasTextRenderer.js"),
      "jqplot/plugins/jqplot.enhancedLegendRenderer": path.resolve(__dirname, "WebContent/js/libs/jqplot/plugins/jqplot.enhancedLegendRenderer.js")
    }
  }
};
