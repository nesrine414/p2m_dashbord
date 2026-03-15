module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      if (Array.isArray(webpackConfig.plugins)) {
        webpackConfig.plugins = webpackConfig.plugins.filter((plugin) => {
          const name = plugin?.constructor?.name;
          return (
            name !== 'ForkTsCheckerWebpackPlugin' &&
            name !== 'ForkTsCheckerWarningWebpackPlugin'
          );
        });
      }

      return webpackConfig;
    },
  },
};

