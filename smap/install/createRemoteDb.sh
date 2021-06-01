#!/bin/sh
##### Script to create databases and users on remote RDS database

psql -h remote_host -U postgres -f ./createRemoteDb.sql 

