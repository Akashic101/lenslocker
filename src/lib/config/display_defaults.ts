/** App-wide display preferences (stored in `app_setting`). */

export type app_time_format = '24h' | '12h';

export type general_display_settings = {
	/** `24h` is default; `12h` uses AM/PM where supported. */
	time_format: app_time_format;
};

export const general_display_defaults: general_display_settings = {
	time_format: '24h'
};
