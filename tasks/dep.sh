#!/bin/sh

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Webpack build
if [ "$1" = develop ]
then
	npm run build:dev
else
	npm run build
fi

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
rm -rf "$SCRIPT_DIR/tasks"
cp -R "$SCRIPT_DIR/WebContent" "$SCRIPT_DIR/tasks"
cd "$SCRIPT_DIR/tasks"
tar --no-xattrs -zcf tasks.tgz *
cp tasks.tgz ~/deploy/smap/deploy/version1
rm tasks.tgz
cd "$SCRIPT_DIR"

# deploy to local

docdir=$WEBSITE_DOCS/app/tasks

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -rf tasks/* $docdir
sudo apachectl restart

# clean up the temporary tasks directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf tasks
fi
