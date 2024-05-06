let BASE_URL = ''
if (import.meta.env.PROD) {
  BASE_URL = 'http://localhost:3000'
}

export const TIME_OUT = 0
export { BASE_URL }
