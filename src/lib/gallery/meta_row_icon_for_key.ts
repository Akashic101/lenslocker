import {
	AdjustmentsHorizontalOutline,
	AdjustmentsVerticalOutline,
	CameraPhotoOutline,
	ClockOutline,
	EyeOutline,
	FolderOutline,
	ImageOutline
} from 'flowbite-svelte-icons';
import type { Component } from 'svelte';

export function meta_row_icon_for_key(key: string): Component {
	switch (key) {
		case 'camera':
			return CameraPhotoOutline;
		case 'lens':
			return EyeOutline;
		case 'dimensions':
			return ImageOutline;
		case 'datetime':
			return ClockOutline;
		case 'resolution':
			return AdjustmentsHorizontalOutline;
		case 'file_size':
			return FolderOutline;
		case 'exposure':
			return AdjustmentsVerticalOutline;
		default:
			return ImageOutline;
	}
}
