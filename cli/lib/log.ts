import chalk from 'chalk';
import figlet from 'figlet';

export const displayWelcomeMessage = () => {
    console.log(
        chalk.green(
            figlet.textSync('deaddrop', {
                font: 'Standard',
                horizontalLayout: 'default',
                verticalLayout: 'default',
            }),
        ),
    );
};

export const logInfo = (msg: string) => {};

export const logWarning = (msg: string) => {};

export const logError = (msg: string) => {
    console.log(chalk.bgRedBright(msg));
};

export const logDebug = (msg: string) => {
    if (process.env.DEBUG_MODE) console.log(msg);
};
