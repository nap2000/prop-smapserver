#!/bin/sh

# Minify the smap server code
echo "--------------------------- minify smap server code"
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

#uglification - note minifiy is above s largely not working nowadays
if [ "$1" != develop ]
then
	grunt
        rm smapServer/js/edit.js
else
	cp smapServer/js/edit.js smapServer/js/edit.min.js
fi

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
cp -R WebContent/build smapServer
cd smapServer
tar --no-xattrs -zcf smapServer.tgz *
cp smapServer.tgz ~/deploy
rm smapServer.tgz
cd ..

# deploy to local
docdir=$WEBSITE_DOCS

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"
sudo rm -R $docdir/js
sudo rm -R $docdir/build
sudo cp -R smapServer/* $docdir
sudo apachectl restart

# copy the motd
cp ~/motd.html /Library/WebServer/Documents

# clean up the temporary smapServer directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf smapServer
fi
