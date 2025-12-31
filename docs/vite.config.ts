import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	resolve: {
		alias: {
			'annota/svelte': '/Users/hugh/bitroc/annota/src/svelte/index.ts',
			'annota': '/Users/hugh/bitroc/annota/dist/index.mjs'
		},
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.svelte']
	}
});
