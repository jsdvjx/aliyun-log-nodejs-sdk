import SlsClient from './client';
const client = new SlsClient({
  accessKeyId: 'LTAI4z2VyZ0U9CzI',
  accessKeySecret: 'lUYY2f3qyqcKt8co8NbaTruK7DSq6y',
  endpoint: 'cn-hangzhou.log.aliyuncs.com',
  projectName: 'sls-serverless',
  logStore: 'log'
});
client.postLogStoreLogs({
  Logs: [{ test: '123' },{abc:'321'}],
  LogTags: { ab: 'test', dj: 'tt' },
  Topic: 'test',
}).subscribe(console.log);
// client
//   .getLogs({
//     startCursor: 'MTU1Njk2ODE0MDk3MzQyMTkwMQ==',
//     endCursor: 'MTU1Njk2ODE0MDk3MzQyMTkwMg==',
//     shards: 0
//   })
//   .subscribe(res => {
//     console.log(
//       SlsClient.readKvList(
//         (res.logGroupList[0].Logs || [{ Contents: [] }])[0].Contents || []
//       )
//     );
//   });
