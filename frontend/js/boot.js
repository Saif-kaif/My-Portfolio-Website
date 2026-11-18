/*
 * Runs synchronously in <head> before first paint.
 * Marks JS as available (enables reveal animations) and installs a failsafe:
 * if the main module never starts, content is shown without animations.
 */
(function () {
  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  setTimeout(function () {
    if (root.getAttribute('data-ready') !== 'true') root.classList.remove('js');
  }, 4000);
})();
