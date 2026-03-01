import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		devtoolsJson(),
		SvelteKitPWA({
			registerType: 'prompt',
			devOptions: {
				enabled: false
			},
			manifest: {
				name: 'RestaurantPro',
				short_name: 'RestaurantPro',
				description: 'Multi-tenant POS and billing platform for restaurants, salons, gyms, cafes and more',
				theme_color: '#b45a1e',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
				navigateFallback: null,
				runtimeCaching: [
					{
						urlPattern: ({ request }) => request.mode === 'navigate',
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pages-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 // 1 day
							},
							cacheableResponse: {
								statuses: [0, 200]
							},
							networkTimeoutSeconds: 5
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'gstatic-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /\/api\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 5 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							},
							networkTimeoutSeconds: 10
						}
					}
				]
			}
		})
	],
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
