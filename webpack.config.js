// webpack.config.js
const path = require('path');

module.exports = {
  entry: {
    service_worker: './background/service_worker.js',
    detector: './content_scripts/detector.js',
    popup: './popup/popup.js',
    options: './options/options.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: 'babel-loader',
      exclude: /node_modules/
    }]
  },
  mode: 'production',
  devtool: false, // No eval() — MV3 forbids it
};
