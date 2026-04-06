import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import exifr from 'exifr';

/** CJS interop: named `rotations` is not a reliable ESM export from `exifr`. */
const exifr_rotations = exifr.rotations as Record<
	number,
	{ deg: number; scaleX: number; scaleY: number; rad?: number; dimensionSwapped?: boolean }
>;
import { exiftool } from 'exiftool-vendored';
import sharp, { type Sharp } from 'sharp';
import { get_transformed_root_absolute_path } from '$lib/server/transformed';
import {
	get_upload_preview_pipeline_settings,
	type upload_preview_pipeline_settings
} from '$lib/server/services/settings/upload_pipeline_settings';
import type { upload_preview_format } from '$lib/config/upload_preview_format';
import {
	upload_preview_formats,
	upload_preview_format_file_ext
} from '$lib/config/upload_preview_format';

/** RAW-like: extract large embedded JPEGs via ExifTool; Sharp may also decode some via libraw. */
const raw_like_extensions = new Set([
	'.arw',
	'.cr2',
	'.cr3',
	'.nef',
	'.nrw',
	'.raw',
	'.raf',
	'.orf',
	'.rw2',
	'.pef',
	'.srw',
	'.sr2',
	'.kdc',
	'.srf',
	'.3fr',
	'.fff',
	'.iiq',
	'.erf',
	'.mef',
	'.mos',
	'.x3f',
	'.dng'
]);

const preview_subdir = 'upload-previews';

/**
 * Order matters: prefer tags that usually hold the largest usable embedded JPEG.
 * @see https://exiftool.org/TagNames/EXIF.html
 */
const exiftool_raw_preview_tags = ['JpgFromRaw', 'PreviewImage', 'OtherImage', 'ThumbnailImage'];

export function preview_thumb_relative_path(
	upload_id: string,
	format: upload_preview_format
): string {
	const ext = upload_preview_format_file_ext(format);
	return path.posix.join(preview_subdir, `${upload_id}_thumb${ext}`);
}

export function preview_full_relative_path(
	upload_id: string,
	format: upload_preview_format
): string {
	const ext = upload_preview_format_file_ext(format);
	return path.posix.join(preview_subdir, `${upload_id}_full${ext}`);
}

/** Picks an existing modal preview on disk (any supported format), preferring the current setting. */
export async function resolve_upload_preview_full_relative_path(
	upload_id: string,
	preferred_format: upload_preview_format
): Promise<string | null> {
	const root = path.resolve(get_transformed_root_absolute_path());
	const order: upload_preview_format[] = [
		preferred_format,
		...upload_preview_formats.filter((f) => f !== preferred_format)
	];
	for (const fmt of order) {
		const rel = preview_full_relative_path(upload_id, fmt);
		const abs = path.resolve(root, ...rel.split(path.posix.sep));
		if (!abs.startsWith(root + path.sep) && abs !== root) continue;
		try {
			await access(abs);
			return rel;
		} catch {
			continue;
		}
	}
	return null;
}

/** Picks an existing grid thumb on disk (any supported format), preferring the current setting. */
export async function resolve_upload_preview_thumb_relative_path(
	upload_id: string,
	preferred_format: upload_preview_format
): Promise<string | null> {
	const root = path.resolve(get_transformed_root_absolute_path());
	const order: upload_preview_format[] = [
		preferred_format,
		...upload_preview_formats.filter((f) => f !== preferred_format)
	];
	for (const fmt of order) {
		const rel = preview_thumb_relative_path(upload_id, fmt);
		const abs = path.resolve(root, ...rel.split(path.posix.sep));
		if (!abs.startsWith(root + path.sep) && abs !== root) continue;
		try {
			await access(abs);
			return rel;
		} catch {
			continue;
		}
	}
	return null;
}

/** Removes grid + modal previews for an upload (all supported extensions; ignores missing files). */
export async function delete_upload_preview_jpegs(upload_id: string): Promise<void> {
	const root = path.resolve(get_transformed_root_absolute_path());
	for (const fmt of upload_preview_formats) {
		for (const rel of [
			preview_thumb_relative_path(upload_id, fmt),
			preview_full_relative_path(upload_id, fmt)
		]) {
			const abs = path.resolve(root, ...rel.split(path.posix.sep));
			if (!abs.startsWith(root + path.sep) && abs !== root) continue;
			try {
				await unlink(abs);
			} catch (e) {
				const code =
					e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
				if (code !== 'ENOENT') {
					console.error(`${log_prefix} unlink failed (${rel}):`, e);
				}
			}
		}
	}
}

