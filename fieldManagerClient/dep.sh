#!/bin/sh

# Minify
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

#uglification - note minifiy is above s largely not working nowadays
if [ "$1" != develop ]
then
        grunt
        rm fieldManager/js/surveymanagement_main.js
else 
        cp fieldManager/js/surveymanagement_main.js fieldManager/js/surveymanagement_main.min.js
fi

# Create a tar file and copy to the deploy directory

echo "----------------- fieldManagerClient"
echo "Placing tar file in ~/deploy"

export COPYFILE_DISABLE=true
tar --no-xattrs -zcf fieldManager.tgz fieldManager
cp fieldManager.tgz ~/deploy/smap/deploy/version1

# deploy to local
docdir=$WEBSITE_DOCS/app/fieldManager

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -rf fieldManager/* $docdir
sudo apachectl restart
rm fieldManager.tgz

# clean up the temporary fieldManagerdirectory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf fieldManager
fi
