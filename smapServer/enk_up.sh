#!/bin/sh

cp ~/git/webform/build/js/enketo-bundle.js ./WebContent/build/js/webform-bundle.js
cp ~/git/webform/build/css/* ./WebContent/build/css
cp ~/git/webform/build/fonts/* ./WebContent/build/fonts
cp -R ~/git/webform/locales ./WebContent/build/locales

cp ~/git/webform/webform/file-storage.js ./WebContent/build/js/file-storage.js
