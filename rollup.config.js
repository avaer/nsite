import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';

export default {
        input: 'index.js',
        plugins: [
          json(),
          resolve({
            extensions: [ '.mjs', '.js', '.jsx', '.json' ],

            preferBuiltins: false,
          }),
          commonjs(),
          /* babel({
            // exclude: 'node_modules/**'
          }) */
        ],
        // sourceMap: true,
        output: [
                {
                        format: 'cjs',
                        name: 'nsite',
                        file: 'build/nsite.js'
                }
        ]
};
