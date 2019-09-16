const axios = require('axios');
const ora = require('ora');
const Inquirer = require('inquirer');
const {promisify} = require('util');
const fs = require('fs');
const path = require('path');
let downloadGitReop = require('download-git-repo');
const {downloadDirectory} = require('./constants');

const config = require('./config');
const repoUrl = config('getVal', 'repo');

// 遍历文件夹，判断是否需要渲染
// 只能链式调用，不能用 promisify 转成 promise
const MetalSmith = require('metalsmith');

// consolidate 统一了所有的模板引擎，可以用 handlebars、ejs 等模板
let {render} = require('consolidate').ejs;

render = promisify(render);
// 可以把异步的请求转换成 promise 格式的
downloadGitReop = promisify(downloadGitReop);

let ncp = require('ncp');
ncp = promisify(ncp);

// console.log('repoUrl',repoUrl);

// create 的所有逻辑
// create 功能是创建项目
// 拉取你自己的所有项目列出来 让用户选 安装哪个项目 projectName
// 选完后 在显示所有的版本号 1.0
// https://api.github.com/orgs/yjd-cli/repos 获取组织下的仓库
// 可能还需要用户配置一些数据，来结合渲染项目

// 1) 获取项目列表
const fetchRepoList = async () => {
    const {data} = await axios.get(`https://api.github.com/orgs/${repoUrl}/repos`);
    return data;
};

// 抓取 tag 列表
const fechTagList = async (repo) => {
    const {data} = await axios.get(`https://api.github.com/repos/${repoUrl}/${repo}/tags`);
    return data;
};

// 封装 loading 效果
const waitFnloading = (fn, message) => async (...args) => {
    const spinner = ora(message);
    spinner.start();
    const result = await fn(...args);
    spinner.succeed();
    return result;
};

const download = async (repo, tag) => {
    // 组织名+仓库名
    let api = `${repoUrl}/${repo}`;
    if (tag) {
        api += `#${tag}`;
    }
    // /user/xxxx/.template/repo
    const dest = `${downloadDirectory}/${repo}`;
    await downloadGitReop(api, dest);
    return dest; // 下载的最终目录
};

module.exports = async (projectName) => {
    // 1) 获取项目的模板 （所有的）
    let repos = await waitFnloading(fetchRepoList, 'fetching template ....')();

    repos = repos.map((item) => item.name);
    // 在获取之前 显示 loading 关闭 loading
    // 选择模板 inquirer ，提供给用户选择的选项
    const {repo} = await Inquirer.prompt({
        name: 'repo', // 获取选择后的结果
        type: 'list',
        message: 'please choise a template to create project',
        choices: repos,
    });

    // 2) 获取当前选择的项目有哪些版本
    // 获取对应的版本号 https://api.github.com/repos/yjd-cli/xxx/tags
    let tags = await waitFnloading(fechTagList, 'fetching tags ....')(repo);
    tags = tags.map((item) => item.name);

    const {tag} = await Inquirer.prompt({
        name: 'tag', // 获取选择后的结果
        type: 'list',
        message: 'please choise tags to create project',
        choices: tags,
    });

    // 3) 把模板放到一个临时目录里存好，以备后期使用
    // download-git-repo
    const result = await waitFnloading(download, 'download template')(repo, tag);

    // 4) 拷贝操作
    // 判断当前目录下项目的名字是否已经存在 如果存在提示当前已经存在
    // 拿到了下载的目录后
    // 简单的情况：直接拷贝当前执行的目录下即可  ncp
    // 复杂的情况：需要模板渲染 渲染后再拷贝

    if (!fs.existsSync(path.join(result, 'ask.js'))) {
        // 不存在 ask 文件，就直接拷贝
        // 把临时目录 ./template/ 下的文件 拷贝到执行命令的目录下
        await ncp(result, path.resolve(projectName));
    } else {
        // 把 git 上的项目下载下来，如果有 ask 文件就是一个复杂的模板,我们需要用户选择，选择后再编译模板

        await new Promise((resolve, reject) => {
            // 如果不传也能执行，但是 MetalSmith 内部会有非空校验
            // 如果你传入路径，默认会遍历当前路径下的 src 文件夹
            MetalSmith(__dirname)
            // 指定遍历的路径，用了 source ，上面的 __dirname 就没用了
                .source(result)
                // 输出路径
                .destination(path.resolve(projectName))
                // 1) 让用户填信息
                .use(async (files, metal, done) => {
                    const args = require(path.join(result, 'ask.js'));
                    const obj = await Inquirer.prompt(args);
                    // 获取当前用户填写的信息，这个信息是公用的
                    // 这里用户填写了某些信息，下面的 use 里面也能获取到
                    const meta = metal.metadata();
                    Object.assign(meta, obj);
                    // 删除从 git 仓库拉下来的 ask.js 文件
                    delete files['ask.js'];
                    done();
                })
                // 2) 用用户填写的信息去渲染模板
                .use((files, metal, done) => {
                    // 根据用户的输入，下载模板
                    const obj = metal.metadata();
                    Reflect.ownKeys(files).forEach(async (file) => {
                        // 只有 .js 或 .json 结尾的才有可能是模板文件
                        if (file.includes('js') || file.includes('json')) {
                            // 文件的内容
                            let content = files[file].contents.toString();
                            // 包含 <% 的就是模板
                            if (content.includes('<%')) {
                                content = await render(content, obj);
                                // 新的内容替换旧的内容
                                files[file].contents = Buffer.from(content);
                            }
                        }
                    });
                    done();
                })
                // 执行上面写的 use
                .build((err) => {
                    if (err) {
                        reject();
                    } else {
                        resolve();
                    }
                });
        });
    }
};


































