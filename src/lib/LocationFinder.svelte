<script lang="ts">
	import getLocationsByString from '$lib/geoLocation'

	export let lat: number | null = null
	export let lon: number | null = null
	export let prettyLocName: string | null = null

	let locations: any[] | null = null
	let locName: string = 'Berlin'
	let looking: boolean = false

	const fetchLatLon = async () => {
		looking = true
		const res = await getLocationsByString(locName)

		if (!res) return

		if (res.length == 1) {
			lat = res[0].latitude
			lon = res[0].longitude
		} else {
			locations = res
		}

		looking = false
	}
</script>

<div>
	<div>To start, enter your city name:</div>
	<form>
		<div class="flex flex-row gap-4 p-4">
			<div class="grow">
				<input bind:value={locName} class="p-4 w-full " />
			</div>
			<div class="flex items-center">
				<button class="btn btn-success normal-case" on:click={fetchLatLon}>
					{#if looking}
						Looking...
					{:else}
						Find city!
					{/if}
				</button>
			</div>
		</div>
	</form>
	{#if locations}
		<div class="h-64 w-full mx-4 overflow-scroll">
			<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
				{#each locations as loc}
					<li>
						<a
							href={'#'}
							on:click={() => {
								lat = loc.latitude
								lon = loc.longitude
								locations = null
								prettyLocName = loc.name + ', ' + loc.country
							}}
						>
							<img
								src={'https://hatscripts.github.io/circle-flags/flags/' +
									String(loc.country_code).toLowerCase() +
									'.svg'}
								alt={loc.country}
								class="w-8 h-8"
							/>
							{loc.name}, {loc.admin1}, {loc.country}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
