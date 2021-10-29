#!/bin/sh
# deploy clients only without stopping the server

deploy_from=version1

if [ -e $deploy_from/smapServer.tgz ]
then
	echo "Updating smapServer"
	rm -rf /var/www/smap/OpenLayers
	rm -rf /var/www/smap/js
	rm -rf /var/www/smap/css
	rm -rf /var/www/smap/*.html
	rm -rf /var/www/smap/*.js
        rm -rf /var/www/smap/*.json
	tar -xzf $deploy_from/smapServer.tgz -C /var/www/smap
fi

if [ -e $deploy_from/fieldAnalysis.tgz ]
then
        echo "Updating fieldAnalysis"
        rm -rf /var/www/smap/fieldAnalysis
        rm -rf /var/www/smap/app/fieldAnalysis
        tar -xzf $deploy_from/fieldAnalysis.tgz -C /var/www/smap/app
fi

if [ -e $deploy_from/fieldManager.tgz ]
then
        echo "Updating fieldManager"
        rm -rf /var/www/smap/fieldManager
        rm -rf /var/www/smap/app/fieldManager

        tar -xzf $deploy_from/fieldManager.tgz -C /var/www/smap/app
fi

if [ -e $deploy_from/tasks.tgz ]
then
        echo "Updating tasks"
        rm -rf /var/www/smap/tasks
        rm -rf /var/www/smap/app/tasks
        tar -xzf $deploy_from/tasks.tgz -C /var/www/smap/app
fi

if [ -e $deploy_from/myWork.tgz ]
then
        echo "Updating myWork"
        rm -rf /var/www/smap/myWork
        rm -rf /var/www/smap/app/myWork
        tar -xzf $deploy_from/myWork.tgz -C /var/www/smap/app
fi

if [ -e $deploy_from/dashboard.tgz ]
then
        echo "Dashboard"
        rm -rf /var/www/smap/dashboard
        tar -xzf $deploy_from/dashboard.tgz -C /var/www/smap
fi

# Copy any customised files
if [ -e ../../custom/web ]
then
        echo "copy custom web files"
        cp -vr ../../custom/web/* /var/www/smap
fi
if [ -e ../../custom/subscribers/default ]
then
        echo "copy custom subscriber data files"
        cp -v ../../custom/subscribers/default/* /smap_bin/default
fi

