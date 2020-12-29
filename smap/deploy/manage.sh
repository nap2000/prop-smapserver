#!/bin/sh

cd ~/smap/deploy
kill -9 `cat ~/mon_pid.txt`
rm ~/mon_pid.txt
rm nohup.out

nohup ./monitor.sh &
echo $! > ~/mon_pid.txt
