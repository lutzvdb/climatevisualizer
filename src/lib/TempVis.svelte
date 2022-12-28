<script lang="ts">
	import { escape, op, table } from 'arquero'    
	import { Line } from 'svelte-chartjs'
	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		LineElement,
		LinearScale,
		PointElement,
		CategoryScale
	} from 'chart.js'
	import { ThermometerIcon } from 'svelte-feather-icons'
	ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale)

	import LinearRegression from './linearRegression'

	export let wthData: any = null
	export let type: string = 'Summer'
    export let latitude: number

    let summerMonths = latitude > 0 ? [5, 6, 7, 8] : [11, 12, 1, 2]
    let winterMonths = latitude > 0 ? [11, 12, 1, 2] : [5, 6, 7, 8]

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
					.filter(escape((d: any) => summerMonths.includes(op.month(d.time)+1)) )
					.derive({ year: (d: any) => op.year(d.time) })
					.reify()

				specialDayData = filteredData
					.derive({ hotDay: (d: any) => (d.temperature_2m_max >= 25 ? 1 : 0) })
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
					.derive({ freezingDay: (d: any) => (d.temperature_2m_min <= 0 ? 1 : 0) })
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

			firstTrendPoint = Math.round(linTrendHigh.predictions[0][1] * 100) / 100
			lastTrendPoint =
				Math.round(linTrendHigh.predictions[linTrendHigh.predictions.length - 1][1] * 100) / 100
			firstTrendPoint2 = Math.round(linTrendSD.predictions[0][1] * 100) / 100
			lastTrendPoint2 =
				Math.round(linTrendSD.predictions[linTrendSD.predictions.length - 1][1] * 100) / 100
			gradient = Math.round(linTrendHigh.gradient * 10 * 100) / 100 // per decade
			totalDelta = Math.round((lastTrendPoint - firstTrendPoint) * 100) / 100

			const lastYear = linTrendHigh.predictions[linTrendHigh.predictions.length - 1][0]

			plotData = {
				labels: yearlyAverages.map((i: any) => i.year),
				datasets: [
					{
						label: 'Avg. daily high',
						data: yearlyAverages.map((i: any) => i.avgDailyHigh),
						borderColor: 'rgba(255,0,0,0.1)',
						backgroundColor: 'rgba(255,0,0,0.2)',
						pointRadius: 3
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
						backgroundColor: 'rgba(0,0,255,0.05)',
						pointRadius: 3
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
						label: type == 'Summer' ? 'Number of days >= 25°C' : 'Number of days <= 0°C',
						data: specialDays.map((i: any) => i.noSpecialDays),
						borderColor: type == 'Summer' ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,255,0.1)',
						backgroundColor: type == 'Summer' ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,255,0.2)',
						pointRadius: 3
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
	<div class="mt-14">
		<h3 class="text-2xl w-full text-center m-4">
			<ThermometerIcon class="inline mr-2" />
			{type}: {totalDelta && Math.abs(totalDelta)}°C
			{#if totalDelta && totalDelta > 0}
				hotter
			{:else if totalDelta && totalDelta < 0}
				colder
			{/if}
		</h3>
		<p>
			{#if lastTrendPoint && firstTrendPoint && gradient && totalDelta}
				{#if type == 'Summer'}
					In the 1960s, the average summer day had a daily high of <strong
						>{firstTrendPoint}°C</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°C</strong>. That's a
					change of about {gradient}°C per decade and is a total change of {totalDelta}°C ! Oh, by
					the way, summer means {latitude > 0 ? 'May through August' : 'November through February'} here.
				{/if}
				{#if type == 'Winter'}
					In the 1960s, the average winter day had a daily high of <strong
						>{firstTrendPoint}°C</strong
					>. These days, the average daily high is <strong>{lastTrendPoint}°C</strong>. That's a
					change of about {gradient}°C per decade and is a total change of {totalDelta}°C ! By
					winter days I mean days from {latitude > 0 ? 'November to February' : 'May to August'}.
				{/if}
			{/if}
		</p>
		{#if plotData}
			<Line data={plotData} options={{ spanGaps: true, plugins: { legend: { display: false } } }} />
		{/if}
		{#if !(// don't display if there was exactly 0 change (constant data ==> no freezing days / all hot days)
			(lastTrendPoint2 - firstTrendPoint2) == 0)
        }
			<p>
				<br />
				{#if type == 'Summer'}
					In the plot below, you can see the number of days in the summer months where daily maximum
					temperatures were &gt;= 25°C. For many places on earth, we can see that this number of
					days has greatly increased in the past 60 years. In this case, the number of hot days has
					changed
					<strong
						>from {firstTrendPoint2} days in the 1960s to {lastTrendPoint2} days in present time.</strong
					>
				{:else}
					Below, you can see the number of days in the winter months where daily minimum
					temperatures were &lt;=0°C. For many places on earth, we can see that this number of days
					is steadily decreasing. In this case, the number of freezing days has changed
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
		{/if}
	</div>
</div>
