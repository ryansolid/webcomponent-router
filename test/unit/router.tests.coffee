assert = require 'assert'
Router = require '../../lib'

describe 'Router Tests', ->
  router = null

  describe 'Create Router', ->
    it 'should create and configure router properly', (done) ->
      router = new Router({}, {location: 'none', debug: true})
      assert.ok(router.location.type is 'none')
      done()

    it 'should add routes properly', (done) ->
      router.map ->
        @index -> ['user', {userId: 123}]
        @notFound -> ['index']
        @route 'user', {path: '/users/:userId', tag: 'pane-user'}, ->
          @index -> ['sets']
          @route 'sets', {path: '/sets', tag: 'pane-sets'}
          @route 'set', {path: '/sets/:setId', tag: 'pane-set'}
        @route 'group', {path: '/groups/:groupId', tag: 'pane-group'}, ->
          @index -> ['albums']
          @notFound -> ['index']
          @route 'albums', {path: '/albums', tag: 'pane-albums'}
          @route 'album', {path: '/albums/:albumId', tag: 'pane-album'}
          @route 'sets', {path: '/sets', tag: 'pane-sets'}
          @route 'set', {path: '/sets/:setId', tag: 'pane-set'}
        @route 'uploader', {path: '/uploader', tag: 'app-uploader'}, ->
          @index {tag: 'pane-upload-groups'}
          @route 'group', {path: '/groups/:groupId', tag: 'pane-upload-group'}, ->
            @index -> ['albums']
            @route 'albums', {path: '/albums', tag: 'pane-upload-albums'}
      router.start()

      assert.ok(router.hasRoute('index'))
      assert.ok(router.hasRoute('not_found'))
      assert.ok(router.hasRoute('user'))
      assert.ok(router.hasRoute('group'))
      assert.ok(router.hasRoute('user.index'))
      assert.ok(router.hasRoute('user.sets'))
      assert.ok(router.hasRoute('user.set'))
      assert.ok(router.hasRoute('group.index'))
      assert.ok(router.hasRoute('group.not_found'))
      assert.ok(router.hasRoute('group.albums'))
      assert.ok(router.hasRoute('group.album'))
      assert.ok(router.hasRoute('group.sets'))
      assert.ok(router.hasRoute('group.set'))
      assert.ok(router.hasRoute('uploader'))
      assert.ok(router.hasRoute('uploader.index'))

      done()

    it 'should parse url properly', (done) ->
      handlers = router.recognizer.recognize('/groups/12?sort=date')
      assert.ok(handlers.length is 2)
      assert.deepEqual(handlers.queryParams, {sort: 'date'})
      done()

    it 'should generate url properly with defaults', (done) ->
      assert.ok(router.toURL('group', {groupId: 12}) is '/groups/12/albums')
      done()

    it 'should generate url properly with query', (done) ->
      assert.ok(router.toURL('group.album', {groupId: 12, albumId: 10}, {page: 2}) is '/groups/12/albums/10?page=2')
      done()

  describe 'Handle transitions by name', ->
    it 'should navigate to specific album in group', (done) ->
      success = router.transitionTo('group.album', {groupId: 12, albumId: 10})
      assert.ok(success)
      assert.equal(router.location.path, '/groups/12/albums/10')
      done()

    it 'should navigate to index pane for same group', (done) ->
      success = router.transitionTo('group')
      assert.ok(success)
      assert.equal(router.location.path, '/groups/12/albums')
      done()

    it 'should remain unchanged when explicitly navigating to same pane (albums)', (done) ->
      success = router.transitionTo('group.albums', {groupId: 12})
      assert.ok(success)
      assert.equal(router.location.path, '/groups/12/albums')
      done()

    it 'should exit index group and group , and enter user, and specific set', (done) ->
      success = router.transitionTo('user.set', {userId: 1234, setId: 2})
      assert.ok(success)
      assert.equal(router.location.path, '/users/1234/sets/2')
      done()

    it 'should update set', (done) ->
      success = router.transitionTo('user.set', {userId: 1234, setId: 5})
      assert.ok(success)
      assert.equal(router.location.path, '/users/1234/sets/5')
      done()

    it 'should navigate to different top level page', (done) ->
      success = router.transitionTo('uploader')
      assert.ok(success)
      assert.equal(router.location.path, '/uploader')
      done()

    it 'should navigate to different sub page', (done) ->
      success = router.transitionTo('uploader.group', {groupId: 4})
      assert.ok(success)
      assert.equal(router.location.path, '/uploader/groups/4/albums')
      done()

    it 'should detect query change', (done) ->
      success = router.transitionTo('uploader.group.albums', {groupId: 4}, {test: 1})
      assert.ok(success)
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=1')
      done()

    it 'should only update query', (done) ->
      success = router.transitionTo({test: 2})
      assert.ok(success)
      assert.equal(router.location.path, '/uploader/groups/4/albums?test=2')
      done()

    it 'should detect query change on remove', (done) ->
      success = router.transitionTo('uploader.group.albums')
      assert.ok(success)
      assert.equal(router.location.path, '/uploader/groups/4/albums')
      done()

  describe 'Going Back', ->
    it 'should go back', (done) ->
      success = router.goBack()
      assert.ok(success)
      assert.ok(router.location.path is '/uploader/groups/4/albums?test=2')
      done()

    it 'should go back again', (done) ->
      success = router.goBack()
      assert.ok(success)
      assert.ok(router.location.path is '/uploader/groups/4/albums?test=1')
      done()

  describe 'Handle url change', ->
    it 'should navigate on detected url change to root', (done) ->
      router.location.trigger '/'
      assert.ok(router.location.path is '/users/123/sets')
      done()

    it 'should navigate on detected url change', (done) ->
      router.location.trigger '/groups/12e1/sets/1'
      assert.ok(router.location.path is '/groups/12e1/sets/1')
      done()

    it 'should fallback to group notFound handler', (done) ->
      router.location.trigger '/groups/12e1/set/1'
      assert.ok(router.location.path is '/groups/12e1/albums')
      done()

    it 'should fallback to application notFound handler', (done) ->
      router.location.trigger '/group/12e1/sets/1'
      assert.ok(router.location.path is '/users/123/sets')
      done()
