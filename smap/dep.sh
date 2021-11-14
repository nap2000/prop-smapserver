#!/bin/sh

# Delete existing setting deployment directory
rm -rf ~/deploy/smap

# Copy files to deploy
cp -rf ~/git/prop-smapserver/smap ~/deploy

# Get files from open source release
cp ~/git/smapserver2/setup/patch/*.sql ~/deploy/smap/deploy
cp ~/git/smapserver2/setup/install/*.sql ~/deploy/smap/install

# Get miscelaneous files
cp ~/deploy/fieldTask.apk ~/deploy/smap/deploy/version1
cp ~/deploy/fieldTaskPreJellyBean.apk ~/deploy/smap/deploy/version1
cp ~/deploy/smapUploader.jar ~/deploy/smap/deploy/version1
cp ~/deploy/codebook.jar ~/deploy/smap/deploy/version1
cp -rf ~/deploy/subscribers ~/deploy/smap/deploy/version1
