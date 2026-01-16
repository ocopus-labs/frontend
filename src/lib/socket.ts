import { io, Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

export interface OrderSocketEvents {
	'order:created': (order: any) => void;
	'order:updated': (order: any) => void;
	'order:completed': (data: { orderId: string }) => void;
	'item:status': (data: { orderId: string; itemId: string; status: string; order: any }) => void;
}

export function getSocket(): Socket | null {
	if (!browser) return null;

	if (!socket) {
		const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
		socket = io(`${backendUrl}/orders`, {
			withCredentials: true,
			autoConnect: false
		});

		socket.on('connect', () => {
			console.log('[Socket] Connected to orders namespace');
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

export function connectSocket(): Socket | null {
	const sock = getSocket();
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

export function joinBusiness(businessId: string): void {
	const sock = getSocket();
	if (sock?.connected) {
		sock.emit('join:business', businessId);
		console.log('[Socket] Joining business room:', businessId);
	}
}

export function leaveBusiness(businessId: string): void {
	const sock = getSocket();
	if (sock?.connected) {
		sock.emit('leave:business', businessId);
		console.log('[Socket] Leaving business room:', businessId);
	}
}

export function onOrderCreated(callback: OrderSocketEvents['order:created']): () => void {
	const sock = getSocket();
	if (sock) {
		sock.on('order:created', callback);
		return () => sock.off('order:created', callback);
	}
	return () => {};
}

export function onOrderUpdated(callback: OrderSocketEvents['order:updated']): () => void {
	const sock = getSocket();
	if (sock) {
		sock.on('order:updated', callback);
		return () => sock.off('order:updated', callback);
	}
	return () => {};
}

export function onOrderCompleted(callback: OrderSocketEvents['order:completed']): () => void {
	const sock = getSocket();
	if (sock) {
		sock.on('order:completed', callback);
		return () => sock.off('order:completed', callback);
	}
	return () => {};
}

export function onItemStatus(callback: OrderSocketEvents['item:status']): () => void {
	const sock = getSocket();
	if (sock) {
		sock.on('item:status', callback);
		return () => sock.off('item:status', callback);
	}
	return () => {};
}
