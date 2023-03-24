import { format, parseISO } from 'date-fns'

export default async function getHistoricalWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date = parseISO('1950-01-01'),
    dateTo: Date = ((new Date()).getMonth() > 10) ?
        new Date() :
        parseISO((Number(format(new Date(), 'yyyy')) - 1) + '-12-31')
) {
    const df = format(dateFrom, 'yyyy-MM-dd')
    const dt = format(dateTo, 'yyyy-MM-dd')

    let api = 'https://archive-api.open-meteo.com/v1/era5'
        + '?latitude=' + Math.round(100 * lat) / 100
        + '&longitude=' + Math.round(100 * lon) / 100
        + '&start_date=' + df
        + '&end_date=' + dt
        + '&daily=temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum&timezone=Europe%2FBerlin'

    const res = await (await fetch(api)).json()

    return (res)
}