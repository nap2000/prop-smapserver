#!/bin/sh

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

