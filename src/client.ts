'use strict';

import crypto from 'crypto';
import { ajax } from 'rxjs/ajax';
import { of, from } from 'rxjs';
import { map, pluck, catchError, tap } from 'rxjs/operators';
import _ from 'lodash/fp';
import { sls } from './sls/sls';
import { LogGroup, BaseLog } from './contract';
import bigInt from 'big-integer';
import axios from 'axios'
import * as qs from 'querystring'

//@ts-ignore
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface getLogsParams {
  from: number;
  to: number;
  topic?: string;
  query?: string;
  line?: number;
  offset?: number;
  reverse?: boolean
}
interface getHistogramsParams {
  from: number;
  to: number;
  topic?: string;
  query?: string;
}
interface Selector {
  projectName?: string;
  logStore?: string;
}
// protobuf
//import protobuf from 'protobufjs';
//const builder = protobuf.loadSync(path.join(__dirname, './sls.proto'));
//const LogGroupListProto = builder.lookupType('sls.LogGroupList');

//@ts-ignore
global.XMLHttpRequest = require('xhr2');
//@ts-ignore
XMLHttpRequest.prototype._restrictedHeaders.date = false;
//@ts-ignore
XMLHttpRequest.prototype._restrictedHeaders['content-length'] = false;

export interface LogConfig {
  net?: 'intranet';
  endpoint?: string;
  region?: 'cn-hangzhou';
  accessKeyId: string;
  accessKeySecret: string;
  projectName: string;
  logStore: string;
}
/**
 * @description 阿里云日志服务客户端
 * @author jx
 * @date 2019-05-07
 * @export
 * @class SlsClient
 */
