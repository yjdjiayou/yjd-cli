const fs = require('fs');
const {encode, decode} = require('ini');
const {defaultConfig, configFile} = require('./constants');


module.exports = (action, k, v) => {
    //  在创建项目之前，需要配置拉取模板的 git 仓库地址
    //  yjd-cli config set repo yjd-cli

    const flag = fs.existsSync(configFile);
    const obj = {};
    if (flag) {
        // 如果 .(自定义的名字)rc 配置文件存在
        const content = fs.readFileSync(configFile, 'utf8');
        // 将文件解析成对象
        const c = decode(content);
        Object.assign(obj, c);
    }
    if (action === 'get') {
        console.log(obj[k] || defaultConfig[k]);
    } else if (action === 'set') {
        obj[k] = v;
        // 将内容转化ini格式写入到字符串中
        fs.writeFileSync(configFile, encode(obj));
        console.log(`${k}=${v}`);
    } else if (action === 'getVal') {
        if (!obj[k]) {
            return defaultConfig[k];
        }
        return obj[k];
    }
};
