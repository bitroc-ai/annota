#!/bin/bash
# Fix $lib imports in MDX files to use relative paths or keep $lib if alias works

find src/pages -name "*.mdx" -type f | while read file; do
  # Count $lib imports
  if grep -q '\$lib' "$file"; then
    echo "Found \$lib imports in: $file"
    # For now, just report - we'll keep $lib since we set up the alias
  fi
done
