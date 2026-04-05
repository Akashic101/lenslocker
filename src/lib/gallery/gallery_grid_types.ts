export type gallery_grid_item = {
	relative_path: string;
	src: string;
	full_src: string | null;
	upload_id: string | null;
	starred: boolean;
	alt: string;
	meta: { rows: { key: string; text: string }[] } | null;
};
