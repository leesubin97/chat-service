const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    port: 3000,
    proxy: {
      '/chat': {
        target: "http://10.201.1.70:8000",
        changeOrigin: true,
        secure: false,
      }
    },
  }
})
