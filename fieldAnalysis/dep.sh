#!/bin/sh

# Minify
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

#uglification - note minifiy is above s largely not working nowadays
if [ "$1" != develop ]
then
	grunt
        rm fieldAnalysis/js/dashboard_main.js
else
	cp fieldAnalysis/js/dashboard_main.js fieldAnalysis/js/dashboard_main.min.js
fi

# Create a tar file and copy to the deploy directory

echo "----------------- fieldManagerClient"
echo "Placing tar file in ~/deploy"

export COPYFILE_DISABLE=true
tar --no-xattrs -zcf fieldAnalysis.tgz fieldAnalysis
cp fieldAnalysis.tgz ~/deploy/smap/deploy/version1

# deploy to local

docdir=$WEBSITE_DOCS/app/fieldAnalysis

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -rf fieldAnalysis/* $docdir
sudo apachectl restart
rm fieldAnalysis.tgz

# clean up the temporary fieldAnalysis directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf fieldAnalysis
fi