export default class SlsClient {
  private static config: LogConfig;
  private static createVarByTemplate = (
    symbols: (keyof LogConfig)[],
    template: string,
    option?: Partial<LogConfig>
  ) =>
    symbols.reduce(
      (result, symbol) =>
        result.replace(
          new RegExp(`{${symbol}}`, 'g'),
          { ...SlsClient.config, ...(option || {}) }[symbol] || symbol
        ),
      template
    );
  private static baseString = '.log.aliyuncs.com';
  constructor(config: LogConfig) {
    SlsClient.config = config;
    config.endpoint =
      config.endpoint ||
      SlsClient.createVarByTemplate(
        ['net', 'region'],
        '{region}-{net}' + SlsClient.baseString
      );
  }
  /**
   * @description 从url解析出path部分，主要用于签名
   * @private
   * @static
   * @memberof SlsClient
   */
  private static getPathByUrl = (url: string) =>
    (url.split('?').shift() || url).split(SlsClient.baseString).pop() || url;
  /**
   * @description 默认header
   * @private
   * @static
   * @memberof SlsClient
   */
  private static baseHeader = {
    accept: 'application/x-protobuf',
    'content-type': 'application/json',
    date: new Date().toUTCString(),
    'x-log-apiversion': '0.6.0',
    'x-log-signaturemethod': 'hmac-sha1'
  };
  /**
   *  请求api
   * @param url 请求地址
   * @param method 方法
   * @param queries 查询对象
   * @param body 查询主体
   * @param setHeaders 补充header
   */
  action<T extends Record<string, any>>(
    url: string,
    method: Method,
    queries: T,
    body?: Buffer | Uint8Array | null,
    setHeaders?: { [k: string]: any }
  ) {
    const headers: Record<string, any> = {
      ...SlsClient.baseHeader,
      date: new Date().toUTCString(),
      ...(body
        ? {
          'content-md5': crypto
            .createHash('md5')
            .update(body)
            .digest('hex')
            .toUpperCase(),
          'content-length': body.length
        }
        : {}),
      ...(setHeaders || {})
    };
    headers['authorization'] = SlsClient.sign(
      method,
      SlsClient.getPathByUrl(url),
      queries,
      headers
    );
    return from(axios.request({ url, method, headers }))
    // return ajax({
    //   url,
    //   method,
    //   body,
    //   headers,
    //   responseType: 'arraybuffer'
    // });
  }
  /**
   * @description 无主体请求
   * @param urlParams 用于构造url的参数
   * @param queries
   * @param selector 自定义project或logstore
   * @private
   * @memberof SlsClient
   */
  private noBodyAction = <T = Record<string, any>>(
    urlParams: {
      keys: (keyof LogConfig)[];
      template: string;
    },
    queries: T,
    selector?: Partial<LogConfig>
  ) => {
    const url = SlsClient.createVarByTemplate(
      urlParams.keys,
      urlParams.template,
      selector
    );
    return this.action(
      url + '?' + qs.stringify(queries as any),
      'GET',
      queries
    );
  };
  /**
   * @description 拉取日志
   * @memberof SlsClient
   */
  pullLogs = <
    L extends BaseLog = BaseLog,
    T extends Record<string, string> = Record<string, string>
  >(
    option: {
      shards?: number;
      cursor: string;
      count?: number;
    },
    selector?: { projectName?: string; logStore?: string }
  ) =>
    this.noBodyAction(
      {
        keys: ['endpoint', 'logStore', 'projectName'],
        template: `http://{projectName}.{endpoint}/logstores/{logStore}/shards/${option.shards ||
          0}`
      },
      { cursor: option.cursor, count: option.count || 10, type: 'log' },
      selector
    ).pipe(
      pluck('data'),
      map((buffer: ArrayBuffer) =>
        SlsClient.logListToObject<L, T>(
          sls.LogGroupList.decode(new Uint8Array(buffer, 0, buffer.byteLength))
        )
      )
    );
  /**
   * @description 查询日志
   * @memberof SlsClient
   */
  getLogs = <T = any>(
    option: getLogsParams,
    selector?: { projectName?: string; logStore?: string }
  ) =>
    this.noBodyAction(
      {
        keys: ['endpoint', 'logStore', 'projectName'],
        template: `http://{projectName}.{endpoint}/logstores/{logStore}`
      },
      { ...option, type: 'log' },
      selector
    ).pipe(
      pluck('data'),
      map((buffer: T[]) => {
        return buffer
      }
      )
    );
  /**
   * @description 分析日志
   * @memberof SlsClient
   */
  getHistograms = <T = any>(
    option: getHistogramsParams,
    selector?: { projectName?: string; logStore?: string }
  ) =>
    this.noBodyAction(
      {
        keys: ['endpoint', 'logStore', 'projectName'],
        template: `http://{projectName}.{endpoint}/logstores/{logStore}`
      },
      { ...option, type: 'histogram' },
      selector
    ).pipe(
      pluck('data'),
      map((buffer: T[]) => {
        return buffer
      }
      )
    );


