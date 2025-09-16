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
export COPYFILE_DISABLE=true
tar -zcf fieldAnalysis.tgz fieldAnalysis
cp fieldAnalysis.tgz ~/deploy

# deploy to local
sudo rm -rf /Library/WebServer/Documents/app/fieldAnalysis
sudo mkdir /Library/WebServer/Documents/app/fieldAnalysis
sudo cp -rf fieldAnalysis/* /Library/WebServer/Documents/app/fieldAnalysis
sudo apachectl restart
rm fieldAnalysis.tgz

# clean up the temporary fieldAnalysis directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf fieldAnalysis
fi
