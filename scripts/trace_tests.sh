#!/bin/bash

export DEBUG=glycanjs:searching:*
export KARMA_SPECS=$1

./node_modules/karma/bin/karma start --browsers ChromeHeadless