#!/bin/sh

echo "building webforms"
pushd ~/git/webform
grunt develop
popd

cp ~/git/webform/build/js/enketo-bundle.js WebContent/build/js/webform-bundle.js

if [ "$1" != develop ]
then
	rm WebContent/build/js/webform-bundle.min.js

        # uglify
        pushd ~/git/webform
        grunt minify
        popd

	cp ~/git/webform/build/js/bundle.min.js WebContent/build/js/webform-bundle.min.js

	# Skip minification
        # cp  WebContent/build/js/webform-bundle.js WebContent/build/js/webform-bundle.min.js

	#echo "--------------------------- transpiling with babel to es5"
	#babel WebContent/build/js/webform-bundle.js --out-file WebContent/build/js/webform-bundle.es5.js

	#echo "--------------------------- google closure compile"
	#java -jar ~/compiler-latest/closure-compiler-v20190106.jar --language_in ECMASCRIPT_2018 --js WebContent/build/js/webform-bundle.js --js_output_file WebContent/build/js/webform-bundle.min.js 

	# Use whitespace optimisation only "SIMPLE_OPTIMIZATION" as full opimisation causes code that triggers enabling of widgets to not work
	#java -jar ~/compiler-latest/closure-compiler-v20200719.jar --force_inject_library es6_runtime --compilation_level WHITESPACE_ONLY --js WebContent/build/js/webform-bundle.js --js_output_file WebContent/build/js/webform-bundle.min.js 

	# Use full optimisation as whitespace only caluse error on submit with missing jscomp
	#java -jar ~/compiler-latest/closure-compiler-v20200719.jar  --js WebContent/build/js/webform-bundle.es5.js --js_output_file WebContent/build/js/webform-bundle.min.js 

	#rm WebContent/build/js/webform-bundle.es5.js
else
        # Rename the non minified version so that it can be used
	cp ~/git/webform/build/js/enketo-bundle.js WebContent/build/js/webform-bundle.min.js

fi

./enk_up.sh

# Minify the smap server code
echo "--------------------------- minify smap server code"
#node tools/r.js -o tools/build.js
node tools/r_2_3_6.js -o tools/build.js

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
cp -R WebContent/build smapServer
cd smapServer
tar --no-xattrs -zcf smapServer.tgz *
cp smapServer.tgz ~/deploy
rm smapServer.tgz
cd ..

# deploy to local
sudo rm -R /Library/WebServer/Documents/js
sudo rm -R /Library/WebServer/Documents/build
sudo cp -R smapServer/* /Library/WebServer/Documents
sudo apachectl restart

# copy the motd
cp ~/motd.html /Library/WebServer/Documents

# clean up the temporary smapServer directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf smapServer
fi
