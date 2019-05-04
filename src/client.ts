'use strict';

import path from 'path';
import crypto from 'crypto';
import { ajax } from 'rxjs/ajax';
import { map, pluck } from 'rxjs/operators';
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
// protobuf
import protobuf from 'protobufjs';
const builder = protobuf.loadSync(path.join(__dirname, './sls.proto'));
const LogProto = builder.lookupType('sls.LogGroupList');

global.XMLHttpRequest = require('xhr2');
//@ts-ignore
XMLHttpRequest.prototype._restrictedHeaders.date = false;

export interface LogConfig {
  net?: 'intranet';
  endpoint?: string;
  region?: 'cn-hangzhou';
  accessKeyId: string;
  accessKeySecret: string;
}
export class Client {
  private region: string;
  private net: string;
  private accessKeyId: string;
  private accessKeySecret: string;
  private endpoint: string;
  constructor(config: LogConfig) {
    this.region = (config.region || '').toString();
    this.net = (config.net || '').toString();
    this.accessKeyId = config.accessKeyId;
    this.accessKeySecret = config.accessKeySecret;
    this.endpoint =
      config.endpoint ||
      `${this.region}${this.net ? `-${this.net}` : ''}.log.aliyuncs.com`;
  }
  private static baseHeader = {
    accept: 'application/x-protobuf',
    'content-type': 'application/x-protobuf',
    date: new Date().toUTCString(),
    'x-log-apiversion': '0.6.0',
    'x-log-signaturemethod': 'hmac-sha1'
  };
  action<T extends Record<string, any>>(
    option: {
      method: Method;
      path: string;
      projectName?: string;
    },
    queries: T,
    body: Buffer | Uint8Array | null,
    setHeaders?: { [k: string]: any }
  ) {
    const url = `http://${option.projectName ? `${option.projectName}.` : ''}${
      this.endpoint
    }${option.path}?${Object.entries(queries)
      .map(pair => `${pair[0]}=${pair[1]}`)
      .join('&')}`;
    const headers: Record<string, any> = {
      ...Client.baseHeader,
      date: new Date().toUTCString(),
      ...(setHeaders || {}),
      ...(body
        ? {
            'content-md5': crypto
              .createHash('md5')
              .update(body)
              .digest('hex')
              .toUpperCase(),
            'content-length': body.length
          }
        : {})
    };

    headers['authorization'] = this.sign(
      option.method,
      option.path,
      queries,
      headers
    );
    // return from(
    //   httpx.request(url, { method: option.method, data: body, headers })
    // ).pipe(switchMap(response => httpx.read(response)));
    return ajax({
      url,
      method: option.method,
      body,
      headers,
      responseType: 'arraybuffer'
    });
  }
  pullLogs = (option: {
    projectName: string;
    logStore: string;
    shards?: number;
    cursor: string;
    count?: number;
  }) => {
    const { projectName, logStore, shards = 0, cursor, count = 10 } = option;
    return this.action(
      {
        projectName,
        path: `/logstores/${logStore}/shards/${shards}`,
        method: 'GET'
      },
      { cursor, count, type: 'logs' },
      null
    ).pipe(
      map(response => {
        console.log(response.xhr.getAllResponseHeaders());
        return response;
      }),
      pluck('response'),
      map((buffer: ArrayBuffer) =>
        LogProto.decode(new Uint8Array(buffer, 0, buffer.byteLength))
      )
    );
  };
  private sign(
    verb: Method,
    path: string,
    queries: Record<string, any>,
    headers: Record<string, any>
  ) {
    const contentMD5 = headers['content-md5'] || '';
    const contentType = headers['content-type'] || '';
    const date = headers['date'];
    const canonicalizedHeaders = Client.getCanonicalizedHeaders(headers);
    const canonicalizedResource = Client.getCanonicalizedResource(
      path,
      queries
    );
    const signString =
      `${verb}\n${contentMD5}\n${contentType}\n` +
      `${date}\n${canonicalizedHeaders}${canonicalizedResource}`;
    return `LOG ${this.accessKeyId}:${crypto
      .createHmac('sha1', this.accessKeySecret)
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
    `${path}?${Object.entries(queries)
      .map(
        pair =>
          `${pair[0]}=${
            typeof pair[1] === 'undefined' ? '' : pair[1].toString()
          }`
      )
      .sort()
      .join('&')}`;
}
