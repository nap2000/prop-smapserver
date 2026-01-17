const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    edit: "./WebContent/js/edit.js",
    resources: "./WebContent/js/resources.js"
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "WebContent/build/js"),
    publicPath: "/build/js/",
    clean: true
  },
  module: {},
  externals: {
    jquery: "jQuery"
  },
  resolve: {
    alias: {
      knockout: path.resolve(__dirname, "WebContent/js/libs/knockout.js")
    }
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  }
};
