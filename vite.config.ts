import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					// Vendor chunk: D3 ecosystem (charts)
					if (id.includes('node_modules/d3-') || id.includes('node_modules/layerchart')) {
						return 'vendor-charts';
					}
					// Vendor chunk: socket.io
					if (id.includes('node_modules/socket.io') || id.includes('node_modules/engine.io')) {
						return 'vendor-socket';
					}
					// Vendor chunk: TanStack table
					if (id.includes('node_modules/@tanstack')) {
						return 'vendor-table';
					}
					// Vendor chunk: auth libraries
					if (id.includes('node_modules/better-auth') || id.includes('node_modules/@dodopayments/better-auth')) {
						return 'vendor-auth';
					}
					// Vendor chunk: form/UI libraries
					if (id.includes('node_modules/bits-ui') || id.includes('node_modules/formsnap') || id.includes('node_modules/sveltekit-superforms')) {
						return 'vendor-ui';
					}
				}
			}
		}
	},
	server: {
		allowedHosts: ['frontend.rohitk06.in'],
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	},
	preview: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
});
