#!/bin/sh

# Minify
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

#uglification - note minifiy is above s largely not working nowadays
if [ "$1" != develop ]
then
	grunt
        rm tasks/js/managed_forms.js
        rm tasks/js/taskManagement.js
        rm tasks/js/log.js
else
	cp tasks/js/managed_forms.js tasks/js/managed_forms.min.js
	cp tasks/js/taskManagement.js tasks/js/taskManagement.min.js
	cp tasks/js/log.js tasks/js/log.min.js
fi

# Create a tar file and copy to the deploy directory
export COPYFILE_DISABLE=true
tar -zcf tasks.tgz tasks
cp tasks.tgz ~/deploy

# deploy to local
sudo rm -rf /Library/WebServer/Documents/app/tasks
sudo mkdir /Library/WebServer/Documents/app/tasks
sudo cp -rf tasks/* /Library/WebServer/Documents/app/tasks
sudo apachectl restart
rm tasks.tgz

# clean up the temporary tasks directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf tasks
fi
