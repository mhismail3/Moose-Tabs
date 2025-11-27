const path = require('path');

module.exports = {
  entry: {
    main: './src/index.js',
    settings: './src/settings/index.js',
    popup: './src/popup/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: (pathData) => {
      switch (pathData.chunk.name) {
        case 'main':
          return 'bundle.js';
        case 'settings':
          return 'settings-bundle.js';
        case 'popup':
          return 'popup-bundle.js';
        default:
          return '[name].bundle.js';
      }
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  mode: 'development',
};
