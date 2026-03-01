import type { Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

let socket: Socket | null = null;
let ioModule: typeof import('socket.io-client') | null = null;

export interface OrderSocketEvents {
	'order:created': (order: any) => void;
	'order:updated': (order: any) => void;
	'order:completed': (data: { orderId: string }) => void;
	'item:status': (data: { orderId: string; itemId: string; status: string; order: any }) => void;
}

async function loadSocketIO() {
	if (!ioModule) {
		ioModule = await import('socket.io-client');
	}
	return ioModule;
}

export async function getSocket(): Promise<Socket | null> {
	if (!browser) return null;

	if (!socket) {
		const { io } = await loadSocketIO();
		const backendUrl = env.PUBLIC_API_BASE?.replace('/api', '') || 'http://localhost:3000';
		socket = io(`${backendUrl}/orders`, {
			withCredentials: true,
			autoConnect: false,
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionAttempts: 10,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			timeout: 10000
		});

		socket.on('connect', () => {
			console.log('[Socket] Connected:', socket?.id);
		});

		socket.on('disconnect', (reason) => {
			console.log('[Socket] Disconnected:', reason);
		});

		socket.on('connect_error', (error) => {
			console.error('[Socket] Connection error:', error.message);
		});
	}

	return socket;
}

export async function connectSocket(): Promise<Socket | null> {
	const sock = await getSocket();
	if (sock && !sock.connected) {
		sock.connect();
	}
	return sock;
}

export function disconnectSocket(): void {
	if (socket?.connected) {
		socket.disconnect();
	}
}

export async function joinBusiness(businessId: string): Promise<void> {
	const sock = await getSocket();
	if (sock?.connected) {
		sock.emit('join:business', businessId);
	}
}

export async function leaveBusiness(businessId: string): Promise<void> {
	const sock = await getSocket();
	if (sock?.connected) {
		sock.emit('leave:business', businessId);
	}
}

export async function onOrderCreated(callback: OrderSocketEvents['order:created']): Promise<() => void> {
	const sock = await getSocket();
	if (sock) {
		sock.on('order:created', callback);
		return () => sock.off('order:created', callback);
	}
	return () => {};
}

export async function onOrderUpdated(callback: OrderSocketEvents['order:updated']): Promise<() => void> {
	const sock = await getSocket();
	if (sock) {
		sock.on('order:updated', callback);
		return () => sock.off('order:updated', callback);
	}
	return () => {};
}

export async function onOrderCompleted(callback: OrderSocketEvents['order:completed']): Promise<() => void> {
	const sock = await getSocket();
	if (sock) {
		sock.on('order:completed', callback);
		return () => sock.off('order:completed', callback);
	}
	return () => {};
}

export async function onItemStatus(callback: OrderSocketEvents['item:status']): Promise<() => void> {
	const sock = await getSocket();
	if (sock) {
		sock.on('item:status', callback);
		return () => sock.off('item:status', callback);
	}
	return () => {};
}
