#!/bin/sh

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Webpack build
if [ "$1" = develop ]
then
	npm run build:dev
else
	npm run build
fi

if [ ! -f "$SCRIPT_DIR/WebContent/build/js/dashboard.bundle.js" ]
then
	echo "Missing build output: $SCRIPT_DIR/WebContent/build/js/dashboard.bundle.js"
	exit 1
fi

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
rm -rf "$SCRIPT_DIR/fieldAnalysis"
cp -R "$SCRIPT_DIR/WebContent" "$SCRIPT_DIR/fieldAnalysis"
cd "$SCRIPT_DIR/fieldAnalysis"
tar --no-xattrs -zcf fieldAnalysis.tgz *
cp fieldAnalysis.tgz ~/deploy/smap/deploy/version1
rm fieldAnalysis.tgz
cd "$SCRIPT_DIR"

# deploy to local

docdir=$WEBSITE_DOCS/app/fieldAnalysis

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"

sudo rm -rf $docdir
sudo mkdir $docdir
sudo cp -rf fieldAnalysis/* $docdir
sudo apachectl restart

# clean up the temporary fieldAnalysis directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf fieldAnalysis
fi
