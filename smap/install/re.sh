#!/bin/sh
  

if [ $# -lt "1" ]; then
        echo "usage $0 gpg file"
        exit
fi


# Get permission to proceed
echo "Restoring a database will erase the existing database on this server."
echo "The existing database will be backed up into replaced_sd.dmp and replaced_results.dmp"
read -r -p 'Do you want to continue? (y/n) ' choice
echo $choice
case $choice in
        n|N) break;;
        y|Y)

echo "progressing...."

rm -rf restore/*
rm out_bu.tgz

echo "restoring: " + $1

# Decrypt
echo `cat passwordfile` | gpg  --batch -q --passphrase-fd 0 -o out_bu.tgz  -d $1

tar -xzf out_bu.tgz  -C restore

# Backup the existing database
pg_dump -c -Fc survey_definitions > replaced_sd.dmp
pg_dump -c -Fc results > replaced_results.dmp

# delete the existing databases
echo "drop database survey_definitions" | psql
echo "drop database results" | psql

# Create empty versions of the databases
createdb -E UTF8 -O ws survey_definitions
echo "CREATE EXTENSION postgis;" | psql -d survey_definitions
echo "ALTER TABLE geometry_columns OWNER TO ws; ALTER TABLE spatial_ref_sys OWNER TO ws; ALTER TABLE geography_columns OWNER TO ws;" | psql -d survey_definitions

createdb -E UTF8 -O ws results
echo "CREATE EXTENSION postgis;" | psql -d results
echo "ALTER TABLE geometry_columns OWNER TO ws; ALTER TABLE spatial_ref_sys OWNER TO ws; ALTER TABLE geography_columns OWNER TO ws;" | psql -d results

# restore the databse
# pg_restore -c -d survey_definitions restore/backups/sd.dmp
# pg_restore -c -d results restore/backups/results.dmp
esac


# pg_restore -c -d survey_definitions sd.dmp
# pg_restore -c -d results results.dmp

