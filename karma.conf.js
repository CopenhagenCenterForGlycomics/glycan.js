// Karma configuration
// Generated on Mon Apr 20 2015 22:29:04 GMT+0200 (CEST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['qunit','browserify'],

    plugins: ['karma-qunit','karma-browserify','karma-chrome-launcher'],

    browserify : {
      debug: true,
      transform : [['babelify', { 'presets': [['env', { 'targets' : { 'browsers' : '> 5%'}}]] }]]
    },

    // list of files / patterns to load in the browser
    // Load in our transpiled files first, to make sure
    // that the polyfills are loaded, ready for the tests.
    files: [
      'node_modules/babel-polyfill/dist/polyfill.js',
      'lib/**/*.js',
      'js/**/*.js',
      'test/test.js',
      'test/**/*-basicLayout.js'
    ],

    client: {
        qunit: { debug: process.env.DEBUG }
    },

    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
        'js/**/*.js' : ['browserify'],
        'lib/**/*.js' : ['browserify'],
        'test/**/test.js' : ['browserify'],
        'test/**/test-*.js' : ['browserify']
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
    browsers: ['ChromeHeadless','Chrome'],

    customLaunchers: {
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
