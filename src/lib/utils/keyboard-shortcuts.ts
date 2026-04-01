export interface ShortcutConfig {
	key: string;
	handler: () => void;
	description: string;
	modifier?: 'ctrl' | 'alt' | 'shift';
}

export function createShortcutHandler(shortcuts: ShortcutConfig[]) {
	return (event: KeyboardEvent) => {
		// Don't trigger when typing in inputs
		const target = event.target as HTMLElement;
		if (
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.tagName === 'SELECT' ||
			target.isContentEditable
		) {
			return;
		}

		for (const shortcut of shortcuts) {
			const keyMatch = event.key === shortcut.key;
			const modifierMatch =
				!shortcut.modifier ||
				(shortcut.modifier === 'ctrl' && (event.ctrlKey || event.metaKey)) ||
				(shortcut.modifier === 'alt' && event.altKey) ||
				(shortcut.modifier === 'shift' && event.shiftKey);

			if (keyMatch && modifierMatch) {
				event.preventDefault();
				shortcut.handler();
				return;
			}
		}
	};
}
