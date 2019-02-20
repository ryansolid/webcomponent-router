const assert = require('assert');
const Router = require('../lib/webcomponent-router.js').default;

describe('Router Tests', function() {
  var router;
  router = null;
  describe('Create Router', function() {
    it('should create and configure router properly', function(done) {
      router = new Router({}, { location: 'none', debug: true });
      assert.ok(router.location.type === 'none');
      return done();
    });
    it('should add routes properly', function(done) {
      router.map(r => {
        r.index(() => ['user', { userId: 123 }]);
        r.notFound(() => ['index']);
        r.route('user', { path: '/users/:userId', tag: 'pane-user' }, r => {
          r.index(() => ['sets']);
          r.route('sets', { path: '/sets', tag: 'pane-sets' });
          r.route('set', { path: '/sets/:setId', tag: 'pane-set' });
        });
        r.route('group', { path: '/groups/:groupId', tag: 'pane-group' }, r => {
          r.index(() => ['albums']);
          r.notFound(() => ['index']);
          r.route('albums', { path: '/albums', tag: 'pane-albums' });
          r.route('album', { path: '/albums/:albumId', tag: 'pane-album' });
          r.route('sets', { path: '/sets', tag: 'pane-sets' });
          r.route('set', { path: '/sets/:setId', tag: 'pane-set' });
        });
        r.route('uploader', { path: '/uploader', tag: 'app-uploader'}, r => {
          r.index({ tag: 'pane-upload-groups' });
          r.route('group', { path: '/groups/:groupId', tag: 'pane-upload-group' }, r => {
            r.index(() => ['albums']);
            r.route('albums', { path: '/albums', tag: 'pane-upload-albums' });
          });
        });
      });
      router.start();
      assert.ok(router.hasRoute('index'));
      assert.ok(router.hasRoute('not_found'));
      assert.ok(router.hasRoute('user'));
      assert.ok(router.hasRoute('group'));
      assert.ok(router.hasRoute('user.index'));
      assert.ok(router.hasRoute('user.sets'));
      assert.ok(router.hasRoute('user.set'));
      assert.ok(router.hasRoute('group.index'));
      assert.ok(router.hasRoute('group.not_found'));
      assert.ok(router.hasRoute('group.albums'));
      assert.ok(router.hasRoute('group.album'));
      assert.ok(router.hasRoute('group.sets'));
      assert.ok(router.hasRoute('group.set'));
      assert.ok(router.hasRoute('uploader'));
      assert.ok(router.hasRoute('uploader.index'));
      assert.ok(router.hasRoute('uploader.group.index'));
      return done();
    });
    it('should parse url properly', function(done) {
      var handlers;
      handlers = router.recognizer.recognize('/groups/12?sort=date');
      assert.ok(handlers.length === 2);
      assert.deepEqual(handlers.queryParams, { sort: 'date' });
      return done();
    });
    it('should generate url properly with defaults', function(done) {
      assert.ok(router.toURL('group', { groupId: 12 }) === '/groups/12/albums');
      return done();
    });
    it('should generate url properly with query', function(done) {
      assert.ok(router.toURL('group.album', { groupId: 12, albumId: 10 }, { page: 2 }) === '/groups/12/albums/10?page=2');
      return done();
    });
  });
  describe('Handle transitions by name', function() {
    it('should navigate to specific album in group', function(done) {
      var success;
      success = router.transitionTo('group.album', { groupId: 12, albumId: 10 });
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums/10');
      return done();
    });
    it('should navigate to index pane for same group', function(done) {
      var success;
      success = router.transitionTo('group');
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums');
      return done();
    });
    it('should remain unchanged when explicitly navigating to same pane (albums)', function(done) {
      var success;
      success = router.transitionTo('group.albums', { groupId: 12 });
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums');
      return done();
    });
    it('should exit index group and group , and enter user, and specific set', function(done) {
      var success;
      success = router.transitionTo('user.set', { userId: 1234, setId: 2 });
      assert.ok(success);
      assert.equal(router.location.path, '/users/1234/sets/2');
      return done();
    });
    it('should update set', function(done) {
      var success;
      success = router.transitionTo('user.set', { userId: 1234, setId: 5 });
      assert.ok(success);
      assert.equal(router.location.path, '/users/1234/sets/5');
      return done();
    });
    it('should navigate to different top level page', function(done) {
      var success;
      success = router.transitionTo('uploader');
      assert.ok(success);
      assert.equal(router.location.path, '/uploader');
      return done();
    });
    it('should navigate to different sub page', function(done) {
      var success;
      success = router.transitionTo('uploader.group', { groupId: 4 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums');
      return done();
    });
    it('should detect query change', function(done) {
      var success;
      success = router.transitionTo('uploader.group.albums', { groupId: 4 }, { test: 1 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=1');
      return done();
    });
    it('should only update query', function(done) {
      var success;
      success = router.transitionTo({ test: 2 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=2');
      return done();
    });
    return it('should detect query change on remove', function(done) {
      var success;
      success = router.transitionTo('uploader.group.albums');
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums');
      return done();
    });
  });
  describe('Going Back', function() {
    it('should go back', function(done) {
      var success;
      success = router.goBack();
      assert.ok(success);
      assert.ok(router.location.path === '/uploader/groups/4/albums?test=2');
      return done();
    });
    return it('should go back again', function(done) {
      var success;
      success = router.goBack();
      assert.ok(success);
      assert.ok(router.location.path === '/uploader/groups/4/albums?test=1');
      return done();
    });
  });
  return describe('Handle url change', function() {
    it('should navigate on detected url change to root', function(done) {
      router.location.trigger('/');
      assert.ok(router.location.path === '/users/123/sets');
      return done();
    });
    it('should navigate on detected url change', function(done) {
      router.location.trigger('/groups/12e1/sets/1');
      assert.ok(router.location.path === '/groups/12e1/sets/1');
      return done();
    });
    it('should fallback to group notFound handler', function(done) {
      router.location.trigger('/groups/12e1/set/1');
      assert.ok(router.location.path === '/groups/12e1/albums');
      return done();
    });
    return it('should fallback to application notFound handler', function(done) {
      router.location.trigger('/group/12e1/sets/1');
      assert.ok(router.location.path === '/users/123/sets');
      return done();
    });
  });
});
