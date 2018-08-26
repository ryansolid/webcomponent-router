import nodeResolve from 'rollup-plugin-node-resolve';

export default [{
  input: 'src/index.js',
  output: [{
    file: 'lib/webcomponent-router.js',
    format: 'cjs',
    exports: 'named'
  }, {
    file: 'dist/webcomponent-router.js',
    format: 'es'
  }],
  plugins: [nodeResolve({ extensions: ['.js'] })]
}, {
  input: 'src/components/index.js',
  output: {
    file: 'dist/components.js',
    format: 'es'
  },
  external: ['webcomponent-router']
}];