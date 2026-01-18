const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    taskManagement: "./WebContent/js/taskManagement.js"
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
    moment: "moment"
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false
  },
  resolve: {
    alias: {
      knockout: path.resolve(__dirname, "../smapServer/WebContent/js/libs/knockout.js"),
      moment: path.resolve(__dirname, "../smapServer/WebContent/js/libs/moment-with-locales.2.24.0.js")
    }
  }
};
