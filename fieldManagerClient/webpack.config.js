const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    userManagement: "./WebContent/js/userManagement.js",
    settings: "./WebContent/js/settings.js",
    surveyManagement: "./WebContent/js/surveyManagement.js",
    monitor: "./WebContent/js/monitor.js",
    notifications: "./WebContent/js/notifications.js",
    billing: "./WebContent/js/billing.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/app/fieldManager/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery",
    moment: "moment",
    bootbox: "bootbox",
    Chart: "Chart",
    OpenLayers: "OpenLayers"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      moment: path.resolve(__dirname, "../smapServer/WebContent/js/libs/moment-with-locales.2.24.0.js"),
      bootbox: path.resolve(__dirname, "../smapServer/WebContent/js/libs/bootbox.5.1.1.min.js"),
      common: path.resolve(__dirname, "../smapServer/WebContent/js/app/common.js"),
      "app/common": path.resolve(__dirname, "../smapServer/WebContent/js/app/common.js"),
      localise: path.resolve(__dirname, "../smapServer/WebContent/js/app/localise.js"),
      globals: path.resolve(__dirname, "../smapServer/WebContent/js/app/globals.js"),
      modernizr: path.resolve(__dirname, "WebContent/js/libs/modernizr-shim.js"),
      datetimepicker: path.resolve(__dirname, "WebContent/js/libs/datetimepicker-shim.js"),
      "app/map-ol-mgmt": path.resolve(__dirname, "WebContent/js/libs/map-ol-mgmt-shim.js"),
      "app/monitorChart": path.resolve(__dirname, "WebContent/js/libs/monitorChart-shim.js"),
      pace: path.resolve(__dirname, "WebContent/js/libs/pace-shim.js")
    }
  }
};
