const path = require('path');

module.exports = {
  entry: {
    main: './src/index.js',
    settings: './src/settings/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: (pathData) => {
      return pathData.chunk.name === 'main' ? 'bundle.js' : 'settings-bundle.js';
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