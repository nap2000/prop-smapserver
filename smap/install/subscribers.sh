#!/bin/sh
cd /smap_bin
. /smap_bin/setcredentials.sh
java -jar subscribers.jar $1 $2 $3 >> /var/log/subscribers/subscriber_$1_$3.log 2>&1
