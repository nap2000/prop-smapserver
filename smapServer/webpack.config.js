const path = require("path");

module.exports = {
  mode: "development",
  devtool: false,
  entry: {
    edit: "./WebContent/js/edit.js"
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
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        vendor: {
          test: /[\\/]WebContent[\\/]js[\\/]libs[\\/]/,
          name: "vendor",
          chunks: "all"
        }
      }
    },
    runtimeChunk: "single"
  }
};
