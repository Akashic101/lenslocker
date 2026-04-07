import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

/**
 * One row per uploaded RAW (or other image) file. Scalar EXIF/IPTC/XMP/GPS fields as columns;
 * `exifr_full_json` stores the full merged parser output for anything not mapped here.
 */
export const raw_image_upload = sqliteTable(
	'raw_image_upload',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		user_id: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),

		// --- storage & file ---
		original_filename: text('original_filename').notNull(),
		stored_filename: text('stored_filename').notNull(),
		relative_storage_path: text('relative_storage_path').notNull(),
		byte_size: integer('byte_size', { mode: 'number' }).notNull(),
		mime_type: text('mime_type'),
		sha256_hex: text('sha256_hex').notNull(),
		uploaded_at_ms: integer('uploaded_at_ms', { mode: 'number' }).notNull(),

		/** 0 = not starred, 1 = starred (app UI). */
		starred: integer('starred', { mode: 'number' }).notNull().default(0),
		/** When set, image is hidden from the main gallery (soft delete / archive). */
		archived_at_ms: integer('archived_at_ms', { mode: 'number' }),

		// --- image geometry & photometry ---
		pixel_x_dimension: integer('pixel_x_dimension', { mode: 'number' }),
		pixel_y_dimension: integer('pixel_y_dimension', { mode: 'number' }),
		image_width: integer('image_width', { mode: 'number' }),
		image_height: integer('image_height', { mode: 'number' }),
		orientation: integer('orientation', { mode: 'number' }),
		bits_per_sample: text('bits_per_sample'),
		color_space: text('color_space'),
		components_configuration: text('components_configuration'),
		compressed_bits_per_pixel: text('compressed_bits_per_pixel'),
		photometric_interpretation: text('photometric_interpretation'),
		samples_per_pixel: integer('samples_per_pixel', { mode: 'number' }),
		planar_configuration: integer('planar_configuration', { mode: 'number' }),
		x_resolution: text('x_resolution'),
		y_resolution: text('y_resolution'),
		resolution_unit: integer('resolution_unit', { mode: 'number' }),
		rows_per_strip: integer('rows_per_strip', { mode: 'number' }),
		tile_width: integer('tile_width', { mode: 'number' }),
		tile_length: integer('tile_length', { mode: 'number' }),

		// --- camera / lens / device ---
		make: text('make'),
		model: text('model'),
		lens_make: text('lens_make'),
		lens_model: text('lens_model'),
		lens_serial_number: text('lens_serial_number'),
		body_serial_number: text('body_serial_number'),
		internal_serial_number: text('internal_serial_number'),
		software: text('software'),
		firmware_version: text('firmware_version'),
		unique_camera_model: text('unique_camera_model'),
		localized_camera_model: text('localized_camera_model'),
		camera_owner_name: text('camera_owner_name'),
		label_name: text('label_name'),

		// --- date & time ---
		datetime_original: text('datetime_original'),
		datetime_digitized: text('datetime_digitized'),
		datetime_created: text('datetime_created'),
		subsec_time: text('subsec_time'),
		subsec_time_original: text('subsec_time_original'),
		subsec_time_digitized: text('subsec_time_digitized'),
		offset_time: text('offset_time'),
		offset_time_original: text('offset_time_original'),
		offset_time_digitized: text('offset_time_digitized'),

		// --- exposure & shooting ---
		exposure_time: text('exposure_time'),
		exposure_time_seconds: real('exposure_time_seconds'),
		f_number: real('f_number'),
		aperture_value: real('aperture_value'),
		max_aperture_value: real('max_aperture_value'),
		exposure_program: integer('exposure_program', { mode: 'number' }),
		iso_speed: integer('iso_speed', { mode: 'number' }),
		iso_speed_ratings: text('iso_speed_ratings'),
		recommended_exposure_index: integer('recommended_exposure_index', { mode: 'number' }),
		shutter_speed_value: text('shutter_speed_value'),
		brightness_value: text('brightness_value'),
		exposure_bias_value: text('exposure_bias_value'),
		exposure_index: text('exposure_index'),
		metering_mode: integer('metering_mode', { mode: 'number' }),
		light_source: integer('light_source', { mode: 'number' }),
		flash: integer('flash', { mode: 'number' }),
		focal_length: real('focal_length'),
		focal_length_in_35mm_film: integer('focal_length_in_35mm_film', { mode: 'number' }),
		subject_distance: text('subject_distance'),
		subject_distance_range: integer('subject_distance_range', { mode: 'number' }),
		exposure_mode: integer('exposure_mode', { mode: 'number' }),
		white_balance: integer('white_balance', { mode: 'number' }),
		white_balance_temperature: integer('white_balance_temperature', { mode: 'number' }),
		scene_capture_type: integer('scene_capture_type', { mode: 'number' }),
		gain_control: integer('gain_control', { mode: 'number' }),
		contrast: integer('contrast', { mode: 'number' }),
		saturation: integer('saturation', { mode: 'number' }),
		sharpness: integer('sharpness', { mode: 'number' }),
		subject_area: text('subject_area'),
		digital_zoom_ratio: text('digital_zoom_ratio'),
		focal_plane_x_resolution: text('focal_plane_x_resolution'),
		focal_plane_y_resolution: text('focal_plane_y_resolution'),
		focal_plane_resolution_unit: integer('focal_plane_resolution_unit', { mode: 'number' }),
		sensing_method: integer('sensing_method', { mode: 'number' }),
		custom_rendered: integer('custom_rendered', { mode: 'number' }),
		digital_gain: text('digital_gain'),
		scene_type: text('scene_type'),
		composite_image: integer('composite_image', { mode: 'number' }),
		source_exposure_times_of_composite_image: text('source_exposure_times_of_composite_image'),

		// --- GPS ---
		gps_latitude: real('gps_latitude'),
		gps_longitude: real('gps_longitude'),
		gps_altitude: real('gps_altitude'),
		gps_latitude_ref: text('gps_latitude_ref'),
		gps_longitude_ref: text('gps_longitude_ref'),
		gps_altitude_ref: integer('gps_altitude_ref', { mode: 'number' }),
		gps_img_direction: real('gps_img_direction'),
		gps_img_direction_ref: text('gps_img_direction_ref'),
		gps_speed: real('gps_speed'),
		gps_speed_ref: text('gps_speed_ref'),
		gps_timestamp: text('gps_timestamp'),
		gps_date_stamp: text('gps_date_stamp'),
		gps_dest_bearing: real('gps_dest_bearing'),
		gps_dest_bearing_ref: text('gps_dest_bearing_ref'),
		gps_h_positioning_error: real('gps_h_positioning_error'),
		gps_map_datum: text('gps_map_datum'),
		gps_processing_method: text('gps_processing_method'),
		gps_area_information: text('gps_area_information'),

		// --- IPTC / XMP / descriptive ---
		image_description: text('image_description'),
		artist: text('artist'),
		copyright: text('copyright'),
		user_comment: text('user_comment'),
		xp_title: text('xp_title'),
		xp_comment: text('xp_comment'),
		xp_keywords: text('xp_keywords'),
		xp_subject: text('xp_subject'),
		headline: text('headline'),
		title: text('title'),
		caption: text('caption'),
		instructions: text('instructions'),
		credit_line: text('credit_line'),
		source: text('source'),
		job_name: text('job_name'),
		category: text('category'),
		supplemental_categories: text('supplemental_categories'),
		keywords: text('keywords'),
		rating: integer('rating', { mode: 'number' }),
		label: text('label'),
		state: text('state'),
		country: text('country'),
		city: text('city'),
		sublocation: text('sublocation'),
		event: text('event'),
		person_shown: text('person_shown'),
		web_statement: text('web_statement'),
		rights: text('rights'),
		creator: text('creator'),
		creator_contact_info: text('creator_contact_info'),

		// --- RAW / DNG / calibration (often strings or JSON text) ---
		dng_version: text('dng_version'),
		dng_backward_version: text('dng_backward_version'),
		unique_camera_model_raw: text('unique_camera_model_raw'),
		color_matrix_1: text('color_matrix_1'),
		color_matrix_2: text('color_matrix_2'),
		analog_balance: text('analog_balance'),
		as_shot_neutral: text('as_shot_neutral'),
		camera_calibration_1: text('camera_calibration_1'),
		camera_calibration_2: text('camera_calibration_2'),
		reduction_matrix_1: text('reduction_matrix_1'),
		reduction_matrix_2: text('reduction_matrix_2'),
		baseline_exposure: text('baseline_exposure'),
		baseline_noise: text('baseline_noise'),
		baseline_sharpness: text('baseline_sharpness'),
		linear_response_limit: text('linear_response_limit'),
		shadow_scale: text('shadow_scale'),
		calibration_illuminant_1: integer('calibration_illuminant_1', { mode: 'number' }),
		calibration_illuminant_2: integer('calibration_illuminant_2', { mode: 'number' }),
		raw_data_unique_id: text('raw_data_unique_id'),
		original_raw_file_name: text('original_raw_file_name'),

		// --- full dump ---
		exifr_full_json: text('exifr_full_json')
	},
	(t) => [index('raw_image_upload_user_id_idx').on(t.user_id)]
);

export type RawImageUploadRow = typeof raw_image_upload.$inferSelect;
export type RawImageUploadInsert = typeof raw_image_upload.$inferInsert;
