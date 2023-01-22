#!/bin/bash -e

# Setup environment for building inside Dockerized toolchain
export NVM_DIR="${HOME}/.nvm"
[ -s "${NVM_DIR}/nvm.sh" ] && source "${NVM_DIR}/nvm.sh"
[ $(id -u) = 0 ] && umask 0

if [ -z "${ADDON_ARCH}" ]; then
  # This means we're running locally. Fake out ADDON_ARCH.
  # This happens when you run ./package.sh locally
  UNAME=$(uname -s)
  case "${UNAME}" in

    Linux)
      ADDON_ARCH=linux-arm
      ;;

    Darwin)
      ADDON_ARCH=darwin-x64
      ;;

    *)
      echo "Unrecognized uname -s: ${UNAME}"
      exit 1
      ;;
  esac
  echo "Faking ADDON_ARCH = ${ADDON_ARCH}"
else
  echo "ADDON_ARCH = ${ADDON_ARCH}"
fi
echo "ADDON_ARCH = ${ADDON_ARCH}"


rm -rf node_modules

if [ -z "${ADDON_ARCH}" ]; then
  TARFILE_SUFFIX=
else
  NODE_VERSION="$(node --version)"
  TARFILE_SUFFIX="-${ADDON_ARCH}-${NODE_VERSION/\.*/}"
fi
echo "TARFILE_SUFFIX: $TARFILE_SUFFIX"
npm ci
shasum --algorithm 256 manifest.json package.json package-lock.json *.js LICENSE README.md > SHA256SUMS
find css images js node_modules views \( -type f -o -type l \) -exec shasum --algorithm 256 {} \; >> SHA256SUMS

TARFILE=`npm pack`
echo "TARFILE after npm pack: $TARFILE"
tar xzf ${TARFILE}
rm ${TARFILE}
TARFILE_ARCH="${TARFILE/.tgz/${TARFILE_SUFFIX}.tgz}"
cp package-lock.json ./package
cp -r node_modules ./package
echo "TARFILE_ARCH: $TARFILE_ARCH"
tar czf ${TARFILE_ARCH} package

shasum --algorithm 256 ${TARFILE_ARCH} > ${TARFILE_ARCH}.sha256sum

rm -rf SHA256SUMS package

exit 0
