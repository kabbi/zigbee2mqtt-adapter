#!/bin/bash -e

RELEASE_VERSION="$1"
NODE_VERSION="$2"

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
echo "old name: $TARFILE"

mv ${TARFILE} zigbee2mqtt-adapter-${RELEASE_VERSION}-v${NODE_VERSION}.tgz
mv ${TARFILE}.sha256sum zigbee2mqtt-adapter-${RELEASE_VERSION}-v${NODE_VERSION}.tgz.shasum

exit 0
