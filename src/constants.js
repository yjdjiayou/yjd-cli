const {name, version} = require('../package.json');

// 系统路径
const systemPath = process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE'];

// 存储模板的位置
// 如果下一次下载的还是相同版本的模板，就用之前缓存的模板，不需要再下载了
const downloadDirectory = `${systemPath}/.template`;

// 配置文件的位置
const configFile = `${systemPath}/.yjdrc`;

const defaultConfig = {
    // 默认拉取的仓库名
    repo: 'yjd-cli',
};

module.exports = {
    name,
    version,
    configFile,
    defaultConfig,
    downloadDirectory
};