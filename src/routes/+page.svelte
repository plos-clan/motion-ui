<script lang="ts">
import ArchiveIcon from "lucide-svelte/icons/archive"
import CameraIcon from "lucide-svelte/icons/camera"
import VideoIcon from "lucide-svelte/icons/video"
import * as Badge from "$lib/components/ui/badge"
import * as Tabs from "$lib/components/ui/tabs"
import ArchiveTab from "./ArchiveTab.svelte"
import LiveTab from "./LiveTab.svelte"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()
let activeTab = $state<"live" | "archive">("live")

const days = $derived(data.days)
const totalClips = $derived(days.reduce((sum, day) => sum + day.count, 0))
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

		<LiveTab />
		<ArchiveTab days={data.days} selectedDate={data.selectedDate} />
	</Tabs.Tabs>
</main>
