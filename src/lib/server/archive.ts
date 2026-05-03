import { createReadStream } from "node:fs"
import { readdir, stat } from "node:fs/promises"
import path from "node:path"
import { motionConfig } from "./config"

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CLIP_PATTERN = /^\d{2}-\d{2}-\d{2}\.mp4$/
const CACHE_TTL_MS = 30_000

type DayRecord = {
	date: string
	count: number
	first: string | null
	last: string | null
	bytes: number
}

export type ClipRecord = {
	date: string
	file: string
	time: string
	hour: string
	bytes: number
	mtime: string
	url: string
}

type DayCache = {
	expiresAt: number
	days: DayRecord[]
}

let dayCache: DayCache | null = null

const isDay = (value: string) => DAY_PATTERN.test(value)
const isClip = (value: string) => CLIP_PATTERN.test(value)

const clipTime = (file: string) => file.slice(0, -4).replaceAll("-", ":")
const clipUrl = (date: string, file: string) =>
	`/api/video/${encodeURIComponent(date)}/${encodeURIComponent(file)}`

function resolveClipPath(date: string, file: string) {
	if (!isDay(date) || !isClip(file)) return null

	const root = path.resolve(motionConfig.videoDir)
	const resolved = path.resolve(root, date, file)
	const relative = path.relative(root, resolved)

	if (relative.startsWith("..") || path.isAbsolute(relative)) return null
	return resolved
}

export async function listDays({ refresh = false } = {}) {
	const now = Date.now()
	if (!refresh && dayCache && dayCache.expiresAt > now) return dayCache.days

	const entries = await readdir(motionConfig.videoDir, { withFileTypes: true })
	const dayEntries = entries.filter(
		(entry) => entry.isDirectory() && isDay(entry.name),
	)
	const dayRecords: (DayRecord | null)[] = await Promise.all(
		dayEntries.map(async (entry) => {
			const date = entry.name
			const dir = path.join(motionConfig.videoDir, date)
			const files = await readdir(dir)
			const clips = files.filter(isClip).sort()
			if (clips.length === 0) return null

			const sizeReads = clips.map(async (clip) => {
				const filePath = path.join(dir, clip)
				const metadata = await stat(filePath)
				return metadata.size
			})
			const sizes = await Promise.all(sizeReads)
			const lastClip = clips.at(-1) ?? clips[0]

			return {
				date,
				count: clips.length,
				first: clipTime(clips[0]),
				last: clipTime(lastClip),
				bytes: sizes.reduce((sum, size) => sum + size, 0),
			}
		}),
	)

	const days = dayRecords.filter((day): day is DayRecord => day !== null)
	days.sort((a, b) => b.date.localeCompare(a.date))
	dayCache = { days, expiresAt: now + CACHE_TTL_MS }

	return days
}

export async function listClips(date: string) {
	if (!isDay(date)) return null

	const dir = path.join(motionConfig.videoDir, date)
	const files = (await readdir(dir).catch(() => [])).filter(isClip).sort()

	const clipReads = files.map(async (file): Promise<ClipRecord> => {
		const metadata = await stat(path.join(dir, file))
		const time = clipTime(file)
		return {
			date,
			file,
			time,
			hour: time.slice(0, 2),
			bytes: metadata.size,
			mtime: metadata.mtime.toISOString(),
			url: clipUrl(date, file),
		}
	})
	return await Promise.all(clipReads)
}

export async function getClipStream(
	date: string,
	file: string,
	range: string | null,
) {
	const filePath = resolveClipPath(date, file)
	if (!filePath) return null

	const metadata = await stat(filePath).catch(() => null)
	if (!metadata?.isFile()) return null

	const size = metadata.size
	const headers = new Headers({
		"accept-ranges": "bytes",
		"content-type": "video/mp4",
		"cache-control": "private, max-age=3600",
	})

	if (!range) {
		headers.set("content-length", String(size))
		const body = createReadStream(filePath) as unknown as BodyInit
		return new Response(body, { headers })
	}

	const match = /^bytes=(\d*)-(\d*)$/.exec(range)
	if (!match) {
		headers.set("content-range", `bytes */${size}`)
		return new Response(null, { status: 416, headers })
	}

	const start = match[1] ? Number(match[1]) : 0
	const end = match[2] ? Number(match[2]) : size - 1

	if (
		!Number.isSafeInteger(start) ||
		!Number.isSafeInteger(end) ||
		start > end ||
		end >= size
	) {
		headers.set("content-range", `bytes */${size}`)
		return new Response(null, { status: 416, headers })
	}

	headers.set("content-length", String(end - start + 1))
	headers.set("content-range", `bytes ${start}-${end}/${size}`)

	const body = createReadStream(filePath, { start, end }) as unknown as BodyInit
	return new Response(body, { status: 206, headers })
}
