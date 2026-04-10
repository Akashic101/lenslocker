import { Camera, Eye, Image, Clock, SlidersVertical, Folder } from '@lucide/svelte';
import type { Component } from 'svelte';

export function meta_row_icon_for_key(key: string): Component {
	switch (key) {
		case 'camera':
			return Camera;
		case 'lens':
			return Eye;
		case 'dimensions':
			return Image;
		case 'datetime':
			return Clock;
		case 'file_size':
			return Folder;
		case 'exposure':
			return SlidersVertical;
		default:
			return Image;
	}
}
