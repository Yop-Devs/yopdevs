(function () {
  var e = console.error
  var w = console.warn
  console.error = function () {
    var a = arguments[0]
    if (typeof a === 'string' && a.indexOf('_cf_bm') !== -1) return
    e.apply(console, arguments)
  }
  console.warn = function () {
    var a = arguments[0]
    if (
      typeof a === 'string' &&
      (a.indexOf('pré-carregado') !== -1 || a.indexOf('preload') !== -1) &&
      (a.indexOf('não foi usado') !== -1 || a.indexOf('was not used') !== -1)
    ) {
      return
    }
    w.apply(console, arguments)
  }
})()
