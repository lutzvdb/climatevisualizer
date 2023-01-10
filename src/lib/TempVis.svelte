<script lang="ts">
	import { escape, op, table } from 'arquero'
	import { Line } from 'svelte-chartjs'
	import { ThermometerIcon } from 'svelte-feather-icons'

	import LinearRegression from './linearRegression'

	export let wthData: any = null
	export let type: string = 'Summer'
	export let latitude: number
	export let unit: string = 'C'

	let hotCutoff: number = 25
	let freezingCutoff: number = 0
	let potentialHotCutoffs: number[] = [15, 20, 25, 30, 35, 40, 45]

	$: {
		// update cutoffs for unit change
		hotCutoff = unit == 'C' ? 25 : 80
		potentialHotCutoffs = unit == 'C' ? [15, 20, 25, 30, 35, 40, 45] : [60, 70, 80, 90, 100, 110]
		freezingCutoff = unit == 'C' ? 0 : 32
	}

	let summerMonths = latitude > 0 ? [6, 7, 8] : [12, 1, 2]
	let winterMonths = latitude > 0 ? [12, 1, 2] : [6, 7, 8]

	let yearlyAverages: any = null
	let plotData: any = null
	let firstTrendPoint: number
	let lastTrendPoint: number
	let totalDelta: number | null = null
	let gradient: number | null = null

	let plotData2: any = null
	let firstTrendPoint2: number
	let lastTrendPoint2: number

	$: {
		if (wthData) {
			let filteredData = table(wthData).filter(
				(d: any) => d.temperature_2m_max !== null && d.temperature_2m_min !== null
			)

			let specialDayData = filteredData

			if (type == 'Summer') {
				filteredData = filteredData
					.filter(escape((d: any) => summerMonths.includes(op.month(d.time) + 1)))
					.derive({ year: (d: any) => op.year(d.time) })
					.reify()

				specialDayData = filteredData
					.derive({ hotDay: escape((d: any) => (d.temperature_2m_max >= hotCutoff ? 1 : 0)) })
					.groupby('year')
					.rollup({
						noSpecialDays: (d: any) => op.sum(d.hotDay)
					})
					.reify()
			} else if (type == 'Winter') {
				filteredData = filteredData
					.filter(escape((d: any) => winterMonths.includes(op.month(d.time) + 1)))
					.derive({ year: (d: any) => op.year(d.time) })
					.reify()

				specialDayData = filteredData
					.derive({
						freezingDay: escape((d: any) => (d.temperature_2m_min <= freezingCutoff ? 1 : 0))
					})
					.groupby('year')
					.rollup({
						noSpecialDays: (d: any) => op.sum(d.freezingDay)
					})
					.reify()
			}
			let specialDays = specialDayData.objects()
			yearlyAverages = filteredData
				.groupby('year')
				.rollup({
					avgDailyHigh: (d: any) => op.mean(d.temperature_2m_max),
					avgDailyLow: (d: any) => op.mean(d.temperature_2m_min)
				})
				.objects()

			const linTrendHigh = LinearRegression(
				yearlyAverages.map((i: any) => [i.year, i.avgDailyHigh])
			)
			const linTrendLow = LinearRegression(yearlyAverages.map((i: any) => [i.year, i.avgDailyLow]))
			const linTrendSD = LinearRegression(specialDays.map((i: any) => [i.year, i.noSpecialDays]))

			firstTrendPoint = Math.round(linTrendHigh.predictions[0][1] * 10) / 10
			lastTrendPoint =
				Math.round(linTrendHigh.predictions[linTrendHigh.predictions.length - 1][1] * 10) / 10
			firstTrendPoint2 = Math.round(linTrendSD.predictions[0][1] * 10) / 10
			lastTrendPoint2 =
				Math.round(linTrendSD.predictions[linTrendSD.predictions.length - 1][1] * 10) / 10
			gradient = Math.round(linTrendHigh.gradient * 10 * 10) / 10 // per decade
			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 10) / 10

			const lastYear = linTrendHigh.predictions[linTrendHigh.predictions.length - 1][0]

			plotData = {
				labels: yearlyAverages.map((i: any) => i.year),
				datasets: [
					{
						label: 'Avg. daily high',
						data: yearlyAverages.map((i: any) => i.avgDailyHigh),
						borderColor: 'rgba(255,0,0,0.1)',
						backgroundColor: 'rgba(255,0,0,0.05)',
						pointRadius: 2,
                        fill: {
                            target: '+1',
                            above: 'rgba(255, 0, 0, 0.05)',
                            below: 'rgba(255, 0, 0, 0.05)'
                        }
					},
					{
						label: 'Avg. daily high (trend)',
						data: linTrendHigh.predictions.map((i: any) =>
							i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
						),
						borderColor: 'rgba(255,0,0,0.7)',
						backgroundColor: 'rgba(255,0,0,0.3)',
						pointRadius: 5
					},
					{
						label: 'Avg. daily low',
						data: yearlyAverages.map((i: any) => i.avgDailyLow),
						borderColor: 'rgba(0,0,255,0.1)',
						backgroundColor: 'rgba(0,0,255,0.02)',
						pointRadius: 2,
                        fill: {
                            target: '+1',
                            above: 'rgba(0, 0, 255, 0.05)',
                            below: 'rgba(0, 0, 255, 0.05)'
                        }
					},
					{
						label: 'Avg. daily low (trend)',
						data: linTrendLow.predictions.map((i: any) =>
							i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
						),
						borderColor: 'rgba(0,0,200,0.7)',
						backgroundColor: 'rgba(0,0,255,0.3)',
						pointRadius: 5
					}
				]
			}

			plotData2 = {
				labels: specialDays.map((i: any) => i.year),
				datasets: [
					{
						label:
							type == 'Summer'
								? 'Number of days >= ' + hotCutoff + '°' + unit
								: 'Number of days <= ' + freezingCutoff + '°' + unit,
						data: specialDays.map((i: any) => i.noSpecialDays),
						borderColor: type == 'Summer' ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)',
						backgroundColor: type == 'Summer' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)',
						pointRadius: 2
					},
					{
						label: 'Trend',
						data: linTrendSD.predictions.map((i: any) =>
							i[0] == 1960 || i[0] == lastYear ? i[1] : undefined
						),
						borderColor: type == 'Summer' ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,255,0.7)',
						backgroundColor: type == 'Summer' ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,255,0.3)',
						pointRadius: 5
					}
				]
			}
		}
	}
