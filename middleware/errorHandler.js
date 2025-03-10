import logEvents from './logger'

const errorHandler = (error, req, res, next) => {
    logEvents(`${req.method}\t${req.url}\t${req.headers.origin}`, 'errorLog.log')
    next()
}

export default { errorHandler }