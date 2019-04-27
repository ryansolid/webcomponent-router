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
  external: ['route-recognizer'],
  plugins: [nodeResolve({ extensions: ['.js'] })]
}, {
  input: 'src/components/RouteLink.js',
  output: {
    file: 'dist/components.js',
    format: 'es'
  },
  external: ['webcomponent-router']
}];