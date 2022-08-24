/**
 * Prettier Config: This fill overrides all possible options (even those with
 * defaults which match our own in the event that prettier overwrites them in
 * future release). for more information and additional config
 *
 * visit: https://prettier.io/docs/en/options.html
 */
module.exports = {
    // Number of characters allowed before formatter wraps code.
    printWidth: 90,

    // Number of spaces in a tab.
    tabWidth: 4,

    // Add Semicolons at the end of all statements.
    semi: true,

    // NOTE: Quotes in JSX will always be double and ignore this setting.
    // The rest will use single quotes when possible.
    singleQuote: true,

    // Where to add trailing commas, es5 option supports adding anywhere
    // possible that is still ES5 valid
    trailingComma: 'all',

    // Add spacing between bracket destructuring (e.g., { varName } )
    bracketSpacing: true,

    // Whether to add the '>' on a separate line or same on on multi-line JSX
    // components.
    jsxBracketSameLine: false,

    // Whether to force the use of parens when using arrow functions:
    // params => {}       vs       (params) => {}
    arrowParens: 'always',
};