function to_buffer(input: ArrayBuffer | Uint8Array): Buffer {
	return input instanceof ArrayBuffer ? Buffer.from(new Uint8Array(input)) : Buffer.from(input);
}

function looks_like_jpeg(buf: Buffer): boolean {
	return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

function original_is_jpeg_filename(original_filename: string): boolean {
	const ext = path.extname(original_filename).toLowerCase();
	return ext === '.jpg' || ext === '.jpeg';
}

function is_raw_like_filename(original_filename: string): boolean {
	return raw_like_extensions.has(path.extname(original_filename).toLowerCase());
}

const log_prefix = '[preview_jpeg]';

type exifr_rotation_hints = NonNullable<Awaited<ReturnType<typeof exifr.rotation>>>;

/**
 * Embedded RAW previews often omit Orientation or set 1 while IFD0 on the container is 6–8.
 * Sharp's `.rotate()` without angle only reads the preview JPEG, so we apply rotation from the
 * original file via exifr (same table as CSS/canvas in the exifr readme).
 */
function apply_source_orientation(
	pipeline: sharp.Sharp,
	hints: exifr_rotation_hints | undefined
): sharp.Sharp {
	if (hints == null || typeof hints.deg !== 'number') {
		return pipeline.rotate();
	}
	const needs_explicit = hints.deg !== 0 || hints.scaleX === -1 || hints.scaleY === -1;
	if (!needs_explicit) {
		return pipeline.rotate();
	}
	let p = pipeline.rotate(hints.deg);
	if (hints.scaleX === -1) p = p.flop();
	if (hints.scaleY === -1) p = p.flip();
	return p;
}

async function resolve_rotation_hints(
	buf: Buffer,
	fallback_exif_orientation: number | null | undefined
): Promise<exifr_rotation_hints | undefined> {
	try {
		const r = await exifr.rotation(buf);
		if (r != null && typeof r.deg === 'number') return r;
	} catch {
		/* ignore */
	}
	if (
		fallback_exif_orientation != null &&
		fallback_exif_orientation >= 1 &&
		fallback_exif_orientation <= 8
	) {
		return {
			...exifr_rotations[fallback_exif_orientation],
			canvas: true,
			css: true
		} as exifr_rotation_hints;
	}
	return undefined;
}

function log_preview_error(context: string, err: unknown): void {
	const e = err instanceof Error ? err : new Error(String(err));
	console.error(`${log_prefix} ${context}:`, e.message);
	if (e.stack) console.error(e.stack);
}

async function try_encode_master_jpeg(
	buf: Buffer,
	upload_id: string,
	original_filename: string,
	pipeline: upload_preview_pipeline_settings
): Promise<Buffer | null> {
	const max_edge = pipeline.max_full_edge_px;
	const q_full = pipeline.jpeg_q_full;
	const attempts: Array<{ name: string; run: () => Promise<Buffer> }> = [
		{
			name: 'rotate_resize_jpeg',
			run: () =>
				sharp(buf, { failOn: 'none', limitInputPixels: false })
					.resize(max_edge, max_edge, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.jpeg({ quality: q_full })
					.toBuffer()
		},
		{
			name: 'resize_jpeg',
			run: () =>
				sharp(buf, { failOn: 'none', limitInputPixels: false })
					.resize(max_edge, max_edge, {
						fit: 'inside',
						withoutEnlargement: true
					})
					.jpeg({ quality: q_full })
					.toBuffer()
		},
		{
			name: 'jpeg_only',
			run: () =>
				sharp(buf, { failOn: 'none', limitInputPixels: false }).jpeg({ quality: q_full }).toBuffer()
		}
	];

	for (const { name, run } of attempts) {
		try {
			return await run();
		} catch (err) {
			log_preview_error(
				`sharp attempt "${name}" failed (upload_id=${upload_id} file=${original_filename})`,
				err
			);
		}
	}
	return null;
}

/** Prefer the buffer with the most pixels (Sharp decode vs ExifTool embedded JPEGs). */
async function pick_largest_master_jpeg(candidates: Buffer[]): Promise<Buffer | null> {
	if (candidates.length === 0) return null;
	let best: Buffer | null = null;
	let best_area = 0;
	for (const candidate of candidates) {
		try {
			const meta = await sharp(candidate, { failOn: 'none' }).metadata();
			const w = meta.width ?? 0;
			const h = meta.height ?? 0;
			const area = w * h;
			if (area > best_area) {
				best = candidate;
				best_area = area;
			}
		} catch {
			continue;
		}
	}
	return best;
}

async function collect_exiftool_raw_jpeg_candidates(
	source_absolute_path: string,
	upload_id: string,
	original_filename: string,
	pipeline: upload_preview_pipeline_settings
): Promise<Buffer[]> {
	const candidates: Buffer[] = [];
	for (const tag of exiftool_raw_preview_tags) {
		try {
			const raw_chunk = await exiftool.extractBinaryTagToBuffer(tag, source_absolute_path);
			if (raw_chunk.length === 0 || !looks_like_jpeg(raw_chunk)) continue;
			const label = `${original_filename}#exiftool:${tag}`;
			const encoded = await try_encode_master_jpeg(raw_chunk, upload_id, label, pipeline);
			const chosen = encoded ?? raw_chunk;
			candidates.push(chosen);
			console.warn(
				`${log_prefix} exiftool ${tag} → ${chosen.byteLength} bytes JPEG (upload_id=${upload_id})`
			);
		} catch {
			/* missing tag or not readable */
		}
	}
	return candidates;
}

async function try_exifr_embedded_preview(
	buf: Buffer,
	upload_id: string,
	original_filename: string
): Promise<Buffer | null> {
	try {
		const thumb = await exifr.thumbnail(buf);
		if (thumb == null || thumb.length === 0) {
			console.error(
				`${log_prefix} exifr.thumbnail returned empty (upload_id=${upload_id} file=${original_filename})`
			);
			return null;
		}
		const out = Buffer.isBuffer(thumb) ? thumb : Buffer.from(thumb);
		console.warn(
			`${log_prefix} exifr.thumbnail extracted ${out.byteLength} bytes (upload_id=${upload_id} file=${original_filename})`
		);
		return out;
	} catch (err) {
		log_preview_error(
			`exifr.thumbnail failed (upload_id=${upload_id} file=${original_filename})`,
			err
		);
		return null;
	}
}

async function sharp_to_preview_buffer(
	pipeline_sharp: Sharp,
	format: upload_preview_format,
	quality: number
): Promise<Buffer> {
	switch (format) {
		case 'jpeg':
			return pipeline_sharp.jpeg({ quality, mozjpeg: true }).toBuffer();
		case 'webp':
			return pipeline_sharp.webp({ quality }).toBuffer();
		case 'avif':
			return pipeline_sharp.avif({ quality }).toBuffer();
		case 'png': {
			const compressionLevel = Math.min(9, Math.max(0, Math.round(9 - (quality / 100) * 9)));
			return pipeline_sharp.png({ compressionLevel }).toBuffer();
		}
		default: {
			const _exhaustive: never = format;
			return _exhaustive;
		}
	}
}

async function write_thumb_and_full_jpegs(
	dir: string,
	upload_id: string,
	master_jpeg: Buffer,
	rotation_hints: exifr_rotation_hints | undefined,
	pipeline: upload_preview_pipeline_settings
): Promise<void> {
	const fmt = pipeline.upload_preview_format;
	const thumb_abs = path.join(dir, `${upload_id}_thumb${upload_preview_format_file_ext(fmt)}`);
	const full_abs = path.join(dir, `${upload_id}_full${upload_preview_format_file_ext(fmt)}`);

	const thumb_buf = await sharp_to_preview_buffer(
		apply_source_orientation(sharp(master_jpeg, { failOn: 'none' }), rotation_hints).resize(
			pipeline.thumb_max_edge_px,
			pipeline.thumb_max_edge_px,
			{
				fit: 'inside',
				withoutEnlargement: true
			}
		),
		fmt,
		pipeline.jpeg_q_thumb
	);

	const full_buf = await sharp_to_preview_buffer(
		apply_source_orientation(sharp(master_jpeg, { failOn: 'none' }), rotation_hints).resize(
			pipeline.max_full_edge_px,
			pipeline.max_full_edge_px,
			{
				fit: 'inside',
				withoutEnlargement: true
			}
		),
		fmt,
		pipeline.jpeg_q_full
	);

	await writeFile(thumb_abs, thumb_buf);
	await writeFile(full_abs, full_buf);
}

export type write_preview_jpeg_options = {
	/** Saved upload file on disk; required for ExifTool to read large embedded JPEGs from RAW. */
	source_absolute_path?: string | null;
	/** EXIF orientation 1–8 from metadata when `exifr.rotation` on the buffer is inconclusive. */
	exif_orientation?: number | null;
	/** When omitted, settings are read from the database (or defaults). */
	pipeline?: upload_preview_pipeline_settings;
};

/**
 * Decode upload, write `upload-previews/<id>_thumb.*` (grid) and `<id>_full.*` (modal).
 */
export async function write_preview_jpeg_for_upload(
	upload_id: string,
	input: ArrayBuffer | Uint8Array,
	original_filename: string,
	opts?: write_preview_jpeg_options
): Promise<
	| { ok: true; thumb_relative_path: string; full_relative_path: string }
	| { ok: false; message: string }
> {
	try {
		const pipeline = opts?.pipeline ?? (await get_upload_preview_pipeline_settings());

		const root = get_transformed_root_absolute_path();
		const dir = path.join(root, preview_subdir);
		await mkdir(dir, { recursive: true });

		const buf = to_buffer(input);
		const rotation_hints = await resolve_rotation_hints(buf, opts?.exif_orientation);
		let master_jpeg: Buffer | null = null;

		if (is_raw_like_filename(original_filename)) {
			/**
			 * One “master” raster from the RAW: prefer the largest of (a) Sharp/libraw decode,
			 * (b) ExifTool JpgFromRaw / PreviewImage / …, (c) exifr IFD1 thumb if no path.
			 */
			const candidates: Buffer[] = [];
			const from_sharp = await try_encode_master_jpeg(buf, upload_id, original_filename, pipeline);
			if (from_sharp) candidates.push(from_sharp);

			const source_path = opts?.source_absolute_path;
			if (source_path != null && source_path !== '') {
				const from_exiftool = await collect_exiftool_raw_jpeg_candidates(
					source_path,
					upload_id,
					original_filename,
					pipeline
				);
				candidates.push(...from_exiftool);
			} else {
				const embedded = await try_exifr_embedded_preview(buf, upload_id, original_filename);
				if (embedded) {
					const embed_label = `${original_filename}#exifr_embedded`;
					let from_embed = await try_encode_master_jpeg(embedded, upload_id, embed_label, pipeline);
					if (from_embed == null && looks_like_jpeg(embedded)) {
						from_embed = embedded;
					}
					if (from_embed) candidates.push(from_embed);
				}
			}

			master_jpeg = await pick_largest_master_jpeg(candidates);
		} else {
			master_jpeg = await try_encode_master_jpeg(buf, upload_id, original_filename, pipeline);
		}

		if (master_jpeg == null) {
			master_jpeg = await try_encode_master_jpeg(buf, upload_id, original_filename, pipeline);
		}

		if (master_jpeg == null) {
			try {
				const meta = await sharp(buf, { failOn: 'none', limitInputPixels: false }).metadata();
				console.error(`${log_prefix} after failed encodes, sharp.metadata():`, {
					upload_id,
					file: original_filename,
					format: meta.format,
					width: meta.width,
					height: meta.height,
					space: meta.space,
					channels: meta.channels,
					has_profile: meta.hasProfile,
					has_alpha: meta.hasAlpha
				});
			} catch (err) {
				log_preview_error(
					`sharp.metadata() also failed (upload_id=${upload_id} file=${original_filename})`,
					err
				);
			}
		}

		if (
			master_jpeg == null &&
			original_is_jpeg_filename(original_filename) &&
			looks_like_jpeg(buf)
		) {
			console.warn(
				`${log_prefix} using original JPEG bytes as master (upload_id=${upload_id} file=${original_filename} size=${buf.byteLength})`
			);
			master_jpeg = buf;
		} else if (
			master_jpeg == null &&
			original_is_jpeg_filename(original_filename) &&
			!looks_like_jpeg(buf)
		) {
			console.error(
				`${log_prefix} JPEG fallback skipped: file does not start with JPEG SOI (upload_id=${upload_id} file=${original_filename} size=${buf.byteLength} head=${buf.subarray(0, 8).toString('hex')})`
			);
		} else if (master_jpeg == null) {
			console.error(
				`${log_prefix} no preview: not a direct JPEG and embedded/offline decode did not produce output (upload_id=${upload_id} file=${original_filename} size=${buf.byteLength})`
			);
		}

		if (master_jpeg == null) {
			const message = 'Could not decode image or build preview.';
			console.error(
				`${log_prefix} failed completely: ${message} upload_id=${upload_id} file=${original_filename} bytes=${buf.byteLength}`
			);
			return { ok: false, message };
		}

		await write_thumb_and_full_jpegs(dir, upload_id, master_jpeg, rotation_hints, pipeline);

		return {
			ok: true,
			thumb_relative_path: preview_thumb_relative_path(upload_id, pipeline.upload_preview_format),
			full_relative_path: preview_full_relative_path(upload_id, pipeline.upload_preview_format)
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log_preview_error(`unexpected error (upload_id=${upload_id} file=${original_filename})`, e);
		return { ok: false, message };
	}
}
