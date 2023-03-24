import { format, parseISO, addDays } from 'date-fns'

export default async function getCombinedHistoricalAndForecastWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date = parseISO('1950-01-01'),
    dateTo: Date = parseISO('2050-12-31')
) {
    // split up data into two parts:
    // history from ERA5 up until today
    // future from climate modeling for future days
    let dateFromHistory = dateFrom
    // era5-data is released with some lag
    let dateToHistory = addDays(new Date(), -14) 
    let dateFromForecast = addDays(dateToHistory, 1)
    let dateToForecast = dateTo

    let resHistorical = await getHistoricalWeatherData(lat, lon, dateFromHistory, dateToHistory)
    let resForecast = await getClimateForecastWeatherData(lat, lon, dateFromForecast, dateToForecast)

    if (!resForecast) return
    if (!resHistorical) return

    let resTotal: any = {}
    Object.keys(resHistorical).forEach(k => { resTotal[k] = resHistorical[k].concat(resForecast[k]) })

    return (resTotal)
}

async function getGenericDailyDataFromOpenMeteo(
    endpoint: string,
    lat: number,
    lon: number,
    dateFrom: Date,
    dateTo: Date
) {
    const df = format(dateFrom, 'yyyy-MM-dd')
    const dt = format(dateTo, 'yyyy-MM-dd')

    let api = endpoint
        + '?latitude=' + Math.round(100 * lat) / 100
        + '&longitude=' + Math.round(100 * lon) / 100
        + '&start_date=' + df
        + '&end_date=' + dt
        + '&daily=temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum&timezone=Europe%2FBerlin'

    const res = await (await fetch(api)).json()

    return (res.daily)
}

async function getClimateForecastWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date,
    dateTo: Date
) {
    return await getGenericDailyDataFromOpenMeteo('https://climate-api.open-meteo.com/v1/climate', lat, lon, dateFrom, dateTo)
}

async function getHistoricalWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date,
    dateTo: Date
) {
    return await getGenericDailyDataFromOpenMeteo('https://archive-api.open-meteo.com/v1/era5', lat, lon, dateFrom, dateTo)
}