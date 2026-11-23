// Metro no monorepo: enxerga os pacotes de packages/* e o node_modules da raiz.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const raiz = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);
config.watchFolders = [raiz];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules"), path.resolve(raiz, "node_modules")];
module.exports = config;
