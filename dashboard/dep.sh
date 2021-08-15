#!/bin/sh

# Create a tar file and copy to the deploy directory
mkdir dashboard
cp -R WebContent/* dashboard
tar -zcf dashboard.tgz dashboard
mv dashboard.tgz ~/deploy

# copy files to the local server
rm -rf /Library/WebServer/Documents/dashboard
cp -R dashboard /Library/WebServer/Documents

rm -rf dashboard



