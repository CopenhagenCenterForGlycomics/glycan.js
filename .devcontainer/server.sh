#!/usr/bin/env bash

set -euxo pipefail

DEVCONTAINER_DIR=$(dirname $0)

mkdir -p "${DEVCONTAINER_DIR}/run"

rm "${DEVCONTAINER_DIR}/run/webpack.log" || true

if [[ -f ".devcontainer/run/webpack.pid" ]]; then
	echo "Killing running webpack"
	kill -9 `cat ${DEVCONTAINER_DIR}/run/webpack.pid` || true
	rm "${DEVCONTAINER_DIR}/run/webpack.pid"
fi

echo "Starting NPM"

nohup npm start > "${DEVCONTAINER_DIR}/run/webpack.log" 2>&1 &
echo $! > "${DEVCONTAINER_DIR}/run/webpack.pid"

echo "DONE"



