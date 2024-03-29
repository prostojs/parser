module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: [
    "ts",
    "js"
  ],
  globals: {
    __DEV__: true,
    __TEST__: true,
    __VERSION__: require('./package.json').version,
    __BROWSER__: false,
    __GLOBAL__: false,
    __ESM_BUNDLER__: true,
    __ESM_BROWSER__: false,
    __NODE_JS__: true,
   
    // dye colors
    __DYE_RESET__: '\x1B[0m',
    __DYE_COLOR_OFF__: '\x1B[39m',
    __DYE_BG_OFF__: '\x1B[49m',
    __DYE_DIM__: '\x1B[2m',
    __DYE_DIM_OFF__: '\x1B[22m',
    __DYE_BOLD__: '\x1B[1m',
    __DYE_BOLD_OFF__: '\x1B[22m',
    __DYE_UNDERSCORE__: '\x1B[4m',
    __DYE_UNDERSCORE_OFF__: '\x1B[24m',
    __DYE_INVERSE__: '\x1B[7m',
    __DYE_INVERSE_OFF__: '\x1B[27m',
    __DYE_ITALIC__: '\x1B[3m',
    __DYE_ITALIC_OFF__: '\x1B[23m',
    __DYE_CROSSED__: '\x1B[9m',
    __DYE_CROSSED_OFF__: '\x1B[29m',
    __DYE_RED__: '\x1B[31m',
    __DYE_BG_RED__: '\x1B[41m',
    __DYE_RED_BRIGHT__: '\x1B[91m',
    __DYE_BG_RED_BRIGHT__: '\x1B[101m',
    __DYE_GREEN__: '\x1B[32m',
    __DYE_BG_GREEN__: '\x1B[42m',
    __DYE_GREEN_BRIGHT__: '\x1B[92m',
    __DYE_BG_GREEN_BRIGHT__: '\x1B[102m',
    __DYE_CYAN__: '\x1B[36m',
    __DYE_BG_CYAN__: '\x1B[46m',
    __DYE_CYAN_BRIGHT__: '\x1B[96m',
    __DYE_BG_CYAN_BRIGHT__: '\x1B[106m',
    __DYE_BLUE__: '\x1B[34m',
    __DYE_BG_BLUE__: '\x1B[44m',
    __DYE_BLUE_BRIGHT__: '\x1B[94m',
    __DYE_BG_BLUE_BRIGHT__: '\x1B[104m',
    __DYE_YELLOW__: '\x1B[33m',
    __DYE_BG_YELLOW__: '\x1B[43m',
    __DYE_YELLOW_BRIGHT__: '\x1B[93m',
    __DYE_BG_YELLOW_BRIGHT__: '\x1B[103m',
    __DYE_WHITE__: '\x1B[37m',
    __DYE_BG_WHITE__: '\x1B[47m',
    __DYE_WHITE_BRIGHT__: '\x1B[97m',
    __DYE_BG_WHITE_BRIGHT__: '\x1B[107m',
    __DYE_MAGENTA__: '\x1B[35m',
    __DYE_BG_MAGENTA__: '\x1B[45m',
    __DYE_MAGENTA_BRIGHT__: '\x1B[95m',
    __DYE_BG_MAGENTA_BRIGHT__: '\x1B[105m',
    __DYE_BLACK__: '\x1B[30m',
    __DYE_BG_BLACK__: '\x1B[40m',
    __DYE_BLACK_BRIGHT__: '\x1B[90m',
    __DYE_BG_BLACK_BRIGHT__: '\x1B[100m',      
  },
  rootDir: __dirname,
  testRegex: ".spec.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: [
      'src/**/*.ts',
  ],
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/.git/'],
  testEnvironment: "node",
}