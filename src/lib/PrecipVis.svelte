<script lang="ts">
	import { op, table } from 'arquero'
	import { Line } from 'svelte-chartjs'
	import { CloudSnowIcon, CloudRainIcon } from 'svelte-feather-icons'

	import LinearRegression from './linearRegression'

	export let wthData: any = null
	export let type: string = 'rain'
	export let unit: string = 'mm'

	let yearlySum: any = null
	let dryDays: any = null
	let plotData: any = null
	let plotData2: any = null
	let plotData3: any = null
	let firstTrendPoint: number | null = null
	let thisYearTrendPoint: number | null = null
	let lastTrendPoint: number | null = null
	let firstTrendPoint2: number | null = null
	let thisYearTrendPoint2: number | null = null
	let lastTrendPoint2: number | null = null
	let firstTrendPoint3: number | null = null
	let thisYearTrendPoint3: number | null = null
	let lastTrendPoint3: number | null = null
	let totalDelta: number | null = null
	let todayDelta: number | null = null
	let lastYear: number | null = null
	let firstYear: number | null = null
	let curYear: number = new Date().getFullYear() - 1 // past year has full true measurements

	$: {
		if (wthData) {
			if (type == 'rain') {
				yearlySum = table(wthData)
					.filter((d: any) => d.rain_sum !== null)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.rain_sum),
						strongestRain: (d: any) => op.max(d.rain_sum)
					})
					.objects()
				dryDays = table(wthData)
					.filter((d: any) => d.rain_sum <= 3)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						dryDayN: (d: any) => op.count()
					})
					.objects()
			} else {
				yearlySum = table(wthData)
					.filter((d: any) => d.snowfall_sum !== null)
					.derive({ year: (d: any) => op.year(d.time) })
					.groupby('year')
					.rollup({
						sumPrecipitation: (d: any) => op.sum(d.snowfall_sum)
					})
					.objects()
			}

			const linTrendPast = LinearRegression(
				yearlySum
					.filter((i: any) => i.year <= curYear)
					.map((i: any) => [i.year, i.sumPrecipitation])
			)
			const linTrendFuture = LinearRegression(
				yearlySum.filter((i: any) => i.year > curYear).map((i: any) => [i.year, i.sumPrecipitation])
			)

			firstTrendPoint = Math.round(linTrendPast.predictions[0][1] * 10) / 10
			thisYearTrendPoint =
				Math.round(linTrendPast.predictions.filter((i) => i[0] == curYear)[0][1] * 10) / 10
			lastTrendPoint =
				Math.round(linTrendFuture.predictions[linTrendFuture.predictions.length - 1][1] * 10) / 10

			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 10) / 10
			todayDelta = Math.round((thisYearTrendPoint - firstTrendPoint) * 10) / 10

			let linTrend_dryDaysPast
			let linTrend_dryDaysFuture
			let linTrend_strongestRainPast
			let linTrend_strongestRainFuture
			if (type == 'rain') {
				linTrend_dryDaysPast = LinearRegression(
					dryDays.filter((i: any) => i.year <= curYear).map((i: any) => [i.year, i.dryDayN])
				)
				linTrend_dryDaysFuture = LinearRegression(
					dryDays.filter((i: any) => i.year > curYear).map((i: any) => [i.year, i.dryDayN])
				)
				firstTrendPoint2 = Math.round(linTrend_dryDaysPast.predictions[0][1] * 10) / 10
				thisYearTrendPoint2 =
					Math.round(linTrend_dryDaysPast.predictions.filter((i) => i[0] == curYear)[0][1] * 10) /
					10
				lastTrendPoint2 =
					Math.round(
						linTrend_dryDaysFuture.predictions[linTrend_dryDaysFuture.predictions.length - 1][1] *
							10
					) / 10

				linTrend_strongestRainPast = LinearRegression(
					yearlySum.filter((i: any) => i.year <= curYear).map((i: any) => [i.year, i.strongestRain])
				)
				linTrend_strongestRainFuture = LinearRegression(
					yearlySum.filter((i: any) => i.year > curYear).map((i: any) => [i.year, i.strongestRain])
				)
				firstTrendPoint3 = Math.round(linTrend_strongestRainPast.predictions[0][1] * 10) / 10
				thisYearTrendPoint3 =
					Math.round(
						linTrend_strongestRainPast.predictions.filter((i) => i[0] == curYear)[0][1] * 10
					) / 10
				lastTrendPoint3 =
					Math.round(
						linTrend_strongestRainFuture.predictions[
							linTrend_strongestRainFuture.predictions.length - 1
						][1] * 10
					) / 10
			}

			firstYear = yearlySum[0].year
			lastYear = yearlySum[yearlySum.length - 1].year

			plotData = {
				labels: yearlySum.map((i: any) => i.year),
				datasets: [
					{
						label: 'Yearly sum (observed)',
						data: yearlySum.map((i: any) => (i.year < curYear ? i.sumPrecipitation : null)),
						borderColor: 'rgba(0,0,255, 0.1)',
						backgroundColor: 'rgba(0,0,255,0.2)',
						pointRadius: 2
					},
					{
						label: 'Yearly sum (projected)',
						data: yearlySum.map((i: any) => (i.year >= curYear ? i.sumPrecipitation : null)),
						borderColor: 'rgba(0,0,255, 0.1)',
						backgroundColor: 'rgba(0,0,255,0.2)',
						pointRadius: 2,
						borderDash: [4, 4]
					},
					{
						label: 'Trend',
						data: linTrendPast.predictions
							.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
							.concat(
								linTrendFuture.predictions.map((i: any) => (i[0] == lastYear ? i[1] : undefined))
							),
						borderColor: 'rgba(0,0,200,0.7)',
						backgroundColor: 'rgba(0,0,255,0.3)',
						pointRadius: 5
					}
				]
			}

			if (
				type == 'rain' &&
				linTrend_dryDaysFuture &&
				linTrend_dryDaysPast &&
				linTrend_strongestRainFuture &&
				linTrend_strongestRainPast
			) {
				plotData2 = {
					labels: yearlySum.map((i: any) => i.year),
					datasets: [
						{
							label: 'Dry days per year (observed)',
							data: dryDays.map((i: any) => (i.year < curYear ? i.dryDayN : null)),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 2
						},
						{
							label: 'Dry days per year (projected)',
							data: dryDays.map((i: any) => (i.year >= curYear ? i.dryDayN : null)),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 2,
							borderDash: [4, 4]
						},
						{
							label: 'Trend',
							data: linTrend_dryDaysPast.predictions
								.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
								.concat(
									linTrend_dryDaysFuture.predictions.map((i: any) =>
										i[0] == lastYear ? i[1] : undefined
									)
								),
							borderColor: 'rgba(0,0,200,0.7)',
							backgroundColor: 'rgba(0,0,255,0.3)',
							pointRadius: 5
						}
					]
				}

				plotData3 = {
					labels: yearlySum.map((i: any) => i.year),
					datasets: [
						{
							label: 'Strongest single-day rainfall (observed)',
							data: yearlySum.map((i: any) => (i.year < curYear ? i.strongestRain : null)),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 2
						},
						{
							label: 'Strongest single-day rainfall (projected)',
							data: yearlySum.map((i: any) => (i.year >= curYear ? i.strongestRain : null)),
							borderColor: 'rgba(0,0,255, 0.1)',
							backgroundColor: 'rgba(0,0,255,0.2)',
							pointRadius: 2,
							borderDash: [4, 4]
						},
						{
							label: 'Trend',
							data: linTrend_strongestRainPast.predictions
								.map((i: any) => (i[0] == firstYear || i[0] == curYear ? i[1] : undefined))
								.concat(
									linTrend_strongestRainFuture.predictions.map((i: any) =>
										i[0] == lastYear ? i[1] : undefined
									)
								),
							borderColor: 'rgba(0,0,200,0.7)',
							backgroundColor: 'rgba(0,0,255,0.3)',
							pointRadius: 5
						}
					]
				}
			}
		}
	}
