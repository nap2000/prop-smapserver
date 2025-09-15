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
export COPYFILE_DISABLE=true
tar -zcf fieldManager.tgz fieldManager
cp fieldManager.tgz ~/deploy

# deploy to local
sudo rm -rf /Library/WebServer/Documents/app/fieldManager
sudo mkdir /Library/WebServer/Documents/app/fieldManager
sudo cp -rf fieldManager/* /Library/WebServer/Documents/app/fieldManager
sudo apachectl restart
rm fieldManager.tgz

# clean up the temporary fieldManagerdirectory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf fieldManager
fi
