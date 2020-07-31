#!/bin/bash

export DEBUG=${DEBUG:-glycanjs:searching:*}
export KARMA_SPECS=$1
export PORT=9876 

node_script=$(file `which node` | grep 'shell script')

node_args=""

if [[ "$node_script" != "" ]]; then
	node_args="--env DEBUG --env KARMA_SPECS"
fi

if [[ -f "$KARMA_SPECS" && $(command -v watch_path) ]]; then
	echo "Running tests only for $KARMA_SPECS" 
	(node $node_args ./node_modules/.bin/karma start | browser_color_to_ansi) & watch_path "js/*.js" "touch $KARMA_SPECS"
else
	node $node_args ./node_modules/.bin/karma start | browser_color_to_ansi
fi

