import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		fs: {
			allow: ['..']
		}
	},
	resolve: {
		alias: {
			'annota/svelte': '../src/svelte/index.ts',
			'annota': '../dist/index.mjs'
		},
		extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.svelte']
	}
});
