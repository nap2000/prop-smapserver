const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    my_work: "./WebContent/js/my_work.js",
    history: "./WebContent/js/history.js",
    done: "./WebContent/js/done.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/app/myWork/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery",
    moment: "moment",
    bootbox: "bootbox"
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
      localise: path.resolve(__dirname, "../smapServer/WebContent/js/app/localise.js"),
      globals: path.resolve(__dirname, "../smapServer/WebContent/js/app/globals.js"),
      modernizr: path.resolve(__dirname, "../smapServer/WebContent/js/libs/modernizr.js")
    }
  }
};
