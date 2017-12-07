#!/bin/sh
find /smap/temp/* -mtime +4 -exec rm -rf {} \;
