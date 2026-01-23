const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    taskManagement: "./WebContent/js/taskManagement.js",
    campaign: "./WebContent/js/campaign.js",
    contacts: "./WebContent/js/contacts.js",
    managed_forms: "./WebContent/js/managed_forms.js",
    linkages: "./WebContent/js/linkages.js",
    log: "./WebContent/js/log.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/app/tasks/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery",
    knockout: "ko",
    moment: "moment",
    bootbox: "bootbox"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      knockout: path.resolve(__dirname, "../smapServer/WebContent/js/libs/knockout.js"),
      moment: path.resolve(__dirname, "../smapServer/WebContent/js/libs/moment-with-locales.2.24.0.js"),
      bootbox: path.resolve(__dirname, "../smapServer/WebContent/js/libs/bootbox.5.1.1.min.js"),
      common: path.resolve(__dirname, "../smapServer/WebContent/js/app/common.js"),
      localise: path.resolve(__dirname, "../smapServer/WebContent/js/app/localise.js"),
      globals: path.resolve(__dirname, "../smapServer/WebContent/js/app/globals.js"),
      multiselect: path.resolve(__dirname, "WebContent/js/libs/multiselect-shim.js"),
      modernizr: path.resolve(__dirname, "WebContent/js/libs/modernizr-shim.js"),
      "app/mapOL3": path.resolve(__dirname, "WebContent/js/libs/mapOL3-shim.js"),
      icheck: path.resolve(__dirname, "WebContent/js/libs/icheck-shim.js")
    }
  }
};
