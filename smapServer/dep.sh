#!/bin/sh

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
BUILD_ID=${BUILD_ID:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}

add_build_id_cache_busting() {
	target_dir=$1
	if [ ! -d "$target_dir" ]
	then
		return
	fi

	find "$target_dir" -type f -name "*.html" | while IFS= read -r html_file
	do
		python3 - "$html_file" "$BUILD_ID" <<'PY'
import re
import sys

path = sys.argv[1]
build_id = sys.argv[2]

with open(path, "r", encoding="utf-8") as f:
	text = f.read()

if "window.__BUILD_ID__" not in text:
	text = re.sub(r"<head>", "<head>\n\t<script>window.__BUILD_ID__='" + build_id + "';</script>", text, count=1)

asset_re = re.compile(r"(\b(?:src|href)=['\"])(/[^'\"?#]+\.(?:js|css|json|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot))(\?[^'\"#]*)?(['\"])")

def repl(match):
	prefix, url, query, suffix = match.groups()
	query = query or ""
	if re.search(r"(?:^|[?&])_v=", query):
		return prefix + url + query + suffix
	sep = "?" if query == "" else "&"
	return prefix + url + query + sep + "_v=" + build_id + suffix

text = asset_re.sub(repl, text)

with open(path, "w", encoding="utf-8") as f:
	f.write(text)
PY
	done
}

# Minify the smap server code
echo "--------------------------- build smap server code"

# Run webpack build for bundled entrypoints
if [ "$1" = develop ]
then
	npm run build:dev
else
	npm run build
fi

export COPYFILE_DISABLE=true
# Create a tar file and copy to the deploy directory
echo "Removing contents of $SCRIPT_DIR/smapServer"
rm -rf "$SCRIPT_DIR/smapServer"
echo "Copying $SCRIPT_DIR/WebContent to $SCRIPT_DIR/smapServer"
cp -R "$SCRIPT_DIR/WebContent" "$SCRIPT_DIR/smapServer"

# Include webform javascript bundle and css files
echo "Adding webform bundle to $SCRIPT_DIR/smapServer"
pushd /Users/neilpenman/git/webform
./deploy.sh $1
popd
cp -R WebContent/build $SCRIPT_DIR/smapServer

add_build_id_cache_busting "$SCRIPT_DIR/smapServer"

cd "$SCRIPT_DIR/smapServer"
tar --no-xattrs -zcf smapServer.tgz *
cp smapServer.tgz ~/deploy/smap/deploy/version1
rm smapServer.tgz
cd "$SCRIPT_DIR"

# deploy to local
docdir=$WEBSITE_DOCS

echo "Website: $WEBSITE_DOCS"
echo "Deploying to: $docdir"
sudo rm -R $docdir/js
sudo rm -R $docdir/build
sudo cp -R smapServer/* $docdir
sudo apachectl restart

# clean up the temporary smapServer directory but first check that it is the right one
if [ -f dep.sh ]
then
	rm -rf smapServer
fi
