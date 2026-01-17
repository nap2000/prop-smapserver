#!/bin/sh

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Minify the smap server code
echo "--------------------------- build smap server code"

# Run webpack build for bundled entrypoints
if [ "$1" = develop ]
then
	npm run build:dev
else
	npm run build
fi

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
rm -rf "$SCRIPT_DIR/smapServer"
cp -R "$SCRIPT_DIR/WebContent" "$SCRIPT_DIR/smapServer"
cd "$SCRIPT_DIR/smapServer"
tar --no-xattrs -zcf smapServer.tgz *
cp smapServer.tgz ~/deploy/smap/deploy/version1
rm smapServer.tgz
cd "$SCRIPT_DIR"

# deploy to local
docdir=$WEBSITE_DOCS

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"
sudo rm -R $docdir/js
sudo rm -R $docdir/build
sudo cp -R smapServer/* $docdir
sudo apachectl restart

# clean up the temporary smapServer directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf smapServer
fi
