declare type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface Selector {
    projectName?: string;
    logStore?: string;
}
import protobuf from 'protobufjs';
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
    private static config;
    private static createVarByTemplate;
    private static baseString;
    constructor(config: LogConfig);
    /**
     * @description 从url解析出path部分，主要用于签名
     * @private
     * @static
     * @memberof SlsClient
     */
    private static getPathByUrl;
    /**
     * @description 默认header
     * @private
     * @static
     * @memberof SlsClient
     */
    private static baseHeader;
    /**
     *  请求api
     * @param url 请求地址
     * @param method 方法
     * @param queries 查询对象
     * @param body 查询主体
     * @param setHeaders 补充header
     */
    action<T extends Record<string, any>>(url: string, method: Method, queries: T, body?: Buffer | Uint8Array | null, setHeaders?: {
        [k: string]: any;
    }): import("rxjs/internal/Observable").Observable<import("rxjs/internal/observable/dom/AjaxObservable").AjaxResponse>;
    /**
     * @description 无主体请求
     * @param urlParams 用于构造url的参数
     * @param queries
     * @param selector 自定义project或logstore
     * @private
     * @memberof SlsClient
     */
    private noBodyAction;
    /**
     * @description 拉取日志
     * @memberof SlsClient
     */
    pullLogs: (option: {
        shards?: number | undefined;
        cursor: string;
        count?: number | undefined;
    }, selector?: {
        projectName?: string | undefined;
        logStore?: string | undefined;
    } | undefined) => import("rxjs/internal/Observable").Observable<protobuf.Message<{}>>;
    /**
     * @description 指定游标获取日志
     * @memberof SlsClient
     */
    getLogs: (option: {
        startCursor: string;
        endCursor: string;
        shards: number;
    }, selector?: Selector | undefined) => import("rxjs/internal/Observable").Observable<protobuf.Message<{}>>;
    static bufferToLogList: (buffer: Buffer) => protobuf.Message<{}>;
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
    private static sign;
    private static getCanonicalizedHeaders;
    private static getCanonicalizedResource;
    private static queryString;
}
export {};
