#!/bin/sh

export BUILD_ID=${BUILD_ID:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}

#
# Editor and miscelaneous
#
cd smapServer
./dep.sh $1
cd ..

#
# Analysis Module
#
cd fieldAnalysis
./dep.sh $1
cd ..

#
# Tasks Module
#
cd tasks
./dep.sh $1
cd ..

#
# Admin Module
#
cd fieldManagerClient
./dep.sh $1
cd ..

#
# Webforms Manager
#
cd myWork
./dep.sh $1
cd ..

#
# Dashboard (deprecate)
#
cd dashboard
./dep.sh $1
cd ..
