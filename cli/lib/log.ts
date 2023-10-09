import chalk from 'chalk';
import figlet from 'figlet';

export const displayWelcomeMessage = () => {
    console.log(
        chalk.cyan(
            figlet.textSync('deadrop', {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default',
            }),
        ),
    );
};

export const logInfo = (msg: string) => {
    console.log(chalk.cyan(msg) + '\n');
};

export const logWarning = (msg: string) => {
    console.log(chalk.bgYellow(msg));
};

export const logError = (msg: string) => {
    console.log(chalk.bgRedBright(msg));
};

export const logDebug = (msg: string) => {
    if (process.env.DEBUG_MODE) console.log(msg);
};
