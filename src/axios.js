import axios from "axios";

const initAxios = async () => {
  // 首先获取配置文件
  const response = await fetch("/config.json");
  const config = await response.json();

  // 获取api_url
  const apiUrl = config.api_url;

  // 配置axios
  axios.defaults.baseURL = apiUrl;
  console.log("Axios baseURL:", axios.defaults.baseURL);
  axios.defaults.timeout = 50000;
  axios.defaults.withCredentials = true;

  // 添加请求拦截器
  axios.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // 添加响应拦截器
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  return axios;
};

// 调用初始化函数并导出axios
const axiosInstance = await initAxios();
export default axiosInstance;
