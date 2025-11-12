#!/bin/sh
cd smapServer
./dep.sh $1
cd ..

cd fieldAnalysis
./dep.sh $1
cd ..

cd tasks
./dep.sh $1
cd ..

cd fieldManagerClient
./dep.sh $1
cd ..

cd myWork
./dep.sh $1
cd ..

cd dashboard
./dep.sh $1
cd ..

