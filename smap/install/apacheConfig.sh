#!/bin/sh

echo "Updating Tomcat configuation"
tc_server_xml="/etc/tomcat7/server.xml"	
sudo cp config_files/server.xml $tc_server_xml

echo "Setting up Apache 2.4"
a_config_dir="/etc/apache2/sites-available"	

sudo cp $a_config_dir/smap-volatile.conf $a_config_dir/smap-volatile.conf.bu
sudo cp config_files/a24-smap-volatile.conf $a_config_dir/smap-volatile.conf

# Add a default setting of 127.0.0.1 as the DBHOST if it has not already been set
dbhost_set=`grep DBHOST /etc/environment | wc -l`
if [ $dbhost_set -eq 0 ]; then
    echo "export DBHOST=127.0.0.1" >> /etc/environment
fi

# Ensure apache loads the environment variables
avars_set=`grep "\. /etc/environment" /etc/apache2/envvars | wc -l`
if [ $avars_set -eq 0 ]; then
    echo ". /etc/environment" >> /etc/apache2/envvars
fi
sudo service apache2 reload

