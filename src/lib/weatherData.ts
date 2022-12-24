import { format, parseISO } from 'date-fns'

export default async function getHistoricalWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date = parseISO('1960-01-01'),
    dateTo: Date = parseISO((Number(format(new Date(), 'yyyy')) - 1) + '-12-31')
) {
    const df = format(dateFrom, 'yyyy-MM-dd')
    const dt = format(dateTo, 'yyyy-MM-dd')

    let api = 'https://archive-api.open-meteo.com/v1/era5'
        + '?latitude=' + lat
        + '&longitude=' + lon
        + '&start_date=' + df
        + '&end_date=' + dt
        + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FBerlin'

    const res = await (await fetch(api)).json()

    return (res)
}