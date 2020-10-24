#!/bin/sh

# Minify the smap server code
echo "--------------------------- minify smap server code"
node tools/r.js -o tools/build.js

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
cp -rf WebContent/build smapServer
cd smapServer
tar -zcf smapServer.tgz *
cp smapServer.tgz ~/deploy
rm smapServer.tgz
cd ..

# deploy to local
sudo rm -rf /Library/WebServer/Documents/js
sudo cp -rf smapServer/* /Library/WebServer/Documents
sudo apachectl restart

# copy the motd
cp ~/motd.html /Library/WebServer/Documents

# clean up the temporary smapServer directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf smapServer
fi
