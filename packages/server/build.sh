#!/usr/bin/env sh

if [ "$DEPLOY_PACKAGE" = 'server' ]; then
    cd ../types && yarn build:tsc && cd ../server && yarn migrate:force && yarn build
else
    echo "Not running specific server deploy"
fi

