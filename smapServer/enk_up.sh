#!/bin/sh

cp ~/git/webform/build/css/* ./WebContent/build/css
cp ~/git/webform/build/fonts/* ./WebContent/build/fonts

rm -rf ./WebContent/build/locales/*
for d in ~/git/webform/locales/* ; do
    if [ -d "$d" ]; then 
        n=$(basename "$d")
        echo "Getting translation file for " $n

        mkdir ./WebContent/build/locales/$n
        cp $d/translation.json ./WebContent/build/locales/$n/translation.json
    fi
done

