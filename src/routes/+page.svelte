<script lang="ts">
	import ActivityIcon from "lucide-svelte/icons/activity";
	import ArchiveIcon from "lucide-svelte/icons/archive";
	import CalendarIcon from "lucide-svelte/icons/calendar-days";
	import CameraIcon from "lucide-svelte/icons/camera";
	import ChevronLeftIcon from "lucide-svelte/icons/chevron-left";
	import ChevronRightIcon from "lucide-svelte/icons/chevron-right";
	import ClockIcon from "lucide-svelte/icons/clock";
	import FolderIcon from "lucide-svelte/icons/folder-open";
	import MonitorIcon from "lucide-svelte/icons/monitor-play";
	import MoonIcon from "lucide-svelte/icons/moon";
	import PlayIcon from "lucide-svelte/icons/play";
	import SearchIcon from "lucide-svelte/icons/search";
	import SunIcon from "lucide-svelte/icons/sun";
	import VideoIcon from "lucide-svelte/icons/video";
	import XIcon from "lucide-svelte/icons/x";
	import * as Badge from "$lib/components/ui/badge";
	import * as Button from "$lib/components/ui/button";
	import * as Input from "$lib/components/ui/input";
	import * as ScrollArea from "$lib/components/ui/scroll-area";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { PageData } from "./$types";

	type Clip = {
		date: string;
		file: string;
		time: string;
		hour: string;
		bytes: number;
		mtime: string;
		url: string;
	};

	type Mode = "light" | "dark";

	let { data }: { data: PageData } = $props();
	let selectedDateOverride = $state<string | null>(null);
	let clips = $state<Clip[]>([]);
	let selectedClip = $state<Clip | null>(null);
	let archiveError = $state("");
	let search = $state("");
	let activeTab = $state<"live" | "archive">("live");
	let theme = $state<Mode>("light");
	let clipRequest = 0;

	const days = $derived(data.days);
	const selectedDate = $derived(
		selectedDateOverride ?? data.selectedDate ?? data.days[0]?.date ?? ""
	);
	const totalClips = $derived(days.reduce((sum, day) => sum + day.count, 0));
	const maxDayCount = $derived(Math.max(1, ...days.map((day) => day.count)));
	const selectedDay = $derived(days.find((day) => day.date === selectedDate) ?? null);
	const normalizedSearch = $derived(normalizeSearch(search));
	const hasSearch = $derived(normalizedSearch.length > 0);
	const filteredDays = $derived(
		days.filter((day) => day.date.includes(normalizedSearch))
	);
	const groupedClips = $derived.by(() => {
		const groups = new Map<string, Clip[]>();
		for (const clip of clips) {
			const group = groups.get(clip.hour);
			if (group) group.push(clip);
			else groups.set(clip.hour, [clip]);
		}
		return [...groups.entries()].map(([hour, items]) => ({ hour, clips: items }));
	});
	const selectedClipIndex = $derived(
		selectedClip ? clips.findIndex((clip) => clip.file === selectedClip?.file) : -1
	);
	const playerSrc = $derived(selectedClip ? `${selectedClip.url}?v=${selectedClip.mtime}` : "");

	function formatDate(date: string) {
		const [year, month, day] = date.split("-");
		return `${year}.${month}.${day}`;
	}

	function formatBytes(bytes: number) {
		if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}

	function normalizeSearch(value: string) {
		const text = value.trim().replace(/[./\s_]+/g, "-").replace(/-+/g, "-");
		const parts = text.split("-").filter(Boolean);

		if (parts.length >= 2 && parts.every((part) => /^\d+$/.test(part))) {
			const padded = parts.map((part, index) =>
				index === 0 && part.length === 4 ? part : part.padStart(2, "0")
			);
			if (padded[0]?.length === 4) return padded.slice(0, 3).join("-");
			return padded.slice(0, 2).join("-");
		}

		const digits = text.replaceAll("-", "");

		if (/^\d{8}$/.test(digits)) {
			return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
		}

		if (/^\d{6}$/.test(digits)) {
			return `${digits.slice(0, 4)}-${digits.slice(4)}`;
		}

		if (/^\d{4}$/.test(digits)) {
			const month = Number(digits.slice(0, 2));
			const day = Number(digits.slice(2));
			if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
				return `${digits.slice(0, 2)}-${digits.slice(2)}`;
			}
		}

		return text;
	}

	function clearSearch() {
		search = "";
	}

	function pickDay(date: string) {
		selectedDateOverride = date;
		activeTab = "archive";
	}

	function pickClip(clip: Clip) {
		selectedClip = clip;
	}

	function playOffset(offset: number) {
		const next = clips[selectedClipIndex + offset];
		if (next) selectedClip = next;
	}

	function setTheme(mode: Mode) {
		theme = mode;
		if (typeof document === "undefined") return;
		document.documentElement.classList.toggle("dark", mode === "dark");
		window.localStorage.setItem("motion-ui-theme", mode);
	}

	function toggleTheme() {
		setTheme(theme === "dark" ? "light" : "dark");
	}

	async function loadClips(date: string) {
		if (!date) {
			clips = [];
			selectedClip = null;
			return;
		}

		const request = ++clipRequest;
		archiveError = "";

		try {
			const response = await fetch(`/api/archive/day/${date}`);
			if (!response.ok) throw new Error("clips");
			const nextClips: Clip[] = (await response.json()).clips;
			if (request !== clipRequest) return;
			clips = nextClips;
			selectedClip = nextClips[0] ?? null;
		} catch {
			if (request !== clipRequest) return;
			clips = [];
			selectedClip = null;
			archiveError = "无法读取当天片段";
		}
	}

	$effect(() => {
		loadClips(selectedDate);
	});

	$effect(() => {
		if (!normalizedSearch) return;
		const exactDay = days.find((day) => day.date === normalizedSearch);
		if (exactDay && exactDay.date !== selectedDate) selectedDateOverride = exactDay.date;
	});

	$effect(() => {
		if (typeof window === "undefined") return;
		const stored = window.localStorage.getItem("motion-ui-theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		setTheme(stored === "dark" || (!stored && prefersDark) ? "dark" : "light");
	});
</script>

<main class="min-h-screen bg-background text-foreground lg:h-dvh lg:overflow-hidden">
	<div
		class="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-3 px-3 py-3 sm:px-5 lg:h-full lg:min-h-0 lg:px-6"
	>
		<header
			class="flex shrink-0 flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between"
		>
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm"
				>
					<CameraIcon class="size-5" />
				</div>
				<div class="min-w-0">
					<h1 class="truncate text-xl font-semibold tracking-normal">Motion UI</h1>
					<div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
						<span class="inline-flex items-center gap-1.5">
							<MonitorIcon class="size-3.5" />
							{data.config.streamUrl}
						</span>
						<span class="inline-flex items-center gap-1.5">
							<FolderIcon class="size-3.5" />
							{data.config.videoDir}
						</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<Badge.Badge variant="outline" class="h-8 rounded-lg px-3">
					<ArchiveIcon class="size-3.5" />
					{days.length} 天
				</Badge.Badge>
				<Badge.Badge variant="secondary" class="h-8 rounded-lg px-3">
					<VideoIcon class="size-3.5" />
					{totalClips} 段
				</Badge.Badge>
				<Button.Button variant="outline" size="icon" aria-label="切换深色模式" onclick={toggleTheme}>
					{#if theme === "dark"}
						<SunIcon class="size-4" />
					{:else}
						<MoonIcon class="size-4" />
					{/if}
				</Button.Button>
			</div>
		</header>

		<Tabs.Tabs bind:value={activeTab} class="flex flex-1 flex-col lg:min-h-0">
			<div class="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
				<Tabs.List class="grid w-full grid-cols-2 lg:w-[320px]">
					<Tabs.Trigger value="live" class="gap-2">
						<ActivityIcon class="size-4" />
						实时画面
					</Tabs.Trigger>
					<Tabs.Trigger value="archive" class="gap-2">
						<CalendarIcon class="size-4" />
						历史片段
					</Tabs.Trigger>
				</Tabs.List>
			</div>

			<Tabs.Content value="live" class="mt-3 flex-1 lg:min-h-0">
				<section class="overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:h-full lg:min-h-0">
					<div class="flex items-center justify-between border-b border-border px-3 py-2">
						<div class="flex items-center gap-2 text-sm font-medium">
							<span class="size-2 rounded-full bg-primary"></span>
							直播
						</div>
						<Badge.Badge variant="outline">{data.config.streamUrl}</Badge.Badge>
					</div>
					<div class="flex min-h-[260px] items-center justify-center bg-black lg:h-[calc(100%-41px)] lg:min-h-0">
						<img
							src="/api/live"
							alt="Motion 实时监控画面"
							class="block aspect-video h-auto w-full object-contain lg:h-full lg:aspect-auto"
						/>
					</div>
				</section>
			</Tabs.Content>

			<Tabs.Content value="archive" class="mt-3 flex-1 lg:min-h-0">
				<section class="grid gap-3 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
					<aside
						class="order-2 flex h-[340px] flex-col rounded-lg border border-border bg-card shadow-sm lg:order-1 lg:h-auto lg:min-h-0"
					>
						<div class="shrink-0 border-b border-border p-3">
							<div class="mb-2 flex items-center justify-between gap-3">
								<div class="flex items-center gap-2 text-sm font-semibold">
									<CalendarIcon class="size-4" />
									日期
								</div>
								<Badge.Badge variant="outline">{filteredDays.length} 天</Badge.Badge>
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
									placeholder="筛选日期：2026、2026-05、05-03"
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
								{#if filteredDays.length > 0}
									{#each filteredDays as day}
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
									<div class="flex h-32 items-center justify-center px-3 text-center text-sm text-muted-foreground">
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

							{#if selectedClip}
								<div class="flex flex-wrap items-center gap-2 px-3 py-3">
									<Badge.Badge variant="outline">
										<ClockIcon class="size-3.5" />
										{selectedClip.time}
									</Badge.Badge>
									<Badge.Badge variant="secondary">{formatBytes(selectedClip.bytes)}</Badge.Badge>
									<Badge.Badge variant="outline">{selectedClip.file}</Badge.Badge>
								</div>
							{/if}
						</section>

						<aside class="flex h-[260px] flex-col rounded-lg border border-border bg-card shadow-sm lg:h-auto lg:min-h-0">
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
	</div>
</main>
