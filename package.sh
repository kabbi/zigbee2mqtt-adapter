#!/bin/bash -e

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

# does this become something like this? zigbee2mqtt-adapter-${{ env.RELEASE_VERSION }}-v${{ matrix.node-version }}.tgz
