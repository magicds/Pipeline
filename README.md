# Pipeline

跨域通信的解决方案，基于 `postMessage` 实现，即时是在跨域的情况下，也可方便的跨页面调用方法、获取值、设置值。

## 使用指南

1. 两个页面内均引入 `pipeline.js`。
2. 假设A页面调用B页面方法。则在A页面内:
   ```js
   var pageB_Server = new Pipeline('页面B的window对象');

   // 即可通过 pageB_Server.exec pageB_Server.get pageB_Server.set 跨域调用方法、获取值、修改值等
   ```

详情参考 [./example/index.html](./example/index.html);

需要 Promise 支持，若是IE浏览器需要引入Promise支持。
## Api

注意，基于 `postMessage ` 发送消息再监听拿到结果，因此所有 api 均是异步的，均会返回 Promise .
### exec

调用方法

```js
/**
* 执行一个方法并获取返回结果
* @param {string} fun 要执行的方法名
* @param {Object | Object[]} arg 要传递给待执行方法的参数，多个参数用数组表示。 每个参数必须是可序列化的
* @param {(error, any) => any} callback (可选)执行成功或失败的回调
* @returns {Promise<any>} 含方法调用执行结果的 Promise
*/
exec(fun, arg, callback)
```

示例1: 调用 B 页面的 `obj.print` 方法。

```js
pageB_Server.exec('obj.print', '来自A页面的调用', function (err, result) {
   // err 为调用过程是否出错，如果调用正常则为 null 否则为错误信息
   // result 为实际调用方法的返回值
});

// 更推荐写为 promise 形式
pageB_Server.exec('obj.print', '来自A页面的调用').then(function (result) {
   // 调用结果为 result
}).catch(function (err) {
   // 调用出错
});

// 如果方法需要多个参数，直接以数组形式传递即可
pageB_Server.exec('epoint.alert', ['系统提醒', '请检查内容是否完整']);

// 如果被调用的方法是异步的，且返回值的是 thenable 对象，还可以拿到异步返回结果
pageB_Server.exec('pageInterface.getRemoteData', [{
   date: '2021-06-18'
}]).then(function (data) {
   // 这个 data 就是B页面发请获取到的数据
});
```

### get

获取属性值

```js
/**
 * 获取属性值
 * @param {string} property 属性路径
 * @param {undefined | (error, result)=>{}} callback 回调函数
 * @returns
 */
get(property, callback) 
```

### set

设置属性值

```js
/**
 * 设置属性值
 * @param {string} property 要设置的属性路径， eg: "someObject.someProperty
 * @param {any} value 要设置的属性的值
 * @param {undefined | (err, any)=> {}} callback 设置成功的回调函数
 * @returns
 */
set(property, value, callback)
```

## 设计理念

`postMessage` 实际是上提供的消息通信的方案，跨域调用的情况下，A 调用 B ，实际上是需要 A 发送消息给 B ， B 在收到消息验证无误后自己调用后，再将消息回传给 A ，从而完成跨域调用。

整个过程其实非常像客户端发请求，服务端鉴权做出响应。A 作为客户端发起请请求， B 作为服务端提供服务。
