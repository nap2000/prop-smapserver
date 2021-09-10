#!/bin/sh

export PATH=$PATH:/usr/local/bin

if [ $# -lt 5 ]; then
        echo "usage $0 database table sql file_name format"
        exit
fi

echo "================================================="
echo "processing $0 $1 $2 $3 $4 $5"

if [ "$5" = "shape" ]
then
	rm -rf $4
	rm $4.zip
	mkdir $4
#	echo "pgsql2shp -f $4/$2 -u ws -P ws1234 $1 \"$3\""
#	pgsql2shp -f $4/$2 -u ws -P ws1234 $1 "$3"
	echo  "ogr2ogr -f \"ESRI Shapefile\" $4/$2 PG:\"host=127.0.0.1 user=ws dbname=$1 password=ws1234\" -sql \"$3\""
	ogr2ogr -f "ESRI Shapefile" $4/$2 PG:"dbname=$1 host=127.0.0.1 user=ws password=ws1234" -sql "$3"
	zip -rj $4.zip $4
fi
if [ "$5" = "media" ]
then
	zip -rj $4.zip $4
fi
if [ "$5" = "kml" ]
then
	rm $4.kml
	rm $4.zip
	echo  "ogr2ogr -f \"KML\" $4.kml PG:\"host=127.0.0.1 user=ws dbname=$1 password=ws1234\" -sql \"$3\""
	ogr2ogr -f "KML" $4.kml PG:"dbname=$1 host=127.0.0.1 user=ws password=ws1234" -sql "$3"
	zip -rj $4.zip $4.kml
fi
if [ "$5" = "vrt" ] || [ "$5" = "stata" ]
then
	rm $4.zip
	PGPASSWORD=ws1234;export PGPASSWORD

	psql $1 -h 127.0.0.1 -U ws << EOF > $4/$2.csv
COPY ($3) TO STDOUT WITH CSV HEADER
EOF

	zip -rj $4.zip $4
fi

if [ "$5" = "csv" ]
then
	rm -rf $4
	rm $4.zip
	mkdir $4
	PGPASSWORD=ws1234;export PGPASSWORD

	psql $1 -h 127.0.0.1 -U ws << EOF > $4/$2.nb
COPY ($3) TO STDOUT WITH CSV HEADER
EOF

        cp /smap_bin/utf8-bom.txt $4/$2.csv
        cat $4/$2.nb >> $4/$2.csv
        rm $4/$2.nb

	zip -rj $4.zip $4/$2.csv
fi

if [ "$5" = "csvnozip" ]
then
        echo "csv extract without zip"
        rm $4
        rm $4.csv
        PGPASSWORD=ws1234;export PGPASSWORD

        psql $1 -h 127.0.0.1 -U ws << EOF > $4.csv
COPY ($3) TO STDOUT WITH CSV HEADER
EOF

fi



