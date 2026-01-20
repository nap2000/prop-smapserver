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
      common: path.resolve(__dirname, "WebContent/js/libs/common-shim.js"),
      localise: path.resolve(__dirname, "WebContent/js/libs/localise-shim.js"),
      globals: path.resolve(__dirname, "WebContent/js/libs/globals-shim.js"),
      modernizr: path.resolve(__dirname, "WebContent/js/libs/modernizr-shim.js"),
      rmm: path.resolve(__dirname, "WebContent/js/libs/rmm-shim.js"),
      tablesorter: path.resolve(__dirname, "WebContent/js/libs/tablesorter-shim.js"),
      crf: path.resolve(__dirname, "WebContent/js/libs/crf-shim.js"),
      data: path.resolve(__dirname, "WebContent/js/libs/data-shim.js"),
      pace: path.resolve(__dirname, "WebContent/js/libs/pace-shim.js"),
      "app/graph-functions": path.resolve(__dirname, "WebContent/js/libs/graph-functions-shim.js"),
      "app/graph-view2": path.resolve(__dirname, "WebContent/js/libs/graph-view2-shim.js"),
      "app/map-ol": path.resolve(__dirname, "WebContent/js/libs/map-ol-shim.js"),
      "app/map-functions": path.resolve(__dirname, "WebContent/js/libs/map-functions-shim.js"),
      "app/table-functions": path.resolve(__dirname, "WebContent/js/libs/table-functions-shim.js"),
      "app/table-view": path.resolve(__dirname, "WebContent/js/libs/table-view-shim.js"),
      "app/media-view": path.resolve(__dirname, "WebContent/js/libs/media-view-shim.js"),
      "app/survey_control": path.resolve(__dirname, "WebContent/js/libs/survey-control-shim.js"),
      "app/plugins": path.resolve(__dirname, "WebContent/js/libs/plugins-shim.js"),
      "app/script": path.resolve(__dirname, "WebContent/js/libs/script-shim.js"),
      "app/panels": path.resolve(__dirname, "WebContent/js/libs/panels-shim.js"),
      "app/jqplot_image": path.resolve(__dirname, "WebContent/js/libs/jqplot-image-shim.js"),
      "app/extended_model": path.resolve(__dirname, "WebContent/js/libs/extended-model-shim.js"),
      "main/jqplot_main": path.resolve(__dirname, "WebContent/js/libs/jqplot-main-shim.js"),
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
