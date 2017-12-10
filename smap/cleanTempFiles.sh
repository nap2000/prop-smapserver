#!/bin/sh
find /smap/temp/* -mtime +1 -exec rm -rf {} \; -mtime +1 -exec printf "Removed ‘%s’\n" {} \;
