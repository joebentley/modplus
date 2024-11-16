#!/bin/bash
# remove spaces from file names
for file in *; do mv "$file" "$(echo $file tr -d ' ')" ; done
# list files in the directory as a comma separated list
ls -1 | xargs -I {} echo "'{}',"
