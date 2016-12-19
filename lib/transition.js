var Transition,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

module.exports = Transition = (function() {
  function Transition(router, state) {
    this.router = router;
    this.state = state;
    this.execute = bind(this.execute, this);
    this.abort = bind(this.abort, this);
    this.is_aborted = false;
    this.is_active = false;
    this.current_stores = [];
  }

  Transition.prototype.abort = function() {
    if (this.is_aborted) {
      return;
    }
    this.is_aborted = true;
    this.is_active = false;
    this.router.location.set(this.router.get('state').url);
    return this.router.set({
      active_transition: null
    });
  };

  Transition.prototype.execute = function(callback) {
    this.is_active = true;
    return callback();
  };

  return Transition;

})();
