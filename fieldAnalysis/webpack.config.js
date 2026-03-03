const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    dashboard: "./WebContent/js/dashboard.js",
    review: "./WebContent/js/review.js",
    audit: "./WebContent/js/audit.js"
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
    OpenLayers: "OpenLayers",
    Chart: "Chart",
    Sortable: "Sortable"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      jquery: path.resolve(__dirname, "../smapServer/WebContent/js/libs/jquery-3.5.1.min.js"),
      moment: path.resolve(__dirname, "../smapServer/WebContent/js/libs/moment-with-locales.2.24.0.js"),
      common: path.resolve(__dirname, "../smapServer/WebContent/js/app/common.js"),
      localise: path.resolve(__dirname, "../smapServer/WebContent/js/app/localise.js"),
      globals: path.resolve(__dirname, "../smapServer/WebContent/js/app/globals.js"),
      commonReportFunctions: path.resolve(__dirname, "../smapServer/WebContent/js/libs/commonReportFunctions.js"),
      modernizr: path.resolve(__dirname, "WebContent/js/libs/modernizr.custom.js"),
      rmm: path.resolve(__dirname, "../smapServer/WebContent/js/libs/responsivemobilemenu.js"),
      tablesorter: path.resolve(__dirname, "../smapServer/WebContent/js/libs/jquery.tablesorter.min.js"),
      data: path.resolve(__dirname, "../smapServer/WebContent/js/app/data.js"),
      pace: path.resolve(__dirname, "../smapServer/WebContent/js/libs/wb/plugins/pace/pace.min.js")
    }
  }
};
