#!/bin/sh
# Make sure the top level directories do not get deleted
touch /smap/temp/donotdeleteme
touch /smap/uploadedSurveys/donotdeleteme
touch /smap/attachments/donotdeleteme

# Delete
find /smap/temp -mtime +2 -delete;
find /smap/uploadedSurveys -mtime +5 -delete
find /smap/attachments -mtime +5 -delete

# Remove flag files
rm /smap/temp/donotdeleteme
rm /smap/uploadedSurveys/donotdeleteme
rm /smap/attachments/donotdeleteme
