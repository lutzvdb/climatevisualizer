<script lang="ts">
	export let unit: string = 'metric'
	let isChecked = (unit == 'metric' ? false : true) // initialize to value passed on by parent

	$: {
		unit = isChecked ? 'imperial' : 'metric'
	}
</script>

<form>
	<div class="flex flex-row w-full">
		<div class="flex gap-2 items-center">
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Metric units</span>
			<label class="relative inline-flex items-center cursor-pointer">
				<input type="checkbox" value="" class="sr-only peer" bind:checked={isChecked} />
				<div
					class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 "
				/>
			</label>
			<span class="text-sm font-medium text-gray-900 dark:text-gray-300">Imperial units</span>
		</div>
	</div>
</form>
