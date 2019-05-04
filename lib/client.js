'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const ajax_1 = require("rxjs/ajax");
const operators_1 = require("rxjs/operators");
// protobuf
const protobufjs_1 = __importDefault(require("protobufjs"));
const builder = protobufjs_1.default.loadSync(path_1.default.join(__dirname, './sls.proto'));
const LogProto = builder.lookupType('sls.LogGroupList');
global.XMLHttpRequest = require('xhr2');
//@ts-ignore
XMLHttpRequest.prototype._restrictedHeaders.date = false;
class Client {
    constructor(config) {
        this.pullLogs = (option) => {
            const { projectName, logStore, shards = 0, cursor, count = 10 } = option;
            return this.action({
                projectName,
                path: `/logstores/${logStore}/shards/${shards}`,
                method: 'GET'
            }, { cursor, count, type: 'logs' }, null).pipe(operators_1.map(response => {
                console.log(response.xhr.getAllResponseHeaders());
                return response;
            }), operators_1.pluck('response'), operators_1.map((buffer) => LogProto.decode(new Uint8Array(buffer, 0, buffer.byteLength))));
        };
        this.region = (config.region || '').toString();
        this.net = (config.net || '').toString();
        this.accessKeyId = config.accessKeyId;
        this.accessKeySecret = config.accessKeySecret;
        this.endpoint =
            config.endpoint ||
                `${this.region}${this.net ? `-${this.net}` : ''}.log.aliyuncs.com`;
    }
    action(option, queries, body, setHeaders) {
        const url = `http://${option.projectName ? `${option.projectName}.` : ''}${this.endpoint}${option.path}?${Object.entries(queries)
            .map(pair => `${pair[0]}=${pair[1]}`)
            .join('&')}`;
        const headers = {
            ...Client.baseHeader,
            date: new Date().toUTCString(),
            ...(setHeaders || {}),
            ...(body
                ? {
                    'content-md5': crypto_1.default
                        .createHash('md5')
                        .update(body)
                        .digest('hex')
                        .toUpperCase(),
                    'content-length': body.length
                }
                : {})
        };
        headers['authorization'] = this.sign(option.method, option.path, queries, headers);
        // return from(
        //   httpx.request(url, { method: option.method, data: body, headers })
        // ).pipe(switchMap(response => httpx.read(response)));
        return ajax_1.ajax({
            url,
            method: option.method,
            body,
            headers,
            responseType: 'arraybuffer'
        });
    }
    sign(verb, path, queries, headers) {
        const contentMD5 = headers['content-md5'] || '';
        const contentType = headers['content-type'] || '';
        const date = headers['date'];
        const canonicalizedHeaders = Client.getCanonicalizedHeaders(headers);
        const canonicalizedResource = Client.getCanonicalizedResource(path, queries);
        const signString = `${verb}\n${contentMD5}\n${contentType}\n` +
            `${date}\n${canonicalizedHeaders}${canonicalizedResource}`;
        return `LOG ${this.accessKeyId}:${crypto_1.default
            .createHmac('sha1', this.accessKeySecret)
            .update(signString)
            .digest('base64')}`;
    }
}
Client.baseHeader = {
    accept: 'application/x-protobuf',
    'content-type': 'application/x-protobuf',
    date: new Date().toUTCString(),
    'x-log-apiversion': '0.6.0',
    'x-log-signaturemethod': 'hmac-sha1'
};
Client.getCanonicalizedHeaders = (headers) => Object.keys(headers)
    .filter(k => k.startsWith('x-log-') || k.startsWith('x-acs'))
    .sort()
    .map(k => `${k}:${headers[k].toString().trim()}`)
    .join('\n') + '\n';
Client.getCanonicalizedResource = (path, queries) => `${path}?${Object.entries(queries)
    .map(pair => `${pair[0]}=${typeof pair[1] === 'undefined' ? '' : pair[1].toString()}`)
    .sort()
    .join('&')}`;
exports.Client = Client;
