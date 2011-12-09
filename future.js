// Future implementation | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// Javascript is single-threaded and nonblocking, and has no support for first-class re-entrant continuations. This, as node.js developers know, creates a lot of explicit continuations, and it
// quickly becomes unwieldy. One way around this is to use the future monad, which still requires callbacks but manages asynchronicity in a more structured way.

caterwaul.js_all()(function ($) {

  ($.future = construct_future) /-$.merge/ static_future_methods

  -where [static_future_methods = capture [array(xs) = transpose_array(xs),
                                           object(o) = transpose_object(o),
                                           k(x)      = callback_future()(x)],

          construct_future(xs)  = xs ? xs.constructor === Object ? $.future.object(xs) : xs.constructor === Array ? $.future.array(xs) :
                                       new Error('unrecognized argument for future constructor: #{xs}') /raise
                                     : callback_future(),

          callback_future()     = calls_its_send_method() -se- it / future_initials_for(it) /-$.merge/ future_operations_for(it)
                          -where [calls_its_send_method() = f -where [f() = f.send.apply(f, arguments)]],

// Distributivity across data structures.
// Futures support various kinds of operations with respect to lists and objects. This is the main reason I wrote this library: it eliminates the conceptual overhead of doing things like graph
// traversal over an asynchronous connection. For example:

// | load(x)            = caterwaul.future() -se- $.getJSON(x, it);
//   load_resources(xs) = caterwaul.future(xs *[load(x)] -seq);

// The array future transposes an array from the present into the future. That is, if F() is a future, it transforms [F(x1), F(x2), ..., F(xn)] into F([x1, x2, ..., xn]). This behavior is
// governed by the type of the argument to the future() constructor. Another possibility is to pass an object:

// | load_resources(o) = caterwaul.future(o %v*value[load(value)] -seq);

// Mathematically, this construct takes {k1: F(v1), k2: F(v2), ...} and returns F({k1: v1, k2: v2, ...}).

          componentwise(init, each)(xs) = result -se- each(xs, v /~push/ receive(k) -given [k, v])
                                                 -where [result         = caterwaul.future(),
                                                         received       = init(),
                                                         queue          = {},

                                                         enqueue(k, v)  = (queue[k] || (queue[k] = [])).push(v),
                                                         replay_queue() = queue /pairs *![receive(x[0])(x[1].shift()) -when- x[1].length] -seq,

                                                         expected_count = each(xs, ++count -delay) -re- count -where [count = 0],
                                                         received_count = 0,
                                                         receive(k)(v)  = received.hasOwnProperty(k) ?
                                                                            enqueue(k, v) :
                                                                            (received[k] = v) -re- result(received) /se   [received = init(), received_count = 0, replay_queue()]
                                                                                                                    /when [++received_count === expected_count]],
          transpose_array               = componentwise("[]".qf, given [xs, f] in xs *![f(xi, x)] -seq),
          transpose_object              = componentwise("{}".qf, given [o,  f] in o /pairs *![f(x[0], x[1])] -seq),

// Operations on futures.
// Futures support a standard set of operations:

// | var f = caterwaul.future();
//   $.getJSON('/some/url', f);
//   f.push(given.result in alert(result));

// | var g = f.map(given.result in result.foo);
//   g.push(given.foo in alert(foo));

// Unlike most futures, Caterwaul futures are variadic. This means that you can deliver multiple arguments through a future. For instance:

// | var f = caterwaul.future();
//   setTimeout(delay in f('foo', 'bar'), 100);
//   f.push(alert(x + y) -given [x, y]);           // Alerts 'foobar'

// Mapping a variadic future is simple: you just invoke this() instead of returning a value. Note that you can't invoke this() asynchronously; the return value will be used if this() isn't
// invoked within the current invocation frame.

// | var trigger = caterwaul.future();
//   var mapped  = trigger.map(given [x, y] in this(x, y, 'another'));
//   mapped.push(given [x, y, z] in alert(x + y + z));
//   trigger('hi', 'there');               // Alerts 'hithereanother'

          // call_vc = call with variadic continuation. Used to call a function with some arguments, but where 'this' is bound to a function that takes multiple arguments and forwards them
          // through the future chain. This avoids Javascript's unary continuation asymmetry (i.e, expressions return only one value but continuations take potentially many).
          call_vc(f, xs)                = f.apply(continuation, xs) -re    [continuation_result || [it]]
                                                                    -where [continuation_result          = null,
                                                                            continuation(xs = arguments) = continuation_result = Array.prototype.slice.call(xs)],
          future_initials_for(future)   = {listeners: [], decided: null},
          future_operations_for(future) = wcapture [send(xs = arguments) = future -se [it.decided = xs, future.listeners *![future /-x.apply/ xs] -seq],

                                                    push(f)              = future            -se- future.listeners /~push/ f
                                                                                             -se- future /-f.apply/ future.decided /when [future.decided],

                                                    map(f)               = callback_future() -se- push("it /-it.apply/ call_vc(f, arguments)".qf),
                                                    flat_map(f)          = callback_future() -se- map(f /~push/ "future /~push/ it".qf),

// Use as signals.
// Unlike most implementations of futures, these futures can be reused after they are decided. This means that a future can emit multiple values at different points in time, making it useful as a
// signal. Container-mapped futures do more or less the right thing with multiple invocations: It resets its state and starts waiting for the second round of entries. Any repeat entries it
// received in the meantime will be used for future invocations.

// Signals have a number of applications beyond futures. For instance, you can do things like folding their values across time and producing a new signal from this fold. One application of this
// is a time-series graph of events; if the data source reports totals and you want to see differences, then you want to scan across the original signal, folding each pair under subtraction.

// There are two ways to fold a signal. One is to use the values from the original exclusively, and the other way is to fold into an accumulated value that is tracked with the new signal. I'll
// illustrate the difference on two arrays, each of which can be interpreted as the series of values that are generated by a signal:

// | [1, 2, 3, 4, 5].scan(1)                               -> [[1, 2], [2, 3], [3, 4], [4, 5]]
//   [1, 2, 3, 4, 5].fold(given [x, y] in x + y, 0)        -> [0+1 = 1, 1+2 = 3, 3+3 = 6, 6+4 = 10, 10+5 = 15]

                                                    scan(size)           = result -se- observe /!push -where [xs             = [],
                                                                                                              result         = callback_future() -se [it.queue() = xs],
                                                                                                              observe(x)     = xs /~push/ x -se- check_window(),
                                                                                                              check_window() = xs.shift() -se- result(+xs -seq) -when [elements.length > size]],

                                                    fold(f, initial)     = result -se- observe /!push -where [result     = callback_future() -se [it.state() = initial],
                                                                                                              observe(x) = result(initial = f(initial, x))]]]})(caterwaul);

// Generated by SDoc 