  /**
   * @description 指定游标获取日志
   * @memberof SlsClient
   */
  getLogsByCursor = <
    L extends BaseLog = BaseLog,
    T extends Record<string, string> = Record<string, string>
  >(
    option: { startCursor: string; endCursor: string; shards: number },
    selector?: Selector
  ) => {
    const iStart = bigInt(Buffer.from(option.startCursor, 'base64').toString());
    const iEnd = bigInt(Buffer.from(option.endCursor, 'base64').toString());
    return this.pullLogs<L, T>(
      {
        count: iEnd.minus(iStart).valueOf(),
        cursor: option.startCursor,
        shards: option.shards
      },
      selector
    );
  };
  /**
   * @description 提交一条log
   * @memberof SlsClient
   */
  postLogStoreLogs = (log: LogGroup, selector?: Selector) => {
    const url = SlsClient.createVarByTemplate(
      ['logStore', 'projectName', 'endpoint'],
      `http://{projectName}.{endpoint}/logstores/{logStore}/shards/lb`,
      selector
    );
    const body = Buffer.from(
      sls.LogGroup.encode(SlsClient.convertLog(log)).finish()
    );
    const header = {
      'x-log-bodyrawsize': body.byteLength,
      'content-type': 'application/x-protobuf'
    };
    return this.action(url, 'POST', {}, body, header);
  };
  static bufferToLogList = (buffer: Buffer) => sls.LogGroupList.decode(buffer);
  /**
   * @description 签名
   * @author jx
   * @date 2019-05-07
   * @private
   * @static
   * @param {Method} verb
   * @param {string} path
   * @param {Record<string, any>} queries
   * @param {Record<string, any>} headers
   * @returns
   * @memberof SlsClient
   */
  private static sign(
    verb: Method,
    path: string,
    queries: Record<string, any>,
    headers: Record<string, any>
  ) {
    const contentMD5 = headers['content-md5'] || '';
    const contentType = headers['content-type'] || '';
    const date = headers['date'];
    const canonicalizedHeaders = SlsClient.getCanonicalizedHeaders(headers);
    const canonicalizedResource = SlsClient.getCanonicalizedResource(
      path,
      queries
    );
    const signString =
      `${verb}\n${contentMD5}\n${contentType}\n` +
      `${date}\n${canonicalizedHeaders}${canonicalizedResource}`;
    return `LOG ${SlsClient.config.accessKeyId}:${crypto
      .createHmac('sha1', SlsClient.config.accessKeySecret)
      .update(signString)
      .digest('base64')}`;
  }
  private static getCanonicalizedHeaders = (headers: Record<string, any>) =>
    Object.keys(headers)
      .filter(k => k.startsWith('x-log-') || k.startsWith('x-acs'))
      .sort()
      .map(k => `${k}:${headers[k].toString().trim()}`)
      .join('\n') + '\n';

  private static getCanonicalizedResource = (
    path: string,
    queries: Record<string, any>
  ) =>
    `${path}${
    SlsClient.queryString(queries) ? `?${SlsClient.queryString(queries)}` : ''
    }`;
  private static queryString = (queries: Record<string, any>) =>
    Object.entries(queries)
      .map(
        pair =>
          `${pair[0]}=${
          typeof pair[1] === 'undefined' ? '' : pair[1].toString()
          }`
      )
      .sort()
      .join('&');
  static logListToObject = <
    L extends BaseLog = BaseLog,
    T extends Record<string, string> = Record<string, string>
  >(
    logs: sls.LogGroupList
  ): LogGroup<L, T>[] => {
    return logs.logGroupList.map(log => {
      return {
        ...log,
        Logs: (log.Logs || []).map(
          tmp =>
            ({
              ...SlsClient.fromPairsToObject()(tmp.Contents || []),
              __time: tmp.Time
            } as Record<string, any> & { __time: number })
        ),
        LogTags: SlsClient.fromPairsToObject()(log.LogTags || [])
      } as LogGroup<L, T>;
    });
  };
  static createKvList = (obj: Record<string, any>) =>
    Object.entries(obj)
      .filter(([Key]) => !Key.startsWith('__'))
      .map(([Key, Value]) => ({
        Key,
        Value:
          typeof Value === 'object'
            ? JSON.stringify(Value)
            : (Value || '').toString()
      }));
  static fromPairsToObject = <T = Record<string, string>>(
    mapField: { key: keyof T; value: keyof T } = {
      key: 'Key' as keyof T,
      value: 'Value' as keyof T
    }
  ) =>
    _.compose(
      _.fromPairs,
      _.reduce(
        (pairs: [string, string][], part: T) =>
          [
            ...pairs,
            [part[mapField.key], part[mapField.value]]
          ] as [string, string][],
        []
      )
    ) as (arr: any[]) => T;
  static readKvList: (
    param: { Key: string; Value: string }[]
  ) => any = SlsClient.fromPairsToObject({ key: 'Key', value: 'Value' });
  private static convertLog = (logGroup: LogGroup): sls.ILogGroup => {
    const Time = Math.floor(Date.now().valueOf() / 1000);
    return {
      ...logGroup,
      Logs: (logGroup.Logs || []).map(log => ({
        Time: ((log['__time'] as any) as number) || Time,
        Contents: SlsClient.createKvList(log)
      })),
      LogTags: SlsClient.createKvList(logGroup.LogTags)
    };
  };
}
