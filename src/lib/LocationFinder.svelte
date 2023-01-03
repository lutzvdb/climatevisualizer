<script lang="ts">
	import getLocationsByString from '$lib/geoLocation'
	import { differenceInMilliseconds } from 'date-fns'

	export let lat: number | null = null
	export let lon: number | null = null
	export let prettyLocName: string | null = null

    let locElRefs: any[] = []
	let locations: any[] | null = null
	let locName: string = ''
	let looking: boolean = false
	let lastLetterTime: Date = new Date()
	let selectedLocation: number | null = null
	let noResultsFound: boolean = false
    let locationNameBeforeLastKeydown: string = ''

	const checkKeyDown = (e: any) => {
		if (e.key == 'ArrowDown' && locations && locations.length > 0) {
			if (selectedLocation === null) {
				selectedLocation = 0
			} else {
				selectedLocation += 1
				if (selectedLocation == locations.length) selectedLocation = 0
			}
            locElRefs[selectedLocation].scrollIntoView(false)
			e.preventDefault()
		} else if (e.key == 'ArrowUp' && locations && locations.length > 0) {
			if (selectedLocation === null) {
				selectedLocation = locations.length
			} else {
				selectedLocation -= 1
				if (selectedLocation == -1) selectedLocation = locations.length - 1
			}
            locElRefs[selectedLocation].scrollIntoView(false)
			e.preventDefault()
		} else if (e.key == 'Enter' && locations && locations.length > 0) {
			if (selectedLocation == null) return

			const loc = locations[selectedLocation]
			lat = loc.latitude
			lon = loc.longitude
			prettyLocName = loc.name + ', ' + loc.country
            locations = null
		} else {
            if(locationNameBeforeLastKeydown.length != locName.length) {
                // we added or removed a key! Start looking for cities after 300ms
                lastLetterTime = new Date()

		        setTimeout(startLooking, 300)
            }
        }

        locationNameBeforeLastKeydown = locName
	}

	const startLooking = () => {
		if (differenceInMilliseconds(new Date(), lastLetterTime) > 290) {
			// we stopped typing --> lets look
			fetchLatLon()
		}
	}

	const fetchLatLon = async () => {
		looking = true
		const res = await getLocationsByString(locName)

		if (res === null) return
		if (res.length == 0) {
			locations = null
			noResultsFound = true
			looking = false
			return
		}

		noResultsFound = false
		if (res.length == 1) {
			lat = res[0].latitude
			lon = res[0].longitude
		} else {
			locations = res
            selectedLocation = 0
		}

		looking = false
	}
</script>

<div>
	<div>To look up your city, start typing its name:</div>
	<div class="flex flex-row gap-4 py-2">
		<div class="grow">
            <!-- svelte-ignore a11y-autofocus -->
			<input
                autofocus
				bind:value={locName}
				on:keydown={checkKeyDown}
				class="p-4 w-full rounded-lg border border-gray-300"
                placeholder="Berlin"
			/>
		</div>
		<!-- <div class="flex items-center">
			<button class="btn btn-success normal-case" on:click={fetchLatLon}>
				{#if looking}
					Looking...
				{:else}
					Find city!
				{/if}
			</button>
		</div> -->
	</div>
	{#if noResultsFound && !looking}
		<div class="h-64 w-full rounded-xl overflow-scroll">
			<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
				<li class="p-4">No results found.</li>
			</ul>
		</div>
	{/if}
	{#if locations && locations.length > 0}
		<div class="h-64 w-full rounded-xl overflow-scroll">
			<ul class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-full">
				{#each locations as loc, i}
					<li class={selectedLocation == i ? 'bg-gray-200' : ''} bind:this={locElRefs[i]}>
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
