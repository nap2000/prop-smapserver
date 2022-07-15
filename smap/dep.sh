#!/bin/sh

# Delete existing setting deployment directory
rm -rf ~/deploy/smap

# Copy files to deploy
cp -rf ~/git/prop-smapserver/smap ~/deploy

# Get files from open source release
cp -rf ~/git/smapserver2/setup/deploy/* ~/deploy/smap/deploy
cp -rf ~/git/smapserver2/setup/install/* ~/deploy/smap/install

# Restore credentials file
cp -rf ~/git/prop-smapserver/smap/deploy/version1/resources/properties/setcredentials.sh ~/deploy/smap/deploy/version1/resources/properties

# Append proprietary components to deploy script
echo "# Hosted Only\ncd \$cwd\n cat rates.sql | sudo -i -u postgres \$PSQL -q -d survey_definitions 2>&1 | grep -v duplicate | grep -v \"already exists\"" >> ~/deploy/smap/deploy/deploy.sh

# Get miscelaneous files
cp ~/deploy/fieldTask.apk ~/deploy/smap/deploy/version1
cp ~/deploy/fieldTaskPreJellyBean.apk ~/deploy/smap/deploy/version1
cp ~/deploy/smapUploader.jar ~/deploy/smap/deploy/version1
cp ~/deploy/codebook.jar ~/deploy/smap/deploy/version1
cp -rf ~/deploy/subscribers ~/deploy/smap/deploy/version1
