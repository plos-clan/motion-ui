<script lang="ts">
	import ArchiveIcon from "lucide-svelte/icons/archive"
	import CalendarIcon from "lucide-svelte/icons/calendar-days"
	import CameraIcon from "lucide-svelte/icons/camera"
	import ChevronLeftIcon from "lucide-svelte/icons/chevron-left"
	import ChevronRightIcon from "lucide-svelte/icons/chevron-right"
	import MaximizeIcon from "lucide-svelte/icons/maximize"
	import MinimizeIcon from "lucide-svelte/icons/minimize"
	import PlayIcon from "lucide-svelte/icons/play"
	import SearchIcon from "lucide-svelte/icons/search"
	import VideoIcon from "lucide-svelte/icons/video"
	import XIcon from "lucide-svelte/icons/x"
	import * as Badge from "$lib/components/ui/badge"
	import * as Button from "$lib/components/ui/button"
	import * as Input from "$lib/components/ui/input"
	import * as ScrollArea from "$lib/components/ui/scroll-area"
	import * as Tabs from "$lib/components/ui/tabs"
	import type { PageData } from "./$types"

	type Clip = {
		date: string
		file: string
		time: string
		hour: string
		bytes: number
		mtime: string
		url: string
	}

	type DaySort = "date" | "count"

	let { data }: { data: PageData } = $props()
	let selectedDateOverride = $state<string | null>(null)
	let clips = $state<Clip[]>([])
	let selectedClip = $state<Clip | null>(null)
	let archiveError = $state("")
	let search = $state("")
	let daySort = $state<DaySort>("date")
	let activeTab = $state<"live" | "archive">("live")
	let liveFrame = $state<HTMLDivElement | null>(null)
	let isLiveFullscreen = $state(false)
	let clipRequest = 0

	const days = $derived(data.days)
	const selectedDate = $derived(
		selectedDateOverride ?? data.selectedDate ?? data.days[0]?.date ?? ""
	)
	const totalClips = $derived(days.reduce((sum, day) => sum + day.count, 0))
	const maxDayCount = $derived(Math.max(1, ...days.map((day) => day.count)))
	const selectedDay = $derived(days.find((day) => day.date === selectedDate) ?? null)
	const normalizedSearch = $derived(normalizeSearch(search))
	const hasSearch = $derived(normalizedSearch.length > 0)
	const visibleDays = $derived.by(() => {
		const filtered = days.filter((day) => day.date.includes(normalizedSearch))
		if (daySort === "date") return filtered

		return [...filtered].sort((left, right) => {
			const countOrder = right.count - left.count
			if (countOrder !== 0) return countOrder
			return right.date.localeCompare(left.date)
		})
	})
	const groupedClips = $derived.by(() => {
		const groups = new Map<string, Clip[]>()
		for (const clip of clips) {
			const group = groups.get(clip.hour)
			if (group) group.push(clip)
			else groups.set(clip.hour, [clip])
		}
		return [...groups.entries()].map(([hour, items]) => ({ hour, clips: items }))
	})
	const selectedClipIndex = $derived(
		selectedClip ? clips.findIndex((clip) => clip.file === selectedClip?.file) : -1
	)
	const playerSrc = $derived(selectedClip ? `${selectedClip.url}?v=${selectedClip.mtime}` : "")

	function formatDate(date: string) {
		const [year, month, day] = date.split("-")
		return `${year}.${month}.${day}`
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`
	}

	function normalizeSearch(value: string) {
		const text = value.trim().replace(/\s+/g, " ")
		if (!text) return ""

		const parts = text.split(" ")
		if (!parts.every((part) => /^\d+$/.test(part))) return text

		const [year, month, day] = parts
		if (parts.length === 1) return year
		if (year.length !== 4 || !month) return text

		const monthNumber = Number(month)
		if (monthNumber < 1 || monthNumber > 12) return text

		const normalizedMonth = month.padStart(2, "0")
		if (parts.length === 2) return `${year}-${normalizedMonth}`
		if (!day) return text

		const dayNumber = Number(day)
		if (dayNumber < 1 || dayNumber > 31) return text

		return `${year}-${normalizedMonth}-${day.padStart(2, "0")}`
	}

	function clearSearch() {
		search = ""
	}

	function toggleDaySort() {
		daySort = daySort === "date" ? "count" : "date"
	}

	function pickDay(date: string) {
		selectedDateOverride = date
		activeTab = "archive"
	}

	function pickClip(clip: Clip) {
		selectedClip = clip
	}

	function playOffset(offset: number) {
		const next = clips[selectedClipIndex + offset]
		if (next) selectedClip = next
	}

	async function toggleLiveFullscreen() {
		if (typeof document === "undefined" || !liveFrame) return

		try {
			if (document.fullscreenElement === liveFrame) {
				await document.exitFullscreen()
			} else {
				await liveFrame.requestFullscreen()
			}
		} catch {
			isLiveFullscreen = false
		}
	}

	async function loadClips(date: string) {
		if (!date) {
			clips = []
			selectedClip = null
			return
		}

		const request = ++clipRequest
		archiveError = ""

		try {
			const response = await fetch(`/api/archive/day/${date}`)
			if (!response.ok) throw new Error("clips")
			const nextClips: Clip[] = (await response.json()).clips
			if (request !== clipRequest) return
			clips = nextClips
			selectedClip = nextClips[0] ?? null
		} catch {
			if (request !== clipRequest) return
			clips = []
			selectedClip = null
			archiveError = "无法读取当天片段"
		}
	}

	$effect(() => {
		loadClips(selectedDate)
	})

	$effect(() => {
		if (!normalizedSearch) return
		const exactDay = days.find((day) => day.date === normalizedSearch)
		if (exactDay && exactDay.date !== selectedDate) selectedDateOverride = exactDay.date
	})

	$effect(() => {
		const target = liveFrame
		if (typeof document === "undefined" || !target) return

		const syncFullscreen = () => {
			isLiveFullscreen = document.fullscreenElement === target
		}

		syncFullscreen()
		document.addEventListener("fullscreenchange", syncFullscreen)
		return () => document.removeEventListener("fullscreenchange", syncFullscreen)
	})
</script>

<main class="min-h-screen bg-background text-foreground lg:h-dvh lg:overflow-hidden">
	<Tabs.Tabs
		bind:value={activeTab}
		class="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-5 lg:h-full lg:min-h-0 lg:px-6"
	>
		<header
			class="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 pb-3"
		>
			<div class="flex min-w-0 items-center gap-4">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm"
				>
					<CameraIcon class="size-5" />
				</div>
				<Tabs.List variant="line" class="h-auto gap-5 rounded-none p-0">
					<Tabs.Trigger
						value="live"
						class="h-auto flex-none rounded-none border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none data-active:border-0 data-active:bg-transparent data-active:shadow-none dark:data-active:border-0 dark:data-active:bg-transparent"
					>
						实时画面
					</Tabs.Trigger>
					<Tabs.Trigger
						value="archive"
						class="h-auto flex-none rounded-none border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none data-active:border-0 data-active:bg-transparent data-active:shadow-none dark:data-active:border-0 dark:data-active:bg-transparent"
					>
						历史片段
					</Tabs.Trigger>
				</Tabs.List>
			</div>

			<div class="flex shrink-0 items-center gap-2">
				<Badge.Badge variant="outline" class="hidden h-8 rounded-lg px-3 sm:inline-flex">
					<ArchiveIcon class="size-3.5" />
					{days.length} 天
				</Badge.Badge>
				<Badge.Badge variant="secondary" class="hidden h-8 rounded-lg px-3 sm:inline-flex">
					<VideoIcon class="size-3.5" />
					{totalClips} 段
				</Badge.Badge>
			</div>
		</header>

		<Tabs.Content value="live" class="mt-0 flex-1 lg:min-h-0">
			<section class="overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:h-full lg:min-h-0">
				<div class="flex items-center justify-between border-b border-border px-3 py-2">
					<div class="flex items-center gap-2 text-sm font-medium">
						<span class="size-2 rounded-full bg-primary"></span>
						直播
					</div>
				</div>
				<div
					bind:this={liveFrame}
					class="live-frame relative flex min-h-[260px] items-center justify-center bg-black lg:h-[calc(100%-41px)] lg:min-h-0"
				>
					<img
						src="/api/live"
						alt="Motion 实时监控画面"
						class="block aspect-video h-auto w-full object-contain lg:h-full lg:aspect-auto"
					/>
					<Button.Button
						variant="secondary"
						size="icon"
						class="absolute bottom-3 right-3 shadow-sm"
						aria-label={isLiveFullscreen ? "退出全屏" : "全屏播放"}
						onclick={toggleLiveFullscreen}
					>
						{#if isLiveFullscreen}
							<MinimizeIcon class="size-4" />
						{:else}
							<MaximizeIcon class="size-4" />
						{/if}
					</Button.Button>
				</div>
			</section>
		</Tabs.Content>

		<Tabs.Content value="archive" class="mt-0 flex-1 lg:min-h-0">
			<section class="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
				<aside
					class="order-2 flex h-[340px] flex-col rounded-lg border border-border bg-card shadow-sm lg:order-1 lg:h-auto lg:min-h-0"
				>
					<div class="shrink-0 border-b border-border p-3">
						<div class="mb-2 flex items-center justify-between gap-2">
							<div class="flex items-center gap-2 text-sm font-semibold">
								<CalendarIcon class="size-4" />
								日期
							</div>
							<Button.Button
								variant="outline"
								size="xs"
								aria-label={daySort === "date" ? "按片段数量排序日期" : "按日期排序日期"}
								aria-pressed={daySort === "count"}
								onclick={toggleDaySort}
							>
								{daySort === "date" ? "按日期" : "按数量"}
							</Button.Button>
						</div>
						<div class="relative">
							<SearchIcon
								class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input.Input
								bind:value={search}
								aria-label="筛选日期"
								autocomplete="off"
								class="pl-8 pr-8"
								placeholder="筛选日期：2026 05 03"
							/>
							{#if hasSearch}
								<Button.Button
									variant="ghost"
									size="icon-xs"
									class="absolute right-1 top-1/2 -translate-y-1/2"
									aria-label="清空日期筛选"
									onclick={clearSearch}
								>
									<XIcon class="size-3.5" />
								</Button.Button>
							{/if}
						</div>
					</div>

					<ScrollArea.ScrollArea class="min-h-0 flex-1">
						<div class="space-y-1 p-2">
							{#if visibleDays.length > 0}
								{#each visibleDays as day}
									<button
										class={[
											"group w-full rounded-lg border p-2 text-left transition",
											day.date === selectedDate
												? "border-primary bg-primary text-primary-foreground"
												: "border-transparent hover:border-border hover:bg-muted",
										]}
										onclick={() => pickDay(day.date)}
									>
										<div class="flex items-center justify-between gap-2">
											<span class="font-medium">{formatDate(day.date)}</span>
											<span
												class={[
													"rounded-md px-1.5 py-0.5 text-xs",
													day.date === selectedDate
														? "bg-primary-foreground/15"
														: "bg-secondary text-secondary-foreground",
												]}
											>
												{day.count}
											</span>
										</div>
										<div
											class={[
												"mt-2 h-1.5 overflow-hidden rounded-full",
												day.date === selectedDate ? "bg-primary-foreground/20" : "bg-muted",
											]}
										>
											<div
												class={[
													"h-full rounded-full",
													day.date === selectedDate ? "bg-primary-foreground" : "bg-foreground/35",
												]}
												style={`width: ${Math.max(8, Math.round((day.count / maxDayCount) * 100))}%`}
											></div>
										</div>
										<div
											class={[
												"mt-1 text-xs",
												day.date === selectedDate
													? "text-primary-foreground/75"
													: "text-muted-foreground",
											]}
										>
											{day.first} - {day.last}
										</div>
									</button>
								{/each}
							{:else}
								<div
									class="flex h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground"
								>
									没有匹配的日期
								</div>
							{/if}
						</div>
					</ScrollArea.ScrollArea>
				</aside>

				<div
					class="order-1 grid gap-3 lg:order-2 lg:h-full lg:min-h-0 lg:grid-rows-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_340px] xl:grid-rows-none"
				>
					<section class="flex min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm lg:min-h-0">
						<div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
							<div class="min-w-0">
								<div class="truncate text-sm font-semibold">
									{selectedDay ? formatDate(selectedDay.date) : "无历史片段"}
								</div>
								<div class="mt-0.5 text-xs text-muted-foreground">
									{selectedDay ? `${selectedDay.count} 个片段` : "未找到可播放文件"}
								</div>
							</div>
							<div class="flex items-center gap-2">
								<Button.Button
									variant="outline"
									size="icon"
									disabled={selectedClipIndex <= 0}
									onclick={() => playOffset(-1)}
								>
									<ChevronLeftIcon class="size-4" />
								</Button.Button>
								<Button.Button
									variant="outline"
									size="icon"
									disabled={selectedClipIndex === -1 || selectedClipIndex >= clips.length - 1}
									onclick={() => playOffset(1)}
								>
									<ChevronRightIcon class="size-4" />
								</Button.Button>
							</div>
						</div>

						<div class="bg-black lg:min-h-0 lg:flex-1">
							{#if selectedClip}
								<video
									src={playerSrc}
									controls
									muted
									playsinline
									class="aspect-video max-h-[calc(100dvh-220px)] min-h-[220px] w-full bg-black object-contain lg:h-full lg:min-h-0 lg:max-h-none lg:aspect-auto"
									onended={() => playOffset(1)}
								>
									<track kind="captions" />
								</video>
							{:else}
								<div
									class="flex aspect-video min-h-[220px] items-center justify-center bg-background text-muted-foreground lg:h-full lg:aspect-auto lg:min-h-0"
								>
									<VideoIcon class="size-7" />
								</div>
							{/if}
						</div>
					</section>

					<aside
						class="flex h-[260px] flex-col rounded-lg border border-border bg-card shadow-sm lg:h-auto lg:min-h-0"
					>
						<div class="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
							<div class="flex items-center gap-2 text-sm font-semibold">
								<PlayIcon class="size-4" />
								时间线
							</div>
						</div>

						{#if archiveError}
							<div class="shrink-0 p-3 text-sm text-destructive">{archiveError}</div>
						{/if}

						<ScrollArea.ScrollArea class="min-h-0 flex-1">
							<div class="space-y-4 p-3">
								{#each groupedClips as group}
									<div>
										<div class="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
											<span>{group.hour}:00</span>
											<span class="h-px flex-1 bg-border"></span>
											<span>{group.clips.length}</span>
										</div>
										<div class="grid grid-cols-2 gap-2">
											{#each group.clips as clip}
												<button
													class={[
														"rounded-lg border p-2 text-left text-sm transition",
														selectedClip?.file === clip.file
															? "border-primary bg-primary text-primary-foreground"
															: "border-border bg-background hover:bg-muted",
													]}
													onclick={() => pickClip(clip)}
												>
													<div class="font-medium">{clip.time}</div>
													<div
														class={[
															"mt-1 text-xs",
															selectedClip?.file === clip.file
																? "text-primary-foreground/75"
																: "text-muted-foreground",
														]}
													>
														{formatBytes(clip.bytes)}
													</div>
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</ScrollArea.ScrollArea>
					</aside>
				</div>
			</section>
		</Tabs.Content>
	</Tabs.Tabs>
</main>

<style>
	.live-frame:fullscreen {
		width: 100vw;
		height: 100vh;
		min-height: 100vh;
	}

	.live-frame:fullscreen img {
		height: 100%;
	}
</style>
