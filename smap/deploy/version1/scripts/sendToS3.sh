#!/bin/sh

if [ $# -lt "1" ]; then
	echo "usage $0 filepath
fi

echo "================================================="
echo "processing $0 $1" 

filepath=$1

# If there is an s3 bucket available then send the file to it`
if [ -f ~ubuntu/bucket ]; then

        prefix="/smap"
        region=`cat ~ubuntu/region`

        if [ -f  $filepath ]; then
                relPath=${filepath#"$prefix"}
                awsPath="s3://`cat ~ubuntu/bucket`$relPath"
                /usr/bin/aws s3 --region $region cp $filepath $awsPath
        fi
fi
