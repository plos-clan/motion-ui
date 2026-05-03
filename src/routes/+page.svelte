<script lang="ts">
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import ArchiveIcon from "@lucide/svelte/icons/archive";
	import CalendarIcon from "@lucide/svelte/icons/calendar-days";
	import CameraIcon from "@lucide/svelte/icons/camera";
	import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
	import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
	import ClockIcon from "@lucide/svelte/icons/clock";
	import FolderIcon from "@lucide/svelte/icons/folder-open";
	import HardDriveIcon from "@lucide/svelte/icons/hard-drive";
	import LoaderIcon from "@lucide/svelte/icons/loader-circle";
	import MonitorIcon from "@lucide/svelte/icons/monitor-play";
	import MoonIcon from "@lucide/svelte/icons/moon";
	import PlayIcon from "@lucide/svelte/icons/play";
	import RefreshIcon from "@lucide/svelte/icons/refresh-cw";
	import SearchIcon from "@lucide/svelte/icons/search";
	import SunIcon from "@lucide/svelte/icons/sun";
	import VideoIcon from "@lucide/svelte/icons/video";
	import * as Badge from "$lib/components/ui/badge";
	import * as Button from "$lib/components/ui/button";
	import * as Input from "$lib/components/ui/input";
	import * as ScrollArea from "$lib/components/ui/scroll-area";
	import * as Select from "$lib/components/ui/select";
	import * as Separator from "$lib/components/ui/separator";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { PageData } from "./$types";

	type Day = PageData["days"][number];

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
	let daysOverride = $state<Day[] | null>(null);
	let selectedDateOverride = $state<string | null>(null);
	let clips = $state<Clip[]>([]);
	let selectedClip = $state<Clip | null>(null);
	let loadingClips = $state(false);
	let refreshingDays = $state(false);
	let archiveError = $state("");
	let search = $state("");
	let activeTab = $state<"live" | "archive">("live");
	let theme = $state<Mode>("light");

	const days = $derived(daysOverride ?? data.days);
	const selectedDate = $derived(
		selectedDateOverride ?? data.selectedDate ?? data.days[0]?.date ?? ""
	);
	const totalClips = $derived(days.reduce((sum, day) => sum + day.count, 0));
	const maxDayCount = $derived(Math.max(1, ...days.map((day) => day.count)));
	const selectedDay = $derived(days.find((day) => day.date === selectedDate) ?? null);
	const filteredDays = $derived(
		days.filter((day) => day.date.includes(search.trim())).slice(0, 420)
	);
	const groupedClips = $derived.by(() => {
		const groups = new Map<string, Clip[]>();
		for (const clip of clips) groups.set(clip.hour, [...(groups.get(clip.hour) ?? []), clip]);
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
		localStorage.setItem("motion-ui-theme", mode);
	}

	function toggleTheme() {
		setTheme(theme === "dark" ? "light" : "dark");
	}

	async function refreshDays() {
		refreshingDays = true;
		archiveError = "";

		try {
			const response = await fetch("/api/archive/days?refresh=1");
			if (!response.ok) throw new Error("days");
			const nextDays: Day[] = (await response.json()).days;
			daysOverride = nextDays;
			if (!nextDays.some((day) => day.date === selectedDate)) {
				selectedDateOverride = nextDays[0]?.date ?? "";
			}
		} catch {
			archiveError = "无法刷新历史目录";
		} finally {
			refreshingDays = false;
		}
	}

	async function loadClips(date: string) {
		if (!date) return;

		loadingClips = true;
		archiveError = "";

		try {
			const response = await fetch(`/api/archive/day/${date}`);
			if (!response.ok) throw new Error("clips");
			clips = (await response.json()).clips;
			selectedClip = clips[0] ?? null;
		} catch {
			clips = [];
			selectedClip = null;
			archiveError = "无法读取当天片段";
		} finally {
			loadingClips = false;
		}
	}

	$effect(() => {
		loadClips(selectedDate);
	});

	$effect(() => {
		if (typeof localStorage === "undefined") return;
		const stored = localStorage.getItem("motion-ui-theme");
		const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
		theme = stored === "dark" || (!stored && prefersDark) ? "dark" : "light";
	});
</script>

<main class="min-h-screen bg-background text-foreground">
		<div class="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-4 px-3 py-3 sm:px-5 lg:px-6">
			<header
				class="flex flex-col gap-3 border-b border-border/70 pb-3 lg:flex-row lg:items-center lg:justify-between"
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

			<Tabs.Tabs bind:value={activeTab} class="min-h-0 flex-1">
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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

					<div class="flex items-center gap-2">
						<Button.Button variant="outline" class="gap-2" onclick={refreshDays} disabled={refreshingDays}>
							{#if refreshingDays}
								<LoaderIcon class="size-4 animate-spin" />
							{:else}
								<RefreshIcon class="size-4" />
							{/if}
							刷新
						</Button.Button>
					</div>
				</div>

				<Tabs.Content value="live" class="mt-4 min-h-0">
					<section class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
						<div class="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
							<div class="flex items-center justify-between border-b border-border px-3 py-2">
								<div class="flex items-center gap-2 text-sm font-medium">
									<span class="size-2 rounded-full bg-emerald-500"></span>
									直播
								</div>
								<Badge.Badge variant="outline">{data.config.streamUrl}</Badge.Badge>
							</div>
							<div class="bg-black">
								<img
									src="/api/live"
									alt="Motion 实时监控画面"
									class="block aspect-video h-auto max-h-[calc(100vh-210px)] min-h-[260px] w-full object-contain"
								/>
							</div>
						</div>

						<aside class="rounded-lg border border-border bg-card p-4 shadow-sm">
							<div class="flex items-center gap-2 text-sm font-semibold">
								<HardDriveIcon class="size-4" />
								归档概览
							</div>
							<div class="mt-4 grid grid-cols-2 gap-3">
								<div class="rounded-lg border border-border bg-background p-3">
									<div class="text-2xl font-semibold">{days.length}</div>
									<div class="mt-1 text-xs text-muted-foreground">有记录的日期</div>
								</div>
								<div class="rounded-lg border border-border bg-background p-3">
									<div class="text-2xl font-semibold">{totalClips}</div>
									<div class="mt-1 text-xs text-muted-foreground">历史片段</div>
								</div>
							</div>
							<Separator.Separator class="my-4" />
							{#if selectedDay}
								<button
									class="flex w-full items-center justify-between rounded-lg border border-border bg-background p-3 text-left transition hover:bg-muted"
									onclick={() => pickDay(selectedDay.date)}
								>
									<div>
										<div class="font-medium">{formatDate(selectedDay.date)}</div>
										<div class="mt-1 text-xs text-muted-foreground">
											{selectedDay.first} - {selectedDay.last}
										</div>
									</div>
									<Badge.Badge>{selectedDay.count}</Badge.Badge>
								</button>
							{/if}
						</aside>
					</section>
				</Tabs.Content>

				<Tabs.Content value="archive" class="mt-4 min-h-0">
					<section class="grid min-h-[calc(100vh-180px)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
						<aside class="flex min-h-0 flex-col rounded-lg border border-border bg-card shadow-sm">
							<div class="border-b border-border p-3">
								<div class="relative">
									<SearchIcon
										class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input.Input bind:value={search} class="pl-8" placeholder="查找日期" />
								</div>
								<div class="mt-3">
									<Select.Select
										type="single"
										value={selectedDate}
										onValueChange={(value) => (selectedDateOverride = value)}
									>
										<Select.Trigger class="w-full">
											{selectedDate ? formatDate(selectedDate) : "选择日期"}
										</Select.Trigger>
										<Select.Content class="max-h-80">
											{#each days.slice(0, 180) as day}
												<Select.Item value={day.date} label={`${formatDate(day.date)} · ${day.count} 段`} />
											{/each}
										</Select.Content>
									</Select.Select>
								</div>
							</div>

							<ScrollArea.ScrollArea class="min-h-0 flex-1">
								<div class="space-y-1 p-2">
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
								</div>
							</ScrollArea.ScrollArea>
						</aside>

						<div class="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
							<section class="min-w-0 rounded-lg border border-border bg-card shadow-sm">
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

								<div class="bg-black">
									{#if selectedClip}
										<video
											src={playerSrc}
											controls
											muted
											playsinline
											class="aspect-video max-h-[calc(100vh-250px)] min-h-[240px] w-full bg-black object-contain"
											onended={() => playOffset(1)}
										>
											<track kind="captions" />
										</video>
									{:else}
										<div
											class="flex aspect-video min-h-[240px] items-center justify-center bg-background text-muted-foreground"
										>
											{#if loadingClips}
												<LoaderIcon class="size-6 animate-spin" />
											{:else}
												<VideoIcon class="size-7" />
											{/if}
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

							<aside class="flex min-h-0 flex-col rounded-lg border border-border bg-card shadow-sm">
								<div class="flex items-center justify-between border-b border-border px-3 py-2">
									<div class="flex items-center gap-2 text-sm font-semibold">
										<PlayIcon class="size-4" />
										时间线
									</div>
									{#if loadingClips}
										<LoaderIcon class="size-4 animate-spin text-muted-foreground" />
									{/if}
								</div>

								{#if archiveError}
									<div class="p-3 text-sm text-destructive">{archiveError}</div>
								{/if}

								<ScrollArea.ScrollArea class="min-h-0 flex-1">
									<div class="space-y-4 p-3">
										{#each groupedClips as group}
											<div>
												<div class="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
													<span>{group.hour}:00</span>
													<Separator.Separator class="flex-1" />
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
