const assert = require('assert');
const Router = require('../lib/webcomponent-router.js').default;

describe('Router Tests', () => {
  let router = null;
  const div = document.createElement('div');
  describe('Create Router', () => {
    it('should create and configure router properly', () => {
      router = new Router(div, { location: 'none', debug: true });
      assert.ok(router.location.type === 'none');
    });
    it('should add routes properly', () => {
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
    });
    it('should parse url properly', () => {
      var handlers;
      handlers = router.recognizer.recognize('/groups/12?sort=date');
      assert.ok(handlers.length === 2);
      assert.deepEqual(handlers.queryParams, { sort: 'date' });
    });
    it('should generate url properly with defaults', () => {
      assert.ok(router.toURL('group', { groupId: 12 }) === '/groups/12/albums');
    });
    it('should generate url properly with query', () => {
      assert.ok(router.toURL('group.album', { groupId: 12, albumId: 10 }, { page: 2 }) === '/groups/12/albums/10?page=2');
    });
    it('should have the correct child routes', () => {
      const ROUTES = ['index', 'not_found', 'user', 'group', 'uploader'];
      router.childRoutes().forEach((c, i) => assert.equal(c.name, ROUTES[i]));
    });
  });
  describe('Handle transitions by name', () => {
    it('should navigate to specific album in group', () => {
      var success;
      success = router.transitionTo('group.album', { groupId: 12, albumId: 10 });
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums/10');
    });
    it('should navigate to index pane for same group', () => {
      var success;
      success = router.transitionTo('group');
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums');
    });
    it('should remain unchanged when explicitly navigating to same pane (albums)', () => {
      var success;
      success = router.transitionTo('group.albums', { groupId: 12 });
      assert.ok(success);
      assert.equal(router.location.path, '/groups/12/albums');
    });
    it('should exit index group and group , and enter user, and specific set', () => {
      var success;
      success = router.transitionTo('user.set', { userId: 1234, setId: 2 });
      assert.ok(success);
      assert.equal(router.location.path, '/users/1234/sets/2');
    });
    it('should update set', () => {
      var success;
      success = router.transitionTo('user.set', { userId: 1234, setId: 5 });
      assert.ok(success);
      assert.equal(router.location.path, '/users/1234/sets/5');
    });
    it('should navigate to different top level page', () => {
      var success;
      success = router.transitionTo('uploader');
      assert.ok(success);
      assert.equal(router.location.path, '/uploader');
    });
    it('should navigate to different sub page', () => {
      var success;
      success = router.transitionTo('uploader.group', { groupId: 4 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums');
    });
    it('should detect query change', () => {
      var success;
      success = router.transitionTo('uploader.group.albums', { groupId: 4 }, { test: 1 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=1');
    });
    it('should only update query', () => {
      var success;
      success = router.transitionTo({ test: 2 });
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=2');
    });
    it('should verify active query', () => {
      assert.ok(router.isActive({ test: 2 }));
    });
    it('resolve url for query', () => {
      assert.equal(router.toURL({ test: 2 }), '/uploader/groups/4/albums?test=2');
    });
    it('should detect query change on remove', () => {
      var success;
      success = router.transitionTo('uploader.group.albums');
      assert.ok(success);
      assert.equal(router.location.path, '/uploader/groups/4/albums');
    });
    it('should verify when active route', () => {
      assert.ok(router.isActive('uploader.group.albums', {groupId: 4}));
    });
  });
  describe('Going Back', () => {
    it('should go back', () => {
      var success;
      success = router.goBack();
      assert.ok(success);
      assert.ok(router.location.path === '/uploader/groups/4/albums?test=2');
    });
    it('should go back again', () => {
      var success;
      success = router.goBack();
      assert.ok(success);
      assert.ok(router.location.path === '/uploader/groups/4/albums?test=1');
    });
  });
  describe('Handle url change', () => {
    it('should navigate on detected url change to root', () => {
      router.location.trigger('/');
      assert.ok(router.location.path === '/users/123/sets');
    });
    it('should navigate on detected url change', () => {
      router.location.trigger('/groups/12e1/sets/1');
      assert.ok(router.location.path === '/groups/12e1/sets/1');
    });
    it('should fallback to group notFound handler', () => {
      router.location.trigger('/groups/12e1/set/1');
      assert.ok(router.location.path === '/groups/12e1/albums');
    });
    it('should fallback to application notFound handler', () => {
      router.location.trigger('/group/12e1/sets/1');
      assert.ok(router.location.path === '/users/123/sets');
    });
  });
  describe('Nested routing', () => {
    let nestedRouter;
    it('should return the router for the root element', () => {
      const r = Router.for(div);
      assert.equal(r, router);
    });
    it('should return the nested router for the element', () => {
      // simulate nested routing
      const outlet = document.createElement('div'),
        child = document.createElement('div');

      outlet.appendChild(child);
      child.__router = {
        id: router.id,
        level: 0
      }
      nestedRouter = Router.for(child);
      assert.ok(nestedRouter);
    });
    it('should get child routes', () => {
      router.transitionTo('/groups/23/albums');
      const ROUTES = ['index', 'not_found', 'albums', 'album', 'sets', 'set'];
      nestedRouter.childRoutes().forEach((c, i) => assert.equal(c.name, ROUTES[i]));
    });
    it('should forward router methods', () => {
      assert.ok(nestedRouter.isActive('.albums'));
      assert.ok(nestedRouter.isActive('*albums'));
      assert.ok(nestedRouter.isActive('^group'));
    });
  });
  describe('Router events', () => {
    let eventCount,
      eventHandler = () => { eventCount++; };
    it('should register an event handler', done => {
      eventCount = 0;
      router.on('state', eventHandler);
      assert.equal(eventCount, 0);
      router.transitionTo('index');
      setTimeout(() => {
        assert.equal(eventCount, 1);
        done();
      }, 0);
    });
    it('should unregister an event handler', done => {
      eventCount = 0;
      router.off('state', eventHandler)
      assert.equal(eventCount, 0);
      router.transitionTo('group');
      setTimeout(() => {
        assert.equal(eventCount, 0);
        done();
      }, 0);
    });
    it('should register a once event handler', done => {
      eventCount = 0;
      router.once('state', eventHandler)
      assert.equal(eventCount, 0);
      router.transitionTo('index');
      router.transitionTo('group');
      setTimeout(() => {
        assert.equal(eventCount, 1);
        done();
      }, 0);
    });
  });
  describe('Different location APIs', () => {
    it('should create and configure hash router properly', done => {
      const hashRouter = new Router(div, { location: 'hash' });
      assert.ok(hashRouter.location.type === 'hash');
      hashRouter.map(r => {
        r.index(() => ['user', { userId: 123 }]);
        r.notFound(() => ['index']);
        r.route('user', { path: '/users/:userId', tag: 'pane-user' }, r => {
          r.index(() => ['sets']);
          r.route('sets', { path: '/sets', tag: 'pane-sets' });
          r.route('set', { path: '/sets/:setId', tag: 'pane-set' });
        });
      });
      hashRouter.start();
      window.location.hash = 'users/123/sets/23';
      setTimeout(() => {
        assert.equal(hashRouter.location.path, '/users/123/sets/23');
        done();
      }, 0);
    });
    it('should create and configure history router properly', () => {
      const historyRouter = new Router(div, { location: 'history' });
      assert.ok(historyRouter.location.type === 'history');
      historyRouter.map(r => {
        r.index(() => ['user', { userId: 123 }]);
        r.notFound(() => ['index']);
        r.route('user', { path: '/users/:userId', tag: 'pane-user' }, r => {
          r.index(() => ['sets']);
          r.route('sets', { path: '/sets', tag: 'pane-sets' });
          r.route('set', { path: '/sets/:setId', tag: 'pane-set' });
        });
      });
      historyRouter.start();
      historyRouter.transitionTo('user.set', {userId: 123, setId: 23});
      assert.equal(historyRouter.location.path, '/users/123/sets/23');
      // Go back doesn't work so faking it
      historyRouter.goBack();
      window.history.pushState({}, '', 'http://localhost/users/123/sets');
      window.dispatchEvent(new CustomEvent('popstate', { depth: 1 }));
      assert.equal(historyRouter.location.path, '/users/123/sets');
    });
  })
});
