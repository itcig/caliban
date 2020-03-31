'use strict'; // eslint-disable-line

const webpack = require('webpack');
const CleanPlugin = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const path = require('path');

process.env.NODE_ENV = 'production';

const rootPath = process.cwd();

const config = {
    entry: {
        caliban: './src/Server/js/caliban.js',
    },
    paths: {
        root: rootPath,
        dist: path.join(rootPath, 'dist'),
    },
};

const webpackConfig = {
    // context: config.paths.assets,
    entry: config.entry,
    output: {
        path: config.paths.dist,
        filename: `js/[name].js`,
    },
    // devtool: (config.enabled.sourceMaps ? '#source-map' : undefined),
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js$/,
                include: config.paths.root,
                use: 'eslint-loader',
            },
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                },
            },
        ],
    },
    resolve: {
        modules: [config.paths.root, 'node_modules'],
        enforceExtension: false,
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: 3,
                    compress: true,
                    output: {
                        beautify: false,
                    },
                },
                extractComments: true,
            }),
        ],
    },
    plugins: [
        new CleanPlugin([config.paths.dist], {
            root: config.paths.root,
            verbose: true,
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: `'${process.env.NODE_ENV}'`,
            },
        }),
        new webpack.LoaderOptionsPlugin({
            test: /\.js$/,
            options: {
                eslint: { failOnWarning: false, failOnError: true },
            },
        }),
        new FriendlyErrorsWebpackPlugin(),
    ],
    stats: {
        hash: false,
        version: false,
        timings: false,
        children: false,
        errors: false,
        errorDetails: false,
        warnings: false,
        chunks: false,
        modules: false,
        reasons: false,
        source: false,
    },
};

module.exports = webpackConfig;
