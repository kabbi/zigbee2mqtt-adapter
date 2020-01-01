#!/bin/bash

rm -f SHA256SUMS
sha256sum -- package.json manifest.json *.js LICENSE README.md > SHA256SUMS
npm pack

