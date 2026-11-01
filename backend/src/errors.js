export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function asyncRoute(handler) {
  return function routeHandler(request, response, next) {
    Promise.resolve(handler(request, response, next)).catch(next)
  }
}

export function errorHandler(error, _request, response, _next) {
  const status = Number.isInteger(error.status) ? error.status : 500
  if (status >= 500 && status !== 503) console.error('API request failed:', error)
  const unavailable = status === 503
  response.status(status).json({
    error: {
      code: unavailable ? 'SERVICE_UNAVAILABLE' : status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      message: status >= 500 && !unavailable ? 'The request could not be completed.' : error.message,
    },
  })
}
