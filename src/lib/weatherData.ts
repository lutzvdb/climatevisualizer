import { format, parseISO, addDays, getOverlappingDaysInIntervals } from 'date-fns'

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
    dateTo: Date,
    additionalParams: string = ''
) {
    const df = format(dateFrom, 'yyyy-MM-dd')
    const dt = format(dateTo, 'yyyy-MM-dd')

    let api = endpoint
        + '?latitude=' + Math.round(100 * lat) / 100
        + '&longitude=' + Math.round(100 * lon) / 100
        + '&start_date=' + df
        + '&end_date=' + dt
        + '&daily=temperature_2m_max,temperature_2m_min,rain_sum,snowfall_sum&timezone=Europe%2FBerlin'
        + additionalParams

    const resDirect = await fetch(api)

    const res = await resDirect.json()

    return (res.daily)
}

async function getClimateForecastWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date,
    dateTo: Date
) {
    let res = await getGenericDailyDataFromOpenMeteo(
        'https://climate-api.open-meteo.com/v1/climate',
        lat,
        lon,
        dateFrom,
        dateTo,
        //'&models=CMCC_CM2_VHR4,FGOALS_f3_H,HiRAM_SIT_HR,MRI_AGCM3_2_S,EC_Earth3P_HR,MPI_ESM1_2_XR,NICAM16_8S')
        '&models=MRI_AGCM3_2_S')

    // for the sake of not averaging out all forecasted peaks, we'll stick to one
    // model for now: MRI
    // do post-processing: We requested multiple models; average values
    // for an ensemble-forecast
    /* res = ensemble(res, 'rain_sum')
    res = ensemble(res, 'snowfall_sum')
    res = ensemble(res, 'temperature_2m_max')
    res = ensemble(res, 'temperature_2m_min') */

    return res
}

// Averages out all columns that start with targetCol in res
function ensemble(res: any, targetCol: string) {
    let colNames = Object.keys(res)
    // get all cols starting with targetCol
    const regexp = new RegExp('^' + targetCol);
    let relevantCols = colNames.filter(i => regexp.test(i))

    // initialize target column and N counter
    res[targetCol] = new Array<number>(res[relevantCols[1]].length).fill(0)
    res[targetCol + '_n'] = new Array<number>(res[relevantCols[1]].length).fill(0)

    // add up element-wise and keep track of non-NA count
    relevantCols.map(col => {
        res[targetCol] = addvector(res[col], res[targetCol])
        res[targetCol + '_n'] = addvector(res[targetCol + '_n'], res[col].map(i => i === null ? 0 : 1))
    })
    // aaand divide
    res[targetCol] = res[targetCol].map((item: number, index: number) => Math.round(100 * (item / res[targetCol + '_n'][index])) / 100)

    return (res)
}

function addvector(a: number[], b: number[]) {
    return a.map((e, i) => e + b[i]);
}

async function getHistoricalWeatherData(
    lat: number,
    lon: number,
    dateFrom: Date,
    dateTo: Date
) {
    return await getGenericDailyDataFromOpenMeteo('https://archive-api.open-meteo.com/v1/era5', lat, lon, dateFrom, dateTo)
}