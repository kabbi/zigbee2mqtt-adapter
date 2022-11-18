#!/bin/bash -e


#NODE_VERSION="$2"
NODE_VERSION=$(node -v | cut -d. -f1)

#RELEASE_VERSION="$1"
RELEASE_VERSION=$(grep '"version"' manifest.json | cut -d: -f2 | cut -d\" -f2)

echo "Release version $RELEASE_VERSION"
echo "Node version: $NODE_VERSION"

rm -rf node_modules

npm install --production

shasum --algorithm 256 manifest.json package.json *.js LICENSE README.md > SHA256SUMS

find css images js node_modules views \( -type f -o -type l \) -exec shasum --algorithm 256 {} \; >> SHA256SUMS

TARFILE=`npm pack`

tar xzf ${TARFILE}
cp -r node_modules ./package
tar czf ${TARFILE} package

shasum --algorithm 256 ${TARFILE} > ${TARFILE}.sha256sum

rm -rf SHA256SUMS package

# It needs to become something like this: zigbee2mqtt-adapter-${{ env.RELEASE_VERSION }}-v${{ matrix.node-vers>

echo "renaming files"
echo "old tar file: $TARFILE"

NEW_TARFILE="zigbee2mqtt-adapter-$RELEASE_VERSION-v$NODE_VERSION.tgz"
echo "new tar file: $NEW_TARFILE"

mv $TARFILE $NEW_TARFILE
mv $TARFILE.sha256sum $NEW_TARFILE.sha256sum

exit 0
