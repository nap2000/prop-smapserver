#!/bin/sh

# Create a tar file and copy to the deploy directory
mkdir dashboard
cp -R WebContent/* dashboard
tar -zcf dashboard.tgz dashboard

echo "----------------- dashboard"
echo "Placing tar file in ~/deploy"

mv dashboard.tgz ~/deploy/smap/deploy/version1

# copy files to the local server

docdir=$WEBSITE_DOCS/app/dashboard

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -R dashboard $docdir

if [ -f dep.sh ]
then
	rm -rf dashboard
fi



