const program = require('commander');
const path = require('path');
const { version } = require('./constants');


const actionsMap = {
    create: { // 创建模板
        description: 'create project',
        alias: 'cr',
        examples: [
            'yjd-cli create <template-name>',
        ],
    },
    config: { // 配置配置文件
        description: 'config info',
        alias: 'c',
        examples: [
            'yjd-cli config get <k>',
            'yjd-cli config set <k> <v>',
        ],
    },
    // * 表示没有匹配到以上任何命令时
    '*': {
        description: 'command not found',
    },
};
// 循环创建命令
Object.keys(actionsMap).forEach((action) => {
    program
        .command(action) // 配置命令的名字
        .alias(actionsMap[action].alias) // 命令的别名
        .description(actionsMap[action].description) // 命令的描述
        .action(() => { // 动作
            if (action === '*') {
                // 如果动作没匹配到说明输入有误
                console.log(actionsMap[action].description);
            } else {
                // 引用对应的动作文件 将参数传入
                require(path.resolve(__dirname, action))(...process.argv.slice(3));
            }
        });
});

// 监听用户输入的 --help
program.on('--help', () => {
    Object.keys(actionsMap).forEach((action) => {
        (actionsMap[action].examples || []).forEach((example) => {
            console.log(`  ${example}`);
        });
    });
});


// 解析用户传递过来的参数
program.version(version).parse(process.argv);




































