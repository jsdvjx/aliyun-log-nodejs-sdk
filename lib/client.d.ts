declare type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
import protobuf from 'protobufjs';
export interface LogConfig {
    net?: 'intranet';
    endpoint?: string;
    region?: 'cn-hangzhou';
    accessKeyId: string;
    accessKeySecret: string;
}
export declare class Client {
    private region;
    private net;
    private accessKeyId;
    private accessKeySecret;
    private endpoint;
    constructor(config: LogConfig);
    private static baseHeader;
    action<T extends Record<string, any>>(option: {
        method: Method;
        path: string;
        projectName?: string;
    }, queries: T, body: Buffer | Uint8Array | null, setHeaders?: {
        [k: string]: any;
    }): import("rxjs/internal/Observable").Observable<import("rxjs/internal/observable/dom/AjaxObservable").AjaxResponse>;
    pullLogs: (option: {
        projectName: string;
        logStore: string;
        shards?: number | undefined;
        cursor: string;
        count?: number | undefined;
    }) => import("rxjs/internal/Observable").Observable<protobuf.Message<{}>>;
    private sign;
    private static getCanonicalizedHeaders;
    private static getCanonicalizedResource;
}
export {};
