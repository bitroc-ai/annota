#!/bin/bash
# Migrate MDX files from src/routes to src/pages

find src/routes -name "*.mdx" -type f | while read file; do
  # Convert route path to page path
  # src/routes/docs/getting-started/installation/+page.mdx -> src/pages/docs/getting-started/installation.mdx
  page_path=$(echo "$file" | sed 's|src/routes/||' | sed 's|/+page\.mdx$|.mdx|' | sed 's|/index\.mdx$|.mdx|')
  target="src/pages/$page_path"
  
  # Create directory if needed
  mkdir -p "$(dirname "$target")"
  
  # Copy file
  cp "$file" "$target"
  echo "Migrated: $file -> $target"
done
