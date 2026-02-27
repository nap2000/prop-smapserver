const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    edit: "./WebContent/js/edit.js",
    resources: "./WebContent/js/resources.js",
    index: "./WebContent/js/index.js",
    meta: "./WebContent/js/meta.js",
    register: "./WebContent/js/register.js",
    survey_roles: "./WebContent/js/survey_roles.js",
    translate: "./WebContent/js/translate.js",
    logout: "./WebContent/js/logout.js",
    change_passwords: "./WebContent/js/change_passwords.js",
	changes: "./WebContent/js/changes.js",
	serverState: "./WebContent/js/serverState.js",
	api: "./WebContent/js/api.js",
	reports: "./WebContent/js/reports.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery",
    moment: "moment"
  },
  resolve: {
    alias: {
      knockout: path.resolve(__dirname, "WebContent/js/libs/knockout.js"),
      moment: path.resolve(__dirname, "WebContent/js/libs/moment-with-locales.2.24.0.js")
    }
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
};
