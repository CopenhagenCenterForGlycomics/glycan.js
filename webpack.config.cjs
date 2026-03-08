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
    rules: [
    {
      test: /sugars\.svg$/,
      use: 'raw-loader'
    },
    {
      test: /\.js$/,
      use: {
        loader: 'babel-loader',
        options: {
          babelrc: false,
          presets: [
            ['@babel/preset-env', {
              modules: false,
              corejs: 'core-js@2',
              useBuiltIns: 'entry',
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