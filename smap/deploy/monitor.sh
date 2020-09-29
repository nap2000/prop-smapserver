#!/bin/sh

u1604=`lsb_release -r | grep -c "16\.04"`
u1804=`lsb_release -r | grep -c "18\.04"`
u2004=`lsb_release -r | grep -c "20\.04"`

if [ $u2004 -eq 1 ]; then
    TOMCAT_VERSION=tomcat9
elif [ $u1804 -eq 1 ]; then
    TOMCAT_VERSION=tomcat8
else
    TOMCAT_VERSION=tomcat7
fi


export AWS_CONFIG_FILE=/usr/share/$TOMCAT_VERSION/lib/AwsCredentials.properties
mindisk="10.0"
server=`cat ~/hostname`
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
