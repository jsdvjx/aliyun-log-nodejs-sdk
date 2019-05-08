"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("./client"));
const client = new client_1.default({
    accessKeyId: 'LTAI4z2VyZ0U9CzI',
    accessKeySecret: 'lUYY2f3qyqcKt8co8NbaTruK7DSq6y',
    endpoint: 'cn-hangzhou.log.aliyuncs.com',
    projectName: 'sls-serverless',
    logStore: 'log'
});
client
    .getLogs({
    startCursor: 'MTU1Njk2ODE0MDk3MzQyMTkwMQ==',
    endCursor: 'MTU1Njk2ODE0MDk3MzQyMTkwMg==',
    shards: 0
})
    .subscribe(console.log);
