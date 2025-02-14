import axios_, { AxiosRequestConfig } from "axios";
import { net } from "electron";
const https = require("https");
const EventEmitter = require("events");
const defaultGoogleAPI = "https://translate.googleapis.com";

export const getProxyAxios = (info?: boolean, googleMirror?: string) => {
  let antscdn_waf_cookie1: string = "";
  if (info) {
    const axiosOptions: AxiosRequestConfig = {
      adapter: (config: AxiosRequestConfig) => {
        delete config.adapter;
        if (
          (config.url as string).startsWith(defaultGoogleAPI) &&
          config.method == "get"
        ) {
          if (googleMirror != undefined && config.url != undefined) {
            config.url = config.url.replace(defaultGoogleAPI, googleMirror);
            if (antscdn_waf_cookie1.length > 0) {
              config.headers[
                "Cookie"
              ] = `antscdn_waf_cookie1=${antscdn_waf_cookie1}`;
            }
            config.withCredentials = true;
            return axios_(config).then((res) => {
              if (typeof res.data !== "string") {
                return res; //没有遇到阻碍
              } else {
                //需要更新cookie
                const content: string = res.data;
                antscdn_waf_cookie1 = content
                  .substring(
                    content.indexOf("setCookie('antscdn_waf_cookie1',")
                  )
                  .split(",")[1]
                  .split("'")[1]; //更新cookie
                config.headers[
                  "Cookie"
                ] = `antscdn_waf_cookie1=${antscdn_waf_cookie1}`;
                console.log(
                  "update google mirror cookie as",
                  antscdn_waf_cookie1
                );
                return axios_(config);
              }
            });
          }
          console.log(config.url);

          //仅在google翻译中使用网页代理
          return new Promise(function (resolve, reject) {
            const request = net.request({
              url: config.url as string,
              method: config.method,
            });
            const localBus = new EventEmitter();
            request.on("response", (response) => {
              let globalChunk: Buffer | undefined = undefined;
              let chunks: string[] = [];
              let length: number = 0;
              let times: number = 0;
              localBus.on("done", () => {
                let text = chunks.join("");
                try {
                  resolve({
                    data: JSON.parse(text),
                    status: response.statusCode, // 接口的http 状态
                    statusText: response.statusMessage,
                    headers: response.headers,
                    config,
                  });
                } catch (e) {
                  console.log(config.url);
                  console.log("google translate input=", text);
                  reject(e);
                }
              });

              response.on("data", (mychunk) => {
                globalChunk = mychunk;
                //太神秘了，为什么要这样子才能接收到完整的数据
                function func() {
                  const currentChunk = (<Buffer>globalChunk).toString();
                  // console.log("chunk", currentChunk);
                  times += 1;
                  if (
                    chunks.length == 0 ||
                    chunks[chunks.length - 1] !== currentChunk
                  ) {
                    // console.log(times, currentChunk);
                    chunks.push(currentChunk);
                    setTimeout(func, 50);
                  } else {
                    localBus.emit("done");
                  }
                }
                func();
              });
            });
            request.on("error", (error) => {
              console.log(error);
              reject(error);
            });
            request.end();
          });
        } else {
          // 通过配置发起请求
          return axios_(config);
        }
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    };
    return axios_.create(axiosOptions);
  } else {
    return axios_.create();
  }
};

export let axios: any = getProxyAxios(true);
