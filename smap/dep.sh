#!/bin/sh

# Delete existing setting deployment directory
rm -rf ~/deploy/smap

# Copy files to deploy
cp -rf ~/git/prop-smapserver/smap ~/deploy

# Get files from open source release
cp -rf ~/git/smapserver2/setup/deploy/* ~/deploy/smap/deploy
cp -rf ~/git/smapserver2/setup/install/* ~/deploy/smap/install

# Override the opensource deploy with the standard deploy
cp -rf ~/git/prop-smapserver/smap/deploy/deploy.sh ~/deploy/smap/deploy

# Get miscelaneous files
cp ~/deploy/fieldTask.apk ~/deploy/smap/deploy/version1
cp ~/deploy/fieldTaskPreJellyBean.apk ~/deploy/smap/deploy/version1
cp ~/deploy/smapUploader.jar ~/deploy/smap/deploy/version1
cp ~/deploy/codebook.jar ~/deploy/smap/deploy/version1
cp -rf ~/deploy/subscribers ~/deploy/smap/deploy/version1
