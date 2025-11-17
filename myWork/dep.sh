#!/bin/sh

# Minify
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

# Create a tar file and copy to the deploy directory

echo "----------------- myWork"
echo "Placing tar file in ~/deploy"

export COPYFILE_DISABLE=true
tar -zcf myWork.tgz myWork
cp myWork.tgz ~/deploy/smap/deploy/version1

# deploy to local
docdir=$WEBSITE_DOCS/app/myWork

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -rf myWork/* $docdir
sudo apachectl restart
rm myWork.tgz

# clean up the temporary myWork directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf myWork
fi