</script>

{#if !(type == 'snow' && lastTrendPoint == 0 && firstTrendPoint == 0)}
	<div>
		<div class="mt-8">
			<h3 class="text-2xl w-full text-center my-4">
				{#if type == 'rain'}
					<CloudRainIcon class="inline mr-2" />
					Amount of yearly rainfall
				{:else}
					<CloudSnowIcon class="inline mr-2" />
					Amount of yearly snowfall
				{/if}
			</h3>
			<h4 class="text-xl w-full text-center">
				{#if todayDelta && firstTrendPoint}
					{todayDelta && Math.abs(todayDelta)}{unit}
					{#if todayDelta && todayDelta > 0}
						more
					{:else if todayDelta && todayDelta < 0}
						less
					{/if}
					or {todayDelta > 0 ? '+' : ''}{Math.round(10 * 100 * (todayDelta / firstTrendPoint)) /
						10}% until today<br />
				{/if}
				{#if totalDelta && firstTrendPoint}
					{totalDelta && Math.abs(totalDelta)}{unit}
					{#if totalDelta && totalDelta > 0}
						more
					{:else if totalDelta && totalDelta < 0}
						less
					{/if}
					or {totalDelta > 0 ? '+' : ''}{Math.round(10 * 100 * (totalDelta / firstTrendPoint)) /
						10}% until {lastYear}
				{/if}
			</h4>
			<h4 class="text-xl m-4">Total yearly {type == 'rain' ? 'rainfall' : 'snowfall'}</h4>
			<p>
				{#if lastTrendPoint && firstTrendPoint && totalDelta}
					In the {firstYear}s, the average year saw
					<strong
						>{firstTrendPoint}{unit}{type == 'rain' ? ' of rainfall' : ' of snowfall'}
					</strong>. These days, the average yearly sum is
					<strong>{thisYearTrendPoint}{unit}</strong>. Until {lastYear}, this is projected to change
					to
					<strong>{lastTrendPoint}{unit}</strong>. That is a total change of about {Math.abs(
						totalDelta
					)}{unit}.
				{/if}
			</p>
			{#if plotData}
				<Line
					data={plotData}
					options={{
						spanGaps: true,
						plugins: {
							title: {
								display: true,
								text: 'Total yearly ' + (type == 'rain' ? 'rainfall' : 'snowfall')
							},
							legend: { display: false }
						}
					}}
				/>
			{/if}
			{#if type == 'rain'}
				<h4 class="text-xl m-4 mt-8">Number of dry days</h4>
				<p>
					{#if lastTrendPoint2 && firstTrendPoint2}
						In the {firstYear}s, the average year had
						<strong>{firstTrendPoint2} dry days per year </strong>. These days, the average is is
						<strong>{thisYearTrendPoint2} days</strong>. Until {lastYear}, this is projected to
						change to <strong>{lastTrendPoint2} days</strong>.
						{#if lastTrendPoint2 > firstTrendPoint2}
							Longer dry periods pose challenges to agriculture and water supply.
						{/if}
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
									text: 'Number of dry days'
								},
								legend: { display: false }
							}
						}}
					/>
				{/if}
				<h4 class="text-xl m-4 mt-8">Strongest daily rainfall</h4>
				<p>
					{#if lastTrendPoint3 && firstTrendPoint3}
						In the {firstYear}s, the day with the most rainfall had
						<strong>{firstTrendPoint3}{unit} of rainfall in a single day </strong>. By now, this has
						changed to
						<strong>{thisYearTrendPoint3}{unit}</strong>. In many places on earth, we see stronger
						daily rainfalls. Until {lastYear}, this is projected to change to
						<strong>{lastTrendPoint3}{unit}</strong>.
						{#if lastTrendPoint2 && firstTrendPoint2 && lastTrendPoint2 > firstTrendPoint2 && lastTrendPoint3 > firstTrendPoint3 && (lastTrendPoint2 - firstTrendPoint2) / firstTrendPoint2 > 0.03 && (lastTrendPoint3 - firstTrendPoint3) / firstTrendPoint3 > 0.03}
							The combination of more dry days yet stronger daily rainfall means that there is a
							tendency for the soil to be either dried out or overwhelmed with water. This is
							problematic for agriculture as plants are not supplied with a constant enough stream
							of water, potentially causing significant loss of food.
						{/if}
					{/if}
				</p>
				{#if plotData3}
					<Line
						data={plotData3}
						options={{
							spanGaps: true,
							plugins: {
								title: {
									display: true,
									text: 'Strongest daily rainfall'
								},
								legend: { display: false }
							}
						}}
					/>
				{/if}
			{/if}
		</div>
	</div>
{:else}
	<p>No relevant data found.</p>
{/if}
