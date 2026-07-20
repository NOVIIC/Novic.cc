const CACHE_NAME = 'mdx-editor-v1';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) =>
				Promise.all(
					[
						'/editor/',
						'/manifest-editor.json',
						'/favicon.svg',
						'/favicon.ico',
						'/editor-icons/icon-192.png',
						'/editor-icons/icon-512.png',
					].map((url) => cache.add(url).catch(() => {})),
				),
			),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
				),
			),
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (url.origin !== location.origin) return;
	if (request.method !== 'GET') return;

	if (url.pathname.startsWith('/_astro/')) {
		event.respondWith(
			caches.match(request).then((cached) => cached || fetchAndCache(request)),
		);
		return;
	}

	if (url.pathname.startsWith('/editor/')) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => caches.match(request)),
		);
		return;
	}

	if (
		url.pathname.startsWith('/favicon') ||
		url.pathname.startsWith('/editor-icons/')
	) {
		event.respondWith(
			caches.match(request).then((cached) => cached || fetchAndCache(request)),
		);
		return;
	}
});

async function fetchAndCache(request) {
	const response = await fetch(request);
	if (response.ok) {
		const clone = response.clone();
		caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
	}
	return response;
}
