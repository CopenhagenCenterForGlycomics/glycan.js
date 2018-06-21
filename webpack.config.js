module.exports = {
  entry: {
    'glycan': [ './js/glycan.js' ],
  },
  devtool: 'source-map',
  mode: 'development',
  output: {
    filename: '[name]-bundle.js',
    path: __dirname + '/dist'
  },
  module: {
    rules: [{
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            ['env', {
              modules: false,
              useBuiltIns: true,
              targets: {
                browsers: [
                  'Chrome >= 60',
                  'Safari >= 10.1',
                  'iOS >= 10.3',
                  'Firefox >= 54',
                  'Edge >= 15',
                ],
              },
            }],
          ],
        },
      },
    }],
  },
};