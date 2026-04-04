import { base } from '$app/paths';

/** Build public URL for a file under the transformed media root (`relative` uses `/` segments). */
export function transformed_media_url(relative_posix_path: string): string {
	const encoded = relative_posix_path.split('/').map(encodeURIComponent).join('/');
	return `${base}/media/transformed/${encoded}`;
}
