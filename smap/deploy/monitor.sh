#!/bin/sh

export AWS_CONFIG_FILE=/usr/share/tomcat7/lib/AwsCredentials.properties
mindisk="4.0"
server=`cat ./hostname`
diskalert="false"
while true; do

    echo -n "."
    # Check for low disk
    avdisk=`df -H | grep xvda1 | awk '{print $4}' | tr -d G`
    totdisk=`df -H | grep xvda1 | awk '{print $3}' | tr -d G`

    if [ $diskalert = "false" ]
    then
        if [ 1 -eq "$(echo "${avdisk} < ${mindisk}" | bc)" ]
        then
            msg="Server: $server. Available disk is: $avdisk out of $totdisk"
	    diskalert="true"
            echo
	    echo $msg
            aws sns publish --region ap-southeast-2 --phone-number +61402975959 --message "$msg"
        fi
    fi

    sleep 100
done
