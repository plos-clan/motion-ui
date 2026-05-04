<script lang="ts">
import { invalidateAll } from "$app/navigation"
import LockKeyholeIcon from "@lucide/svelte/icons/lock-keyhole"
import * as Button from "$lib/components/ui/button"
import * as Dialog from "$lib/components/ui/dialog"
import * as Input from "$lib/components/ui/input"

let token = $state("")
let error = $state("")
let isSubmitting = $state(false)

const submit = async () => {
	if (!token || isSubmitting) return

	error = ""
	isSubmitting = true

	try {
		const response = await fetch("/api/auth", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ token }),
		})

		if (!response.ok) {
			error = response.status === 401 ? "密码不正确" : "无法完成验证"
			return
		}

		await invalidateAll()
	} catch {
		error = "无法连接服务器"
	} finally {
		isSubmitting = false
	}
}
</script>

<Dialog.Dialog open>
	<Dialog.Content
		class="max-w-sm rounded-lg bg-card p-5 text-card-foreground"
		escapeKeydownBehavior="ignore"
		interactOutsideBehavior="ignore"
	>
		<div class="flex items-start gap-3">
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background"
			>
				<LockKeyholeIcon class="size-4" />
			</div>
			<Dialog.Header class="min-w-0 gap-1 text-left">
				<Dialog.Title>访问 Motion UI</Dialog.Title>
				<Dialog.Description>输入访问密码继续。</Dialog.Description>
			</Dialog.Header>
		</div>

		<form
			class="grid gap-3"
			onsubmit={(event) => {
				event.preventDefault()
				submit()
			}}
		>
			<div class="grid gap-1.5">
				<Input.Input
					bind:value={token}
					type="password"
					autocomplete="current-password"
					autofocus
					aria-label="访问密码"
					aria-invalid={error ? "true" : undefined}
					placeholder="访问密码"
				/>
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>

			<Button.Button
				type="submit"
				class="w-full"
				disabled={isSubmitting || token.length === 0}
			>
				{isSubmitting ? "验证中" : "进入"}
			</Button.Button>
		</form>
	</Dialog.Content>
</Dialog.Dialog>
