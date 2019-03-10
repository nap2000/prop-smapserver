#!/bin/sh

if [ $# -lt "1" ]; then
        echo "usage $0 survey_ident"
fi

echo "================================================="
echo "processing $0 $1" 

ident=$1
restoreDir="/smap/uploadedSurveys/$ident"
awsPath="s3://`cat ~ubuntu/bucket`/uploadedSurveys/$ident"

/usr/local/bin/aws s3 sync $awsPath $restoreDir
exitValue=$?

exit $exitValue
