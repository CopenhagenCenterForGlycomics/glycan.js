// Karma configuration
// Generated on Mon Apr 20 2015 22:29:04 GMT+0200 (CEST)
const webpack = require('./webpack.config.js');

webpack.devtool = 'cheap-module-source-map';
webpack.mode = 'development';

const DEFAULT_TEST_FILES = [
      'lib/**/*.js',
      'js/**/*.js',
      'test/test.js'
    ];

// karma.conf.js
function getSpecs(specList) {
    if (specList) {
        return [].concat(DEFAULT_TEST_FILES).concat(specList.split(','));
    } else {
        return [].concat(DEFAULT_TEST_FILES).concat('test/**/test-*.js');
    }
}


module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['qunit'],

    plugins: ['karma-qunit','karma-webpack','karma-sourcemap-loader','karma-jsdom-launcher'],

    browserify : {
      debug: true,
      transform : [['babelify', { 'presets': [['env', { 'targets' : { 'browsers' : '> 5%'}}]] }]]
    },

    // list of files / patterns to load in the browser
    // Load in our transpiled files first, to make sure
    // that the polyfills are loaded, ready for the tests.
    files: getSpecs(process.env.KARMA_SPECS),

    client: {
        qunit: { debug: process.env.DEBUG }
    },

    // list of files to exclude
    exclude: [
        'js/index.js'
    ],

    webpack,

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        'js/**/*.js' : ['webpack','sourcemap'],
        'lib/**/*.js' : ['webpack','sourcemap'],
        'test/**/test.js' : ['webpack','sourcemap'],
        'test/**/test-*.js' : ['webpack','sourcemap']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher

    browsers: ['jsdom'],
    customLaunchers: {
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
