/** Shared list for PATCH whitelist and modal form (no server-only imports). */
export const upload_meta_editable_field_list = [
	{ key: 'original_filename', label: 'Original filename', kind: 'text' },
	{ key: 'make', label: 'Camera make', kind: 'text' },
	{ key: 'model', label: 'Camera model', kind: 'text' },
	{ key: 'lens_make', label: 'Lens make', kind: 'text' },
	{ key: 'lens_model', label: 'Lens model', kind: 'text' },
	{ key: 'datetime_original', label: 'Date / time (original)', kind: 'text' },
	{ key: 'datetime_digitized', label: 'Date / time (digitized)', kind: 'text' },
	{ key: 'exposure_time', label: 'Exposure time (text)', kind: 'text' },
	{ key: 'exposure_time_seconds', label: 'Exposure (seconds)', kind: 'number' },
	{ key: 'f_number', label: 'F-number', kind: 'number' },
	{ key: 'iso_speed', label: 'ISO', kind: 'number' },
	{ key: 'focal_length', label: 'Focal length (mm)', kind: 'number' },
	{ key: 'focal_length_in_35mm_film', label: 'Focal length (35mm eq.)', kind: 'number' },
	{ key: 'image_width', label: 'Image width', kind: 'number' },
	{ key: 'image_height', label: 'Image height', kind: 'number' },
	{ key: 'pixel_x_dimension', label: 'Pixel width', kind: 'number' },
	{ key: 'pixel_y_dimension', label: 'Pixel height', kind: 'number' },
	{ key: 'rating', label: 'Rating', kind: 'number' },
	{ key: 'title', label: 'Title', kind: 'text' },
	{ key: 'headline', label: 'Headline', kind: 'text' },
	{ key: 'caption', label: 'Caption', kind: 'text' },
	{ key: 'image_description', label: 'Description', kind: 'text' },
	{ key: 'artist', label: 'Artist', kind: 'text' },
	{ key: 'copyright', label: 'Copyright', kind: 'text' },
	{ key: 'user_comment', label: 'User comment', kind: 'textarea' },
	{ key: 'keywords', label: 'Keywords', kind: 'text' },
	{ key: 'label', label: 'Label', kind: 'text' },
	{ key: 'city', label: 'City', kind: 'text' },
	{ key: 'state', label: 'State / province', kind: 'text' },
	{ key: 'country', label: 'Country', kind: 'text' },
	{ key: 'sublocation', label: 'Sublocation', kind: 'text' },
	{ key: 'event', label: 'Event', kind: 'text' },
	{ key: 'software', label: 'Software', kind: 'text' }
] as const;

export type upload_meta_editable_field_key =
	(typeof upload_meta_editable_field_list)[number]['key'];
