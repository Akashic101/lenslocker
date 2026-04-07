import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { raw_image_upload, type RawImageUploadRow } from '$lib/server/db/raw_image_upload.schema';

type current_user = NonNullable<RequestEvent['locals']['user']>;

function require_current_user(event: RequestEvent): current_user {
	const user = event.locals.user;
	if (user == null) error(401, 'Unauthorized');
	return user;
}

export function require_current_user_id(event: RequestEvent): string {
	return require_current_user(event).id;
}

export async function require_owned_raw_upload_row(params: {
	raw_upload_id: string;
	user_id: string;
}): Promise<RawImageUploadRow> {
	const { raw_upload_id, user_id } = params;
	const rows = await db
		.select()
		.from(raw_image_upload)
		.where(and(eq(raw_image_upload.id, raw_upload_id), eq(raw_image_upload.user_id, user_id)))
		.limit(1);
	const row = rows[0];
	if (row == null) error(404, 'Upload not found');
	return row;
}