</script>

<div>
	<div class="mt-8">
		<h3 class="text-2xl w-full text-center my-4">
			<ThermometerIcon class="inline mr-2" />
			{type}: {totalDelta && Math.abs(totalDelta)}°{unit}
			{#if totalDelta && totalDelta > 0}
				hotter
			{:else if totalDelta && totalDelta < 0}
				colder
			{/if}
		</h3>
		<h4 class="text-xl m-4 mt-8">Average daily {type == 'Summer' ? 'high' : 'low'}</h4>
		<p>
			{#if lastTrendPoint && firstTrendPoint && gradient && totalDelta}
				{#if type == 'Summer'}
					In the 1960s, the average summer day had a daily high of <strong
						>{firstTrendPoint}°{unit}</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°{unit}</strong>. That's
					a change of about {gradient}°{unit} per decade and is a total change of {totalDelta}°{unit}
					! Oh, by the way, summer means {latitude > 0
						? 'June through August'
						: 'December through February'} here.
				{/if}
				{#if type == 'Winter'}
					In the 1960s, the average winter day had a daily high of <strong
						>{firstTrendPoint}°{unit}</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°{unit}</strong>. That's
					a change of about {gradient}°{unit} per decade and is a total change of {totalDelta}°{unit}
					! By winter days I mean days from {latitude > 0
						? 'December to February'
						: 'June to August'}.
				{/if}
			{/if}
		</p>
		{#if plotData}
			<Line data={plotData} options={{ spanGaps: true, plugins: { legend: { display: false } } }} />
		{/if}
		<h4 class="text-xl m-4 mt-8">
			{#if type == 'Summer'}
				Number of days hotter than
				<select class="inline select select-bordered w-min select-sm" bind:value={hotCutoff}>
					{#each potentialHotCutoffs as co}
						<option value={co}>{co}°{unit}</option>
					{/each}
				</select>
			{:else}
				Number of freezing days
			{/if}
		</h4>
		{#if !(// don't display if there was exactly 0 change (constant data ==> no freezing days / all hot days)
			(lastTrendPoint2 - firstTrendPoint2 == 0))}
			<p>
				{#if type == 'Summer'}
					In the plot below, you can see the number of days in the summer months where daily maximum
					temperatures were &geq;{hotCutoff}°{unit}. For many places on earth, we can see that this
					number of days has greatly increased in the past 60 years. In this case, the number of hot
					days has changed
					<strong
						>from {firstTrendPoint2} days in the 1960s to {lastTrendPoint2} days in present time.</strong
					>
				{:else}
					Below, you can see the number of days in the winter months where daily minimum
					temperatures were &leq;{freezingCutoff}°{unit}. For many places on earth, we can see that
					this number of days is steadily decreasing. In this case, the number of freezing days has
					changed
					<strong
						>from {firstTrendPoint2} days in the 1960s to {lastTrendPoint2} days in present time.</strong
					>
				{/if}
			</p>
			{#if plotData2}
				<Line
					data={plotData2}
					options={{ spanGaps: true, plugins: { legend: { display: false } } }}
				/>
			{/if}
        {:else}
            No data found.
		{/if}
	</div>
</div>
