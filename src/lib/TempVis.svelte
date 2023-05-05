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
	let plotDataLow: any = null
	let firstTrendPoint: number
	let thisYearTrendPoint: number
	let lastTrendPoint: number
	let totalDelta: number | null = null
	let todayDelta: number | null = null
	let gradient: number | null = null
	let lastYear: number | null = null
	let firstYear: number | null = null
	let curYear: number = new Date().getFullYear() - 1 // past year has full true measurements

	let plotData2: any = null
	let firstTrendPoint2: number
	let thisYearTrendPoint2: number
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

			const linTrendHighPast = LinearRegression(
				yearlyAverages
					.filter((i: any) => i.year <= curYear)
					.map((i: any) => [i.year, i.avgDailyHigh])
			)
			const linTrendHighFuture = LinearRegression(
				yearlyAverages
					.filter((i: any) => i.year > curYear)
					.map((i: any) => [i.year, i.avgDailyHigh])
			)
			const linTrendLowPast = LinearRegression(
				yearlyAverages
					.filter((i: any) => i.year <= curYear)
					.map((i: any) => [i.year, i.avgDailyLow])
			)
			const linTrendLowFuture = LinearRegression(
				yearlyAverages.filter((i: any) => i.year > curYear).map((i: any) => [i.year, i.avgDailyLow])
			)

			const linTrendSDPast = LinearRegression(
				specialDays.filter((i: any) => i.year <= curYear).map((i: any) => [i.year, i.noSpecialDays])
			)
			const linTrendSDFuture = LinearRegression(
				specialDays.filter((i: any) => i.year > curYear).map((i: any) => [i.year, i.noSpecialDays])
			)

			// trendpoints for daily high values
			firstTrendPoint = Math.round(linTrendHighPast.predictions[0][1] * 10) / 10
			thisYearTrendPoint =
				Math.round(linTrendHighPast.predictions.filter((i) => i[0] == curYear)[0][1] * 10) / 10
			lastTrendPoint =
				Math.round(
					linTrendHighFuture.predictions[linTrendHighFuture.predictions.length - 1][1] * 10
				) / 10

			// trendpoints for special day values
			firstTrendPoint2 = Math.round(linTrendSDPast.predictions[0][1] * 10) / 10
			thisYearTrendPoint2 =
				Math.round(linTrendSDPast.predictions.filter((i) => i[0] == curYear)[0][1] * 10) / 10
			lastTrendPoint2 =
				Math.round(linTrendSDFuture.predictions[linTrendSDFuture.predictions.length - 1][1] * 10) /
				10

			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 10) / 10
			todayDelta = Math.round((thisYearTrendPoint - firstTrendPoint) * 10) / 10

			firstYear = yearlyAverages[0].year
			lastYear = yearlyAverages[yearlyAverages.length - 1].year

			plotData = {
				labels: yearlyAverages.map((i: any) => i.year),
				datasets: [
					{
						label: 'Avg. daily high (observed)',
						data: yearlyAverages.map((i: any) => (i.year < curYear ? i.avgDailyHigh : null)),
						borderColor: 'rgba(255,0,0,0.3)',
						backgroundColor: 'rgba(255,0,0,0.05)',
						pointRadius: 2,
						fill: {
							target: '+2',
							above: 'rgba(255, 0, 0, 0.05)',
							below: 'rgba(255, 0, 0, 0.05)'
						}
					},
					{
						label: 'Avg. daily high (projected)',
						data: yearlyAverages.map((i: any) => (i.year >= curYear ? i.avgDailyHigh : null)),
						borderColor: 'rgba(255,0,0,0.3)',
						backgroundColor: 'rgba(255,0,0,0.05)',
						pointRadius: 2,
						fill: {
							target: '+1',
							above: 'rgba(255, 0, 0, 0.03)',
							below: 'rgba(255, 0, 0, 0.03)'
						},
						borderDash: [4, 4]
					},
					{
						label: 'Avg. daily high (trend)',
						data: linTrendHighPast.predictions
							.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
							.concat(
								linTrendHighFuture.predictions.map((i: any) =>
									i[0] == lastYear ? i[1] : undefined
								)
							),
						borderColor: 'rgba(255,0,0,0.7)',
						backgroundColor: 'rgba(255,0,0,0.3)',
						pointRadius: 5
					}
				]
			}

			plotDataLow = {
				labels: yearlyAverages.map((i: any) => i.year),
				datasets: [
					{
						label: 'Avg. daily low (observed)',
						data: yearlyAverages.map((i: any) => (i.year < curYear ? i.avgDailyLow : null)),
						borderColor: 'rgba(0,0,255,0.3)',
						backgroundColor: 'rgba(0,0,255,0.02)',
						pointRadius: 2,
						fill: {
							target: '+2',
							above: 'rgba(0, 0, 255, 0.05)',
							below: 'rgba(0, 0, 255, 0.05)'
						}
					},
					{
						label: 'Avg. daily low (projected)',
						data: yearlyAverages.map((i: any) => (i.year >= curYear ? i.avgDailyLow : null)),
						borderColor: 'rgba(0,0,255,0.3)',
						backgroundColor: 'rgba(0,0,255,0.02)',
						pointRadius: 2,
						fill: {
							target: '+1',
							above: 'rgba(0, 0, 255, 0.03)',
							below: 'rgba(0, 0, 255, 0.03)'
						},
						borderDash: [4, 4]
					},
					{
						label: 'Avg. daily low (trend)',
						data: linTrendLowPast.predictions
							.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
							.concat(
								linTrendLowFuture.predictions.map((i: any) => (i[0] == lastYear ? i[1] : undefined))
							),
						borderColor: 'rgba(0,0,200,0.7)',
						backgroundColor: 'rgba(0,0,255,0.3)',
						pointRadius: 5
					}
				]
			}

			let sdPlotLabel =
				type == 'Summer'
					? 'Number of days >= ' + hotCutoff + '°' + unit
					: 'Number of days <= ' + freezingCutoff + '°' + unit
			plotData2 = {
				labels: specialDays.map((i: any) => i.year),
				datasets: [
					{
						label: sdPlotLabel + ' (observed)',
						data: specialDays.map((i: any) => (i.year < curYear ? i.noSpecialDays : null)),
						borderColor: type == 'Summer' ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)',
						backgroundColor: type == 'Summer' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)',
						pointRadius: 2
					},
					{
						label: sdPlotLabel + ' (projected)',
						data: specialDays.map((i: any) => (i.year >= curYear ? i.noSpecialDays : null)),
						borderColor: type == 'Summer' ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)',
						backgroundColor: type == 'Summer' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)',
						pointRadius: 2,
						borderDash: [4, 4]
					},
					{
						label: 'Trend',
						data: linTrendSDPast.predictions
							.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
							.concat(
								linTrendSDFuture.predictions.map((i: any) => (i[0] == lastYear ? i[1] : undefined))
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
		<h3 class="text-2xl w-full text-center my-2">
			<ThermometerIcon class="inline mr-2" />
			{type}
		</h3>
		<h4 class="text-xl w-full text-center">
			{todayDelta && Math.abs(todayDelta)}°{unit}
			{#if todayDelta && todayDelta > 0}
				hotter
			{:else if todayDelta && todayDelta < 0}
				colder
			{/if} until today,<br />

			{totalDelta && Math.abs(totalDelta)}°{unit}
			{#if totalDelta && totalDelta > 0}
				hotter
			{:else if totalDelta && totalDelta < 0}
				colder
			{/if} until {lastYear}
		</h4>
		<h4 class="text-xl m-4 mt-8">Average daily high/low</h4>
		<p>
			{#if lastTrendPoint && thisYearTrendPoint && firstTrendPoint && totalDelta}
				{#if type == 'Summer'}
					In the {firstYear}s, the average summer day had a daily high of
					<strong>{firstTrendPoint}°{unit}</strong>. These days, the average daily high is
					<strong>{thisYearTrendPoint}°{unit}</strong>. Until {lastYear}, the daily high is
					projected to change to <strong>{lastTrendPoint}°{unit}</strong>. ! Oh, by the way, summer
					means {latitude > 0 ? 'June through August' : 'December through February'} here.
				{/if}
				{#if type == 'Winter'}
					In the {firstYear}s, the average winter day had a daily high of
					<strong>{firstTrendPoint}°{unit}</strong>. These days, the average daily high is
					<strong>{thisYearTrendPoint}°{unit}</strong>. Until {lastYear}, this is projected to
					change to <strong>{lastTrendPoint}°{unit}</strong>. ! By winter days I mean days from {latitude >
					0
						? 'December to February'
						: 'June to August'}.
				{/if}
			{/if}
		</p>
		<div class="mt-8">
			{#if plotData}
				<Line
					data={plotData}
					options={{
						spanGaps: true,
						plugins: {
							title: {
								display: true,
								text: 'Daily temperature high'
							},
							legend: { display: false }
						}
					}}
				/>
			{/if}
			{#if plotDataLow}
				<Line
					data={plotDataLow}
					options={{
						spanGaps: true,
						plugins: {
							title: {
								display: true,
								text: 'Daily temperature low'
							},
							legend: { display: false }
						}
					}}
				/>
			{/if}
		</div>
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
					number of days has greatly increased in the past decades. In this case, the number of hot
					days has changed
					<strong
						>from {firstTrendPoint2} days in the 1950s to {thisYearTrendPoint2} days in present time.</strong
					>
					Until {lastYear}, this is projected to change to {lastTrendPoint2} days.
				{:else}
					Below, you can see the number of days in the winter months where daily minimum
					temperatures were &leq;{freezingCutoff}°{unit}. For many places on earth, we can see that
					this number of days is steadily decreasing. In this case, the number of freezing days has
					changed
					<strong
						>from {firstTrendPoint2} days in the 1950s to {thisYearTrendPoint2} days in present time.</strong
					>
					Until {lastYear}, this is projected to change to {lastTrendPoint2} days.
				{/if}
			</p>
			{#if plotData2}
				<Line
					data={plotData2}
					options={{
						spanGaps: true,
						plugins: {
							title: {
								display: true,
								text:
									type == 'Summer'
										? 'Number of days hotter than ' + hotCutoff + '°' + unit
										: 'Number of freezing days'
							},
							legend: { display: false }
						}
					}}
				/>
			{/if}
		{:else}
			No data found.
		{/if}
	</div>
</div>
