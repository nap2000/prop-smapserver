#!/bin/sh

# Delete existing setting deployment directory
rm -rf ~/deploy/smap

# Copy files to deploy
cp -rf ~/git/prop-smapserver/smap ~/deploy

# Get files from open source release
cp ~/git/smapserver2/setup/patch/*.sql ~/deploy/smap/deploy
cp ~/git/smapserver2/setup/install/*.sql ~/deploy/smap/install
