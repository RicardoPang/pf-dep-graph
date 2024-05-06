import { BASE_URL, TIME_OUT } from './config'
import PFRequest from './request'

const pfRequest = new PFRequest({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  interceptors: {
    requestSuccessFn: (config) => {
      return config
    }
  }
})

export default pfRequest
