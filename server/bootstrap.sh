#!/bin/bash

set -eu

# Define the paths to check and their types (file or directory)
declare -A paths=(
    ["./database.sqlite3"]="file"
    ["./maps"]="directory"
    ["./sm.txt"]="file"
    ["./authorised_names"]="file"
)

for path in "${!paths[@]}"; do
    if [ ! -e "$path" ]; then
        if [ "${paths[$path]}" = "file" ]; then
            touch "$path"
            echo "touch: Created file $path"
        elif [ "${paths[$path]}" = "directory" ]; then
            mkdir -vp "$path"
        else
            echo "Invalid type specified for $path"
            exit 1
        fi
    fi
done